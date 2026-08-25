import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import { findUserSafely } from "./auth.js";

// In-memory store for comments if MongoDB is offline or for fallback persistence
const inMemoryComments = new Map();
// In-memory rate limiting map: userid -> array of timestamps
const userCommentTimestamps = new Map();

// 1. Abusive word moderation list
const ABUSIVE_WORDS = [
  "abuse", "badword", "idiot", "fool", "stupid", "dumb", "bastard", "asshole",
  "bitch", "shit", "fuck", "bloody", "trash", "hate", "scam", "fraud", "kill",
  "పనికిరాని", "దొంగ", "చెత్త", "పిచ్చి", "కుక్క"
];

const containsAbusiveWords = (text) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  return ABUSIVE_WORDS.some((word) => lower.includes(word));
};

// 2. Excessive repeated special characters (4+ in a row, e.g. !!!, ???, @@@)
const hasExcessiveSpecialChars = (text) => {
  if (!text) return false;
  const regex = /([!@#$%^&*()_+=\-[\]{};':"\\|,.<>/?~`–—])\1{3,}/u;
  return regex.test(text);
};

// 3. Spam & URL check
const isSpamComment = async (userid, videoid, commentbody) => {
  // Check URL count
  const urlMatches = commentbody.match(/https?:\/\/|www\./gi);
  if (urlMatches && urlMatches.length > 2) {
    return { spam: true, message: "Excessive promotional links detected. Please avoid posting spam links." };
  }

  // Rate limiting: max 5 comments per 60 seconds
  const now = Date.now();
  const userTimestamps = userCommentTimestamps.get(String(userid)) || [];
  const recentTimestamps = userTimestamps.filter((ts) => now - ts < 60000);
  if (recentTimestamps.length >= 5) {
    return { spam: true, message: "You are commenting too fast. Please wait a moment before trying again." };
  }

  // Duplicate comment check: check if same comment posted by user within 3 minutes
  if (mongoose.connection.readyState === 1) {
    try {
      const recentDup = await comment.findOne({
        userid,
        commentbody: commentbody.trim(),
        createdAt: { $gte: new Date(now - 180000) },
      });
      if (recentDup) {
        return { spam: true, message: "Spam detected. Please avoid posting duplicate comments." };
      }
    } catch (e) {
      console.warn("DB duplicate check note:", e.message);
    }
  }

  // Also check in-memory comments
  for (const [, c] of inMemoryComments.entries()) {
    if (
      String(c.userid) === String(userid) &&
      c.commentbody?.trim() === commentbody.trim() &&
      now - new Date(c.commentedon || c.createdAt).getTime() < 180000
    ) {
      return { spam: true, message: "Spam detected. Please avoid posting duplicate comments." };
    }
  }

  return { spam: false };
};

// Record comment timestamp for rate limiting
const recordCommentTime = (userid) => {
  const now = Date.now();
  const timestamps = userCommentTimestamps.get(String(userid)) || [];
  const recent = timestamps.filter((ts) => now - ts < 60000);
  recent.push(now);
  userCommentTimestamps.set(String(userid), recent);
};

export const postcomment = async (req, res) => {
  const { videoid, userid, commentbody, usercommented, userAvatar } = req.body;

  if (!commentbody || !commentbody.trim()) {
    return res.status(400).json({ message: "Comment cannot be empty." });
  }

  // Abusive word check
  if (containsAbusiveWords(commentbody)) {
    return res.status(400).json({ message: "Your comment contains inappropriate language. Please edit it and try again." });
  }

  // Excessive special character check
  if (hasExcessiveSpecialChars(commentbody)) {
    return res.status(400).json({ message: "Please avoid excessive repeated special characters." });
  }

  // Spam & Rate limiting check
  const spamCheck = await isSpamComment(userid, videoid, commentbody);
  if (spamCheck.spam) {
    return res.status(400).json({ message: spamCheck.message });
  }

  // Check user privacy settings for location display
  let locationDisplay = "";
  try {
    const user = await findUserSafely({ _id: userid });
    if (user && user.showLocationOnComments) {
      locationDisplay = user.commentLocationCity || user.lastLoginCity || "Hyderabad";
    }
  } catch (err) {
    console.warn("Location privacy check note:", err.message);
  }

  recordCommentTime(userid);

  const newCommentObj = {
    videoid,
    userid,
    commentbody: commentbody.trim(),
    usercommented: usercommented || "Anonymous",
    userAvatar: userAvatar || "",
    locationDisplay,
    likes: [],
    dislikes: [],
    reports: [],
    isReported: false,
    moderationStatus: "normal",
    commentedon: new Date(),
  };

  try {
    if (mongoose.connection.readyState === 1) {
      const createdComment = new comment(newCommentObj);
      await createdComment.save();
      inMemoryComments.set(String(createdComment._id), createdComment.toObject());
      return res.status(200).json({ comment: true, data: createdComment });
    } else {
      const mockId = "mem_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      const memComment = { _id: mockId, ...newCommentObj };
      inMemoryComments.set(mockId, memComment);
      return res.status(200).json({ comment: true, data: memComment });
    }
  } catch (error) {
    console.error("Post comment error:", error);
    return res.status(500).json({ message: "Something went wrong posting comment." });
  }
};

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    let dbComments = [];
    if (mongoose.connection.readyState === 1) {
      dbComments = await comment.find({ videoid: videoid }).sort({ commentedon: -1 });
    }

    const memList = Array.from(inMemoryComments.values()).filter(
      (c) => String(c.videoid) === String(videoid)
    );

    // Merge DB & In-memory comments without duplicates
    const commentMap = new Map();
    dbComments.forEach((c) => commentMap.set(String(c._id), c.toObject ? c.toObject() : c));
    memList.forEach((c) => commentMap.set(String(c._id), c));

    const result = Array.from(commentMap.values()).sort(
      (a, b) => new Date(b.commentedon || b.createdAt).getTime() - new Date(a.commentedon || a.createdAt).getTime()
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get all comments error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  try {
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(_id)) {
      await comment.findByIdAndDelete(_id);
    }
    inMemoryComments.delete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error("Delete comment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;

  if (containsAbusiveWords(commentbody)) {
    return res.status(400).json({ message: "Your comment contains inappropriate language. Please edit it and try again." });
  }
  if (hasExcessiveSpecialChars(commentbody)) {
    return res.status(400).json({ message: "Please avoid excessive repeated special characters." });
  }

  try {
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(_id)) {
      const updatecomment = await comment.findByIdAndUpdate(
        _id,
        { $set: { commentbody: commentbody } },
        { new: true }
      );
      return res.status(200).json(updatecomment);
    }
    const mem = inMemoryComments.get(_id);
    if (mem) {
      mem.commentbody = commentbody;
      inMemoryComments.set(_id, mem);
      return res.status(200).json(mem);
    }
    return res.status(404).json({ message: "Comment not found" });
  } catch (error) {
    console.error("Edit comment error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const likecomment = async (req, res) => {
  const { id } = req.params;
  const { userid } = req.body;

  if (!userid) return res.status(400).json({ message: "User ID is required" });

  try {
    let targetComment = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      targetComment = await comment.findById(id);
    }
    if (!targetComment) {
      targetComment = inMemoryComments.get(id);
    }

    if (!targetComment) return res.status(404).json({ message: "Comment not found" });

    const likes = Array.isArray(targetComment.likes) ? targetComment.likes.map(String) : [];
    const dislikes = Array.isArray(targetComment.dislikes) ? targetComment.dislikes.map(String) : [];

    const userIdStr = String(userid);
    const hasLiked = likes.includes(userIdStr);

    let updatedLikes = [...likes];
    let updatedDislikes = [...dislikes];

    if (hasLiked) {
      // Toggle off like
      updatedLikes = updatedLikes.filter((uid) => uid !== userIdStr);
    } else {
      // Add like and remove dislike if present
      updatedLikes.push(userIdStr);
      updatedDislikes = updatedDislikes.filter((uid) => uid !== userIdStr);
    }

    if (mongoose.connection.readyState === 1 && typeof targetComment.save === "function") {
      targetComment.likes = updatedLikes;
      targetComment.dislikes = updatedDislikes;
      await targetComment.save();
    }

    const memObj = {
      ...(targetComment.toObject ? targetComment.toObject() : targetComment),
      likes: updatedLikes,
      dislikes: updatedDislikes,
    };
    inMemoryComments.set(String(id), memObj);

    return res.status(200).json({ success: true, likes: updatedLikes, dislikes: updatedDislikes });
  } catch (error) {
    console.error("Like comment error:", error);
    return res.status(500).json({ message: "Error liking comment" });
  }
};

export const dislikecomment = async (req, res) => {
  const { id } = req.params;
  const { userid } = req.body;

  if (!userid) return res.status(400).json({ message: "User ID is required" });

  try {
    let targetComment = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      targetComment = await comment.findById(id);
    }
    if (!targetComment) {
      targetComment = inMemoryComments.get(id);
    }

    if (!targetComment) return res.status(404).json({ message: "Comment not found" });

    const likes = Array.isArray(targetComment.likes) ? targetComment.likes.map(String) : [];
    const dislikes = Array.isArray(targetComment.dislikes) ? targetComment.dislikes.map(String) : [];

    const userIdStr = String(userid);
    const hasDisliked = dislikes.includes(userIdStr);

    let updatedLikes = [...likes];
    let updatedDislikes = [...dislikes];

    if (hasDisliked) {
      // Toggle off dislike
      updatedDislikes = updatedDislikes.filter((uid) => uid !== userIdStr);
    } else {
      // Add dislike and remove like if present
      updatedDislikes.push(userIdStr);
      updatedLikes = updatedLikes.filter((uid) => uid !== userIdStr);
    }

    // DISLIKES MUST NOT AUTO-DELETE COMMENTS!
    if (mongoose.connection.readyState === 1 && typeof targetComment.save === "function") {
      targetComment.likes = updatedLikes;
      targetComment.dislikes = updatedDislikes;
      await targetComment.save();
    }

    const memObj = {
      ...(targetComment.toObject ? targetComment.toObject() : targetComment),
      likes: updatedLikes,
      dislikes: updatedDislikes,
    };
    inMemoryComments.set(String(id), memObj);

    return res.status(200).json({ success: true, likes: updatedLikes, dislikes: updatedDislikes });
  } catch (error) {
    console.error("Dislike comment error:", error);
    return res.status(500).json({ message: "Error disliking comment" });
  }
};

export const reportcomment = async (req, res) => {
  const { id } = req.params;
  const { userid, reason } = req.body;

  if (!userid) return res.status(400).json({ message: "User ID is required to report a comment." });

  try {
    let targetComment = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
      targetComment = await comment.findById(id);
    }
    if (!targetComment) {
      targetComment = inMemoryComments.get(id);
    }

    if (!targetComment) return res.status(404).json({ message: "Comment not found" });

    const reports = Array.isArray(targetComment.reports) ? targetComment.reports : [];
    const userIdStr = String(userid);

    const alreadyReported = reports.some((r) => String(r.userId) === userIdStr);
    if (alreadyReported) {
      return res.status(400).json({ message: "You have already reported this comment." });
    }

    const newReport = {
      userId: userIdStr,
      reason: reason || "Inappropriate content",
      reportedAt: new Date(),
    };

    const updatedReports = [...reports, newReport];

    // Flag for review without deleting!
    if (mongoose.connection.readyState === 1 && typeof targetComment.save === "function") {
      targetComment.reports = updatedReports;
      targetComment.isReported = true;
      targetComment.moderationStatus = "flagged";
      await targetComment.save();
    }

    const memObj = {
      ...(targetComment.toObject ? targetComment.toObject() : targetComment),
      reports: updatedReports,
      isReported: true,
      moderationStatus: "flagged",
    };
    inMemoryComments.set(String(id), memObj);

    return res.status(200).json({
      success: true,
      message: "Comment reported and flagged for review.",
      isReported: true,
      moderationStatus: "flagged",
    });
  } catch (error) {
    console.error("Report comment error:", error);
    return res.status(500).json({ message: "Error reporting comment" });
  }
};

const LANG_MAP = {
  en: "English",
  te: "Telugu",
  hi: "Hindi",
  ta: "Tamil",
  kn: "Kannada",
  ml: "Malayalam",
  mr: "Marathi",
};

export const translatecomment = async (req, res) => {
  const { text, targetLang } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Text is required for translation" });
  }

  const langCode = targetLang || "en";
  const langName = LANG_MAP[langCode] || "English";

  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${langCode}`
    );
    const data = await response.json();

    if (data && data.responseData && data.responseData.translatedText) {
      const cleanTranslated = data.responseData.translatedText;
      return res.status(200).json({
        success: true,
        originalText: text,
        translatedText: cleanTranslated,
        targetLang: langCode,
        targetLangName: langName,
      });
    }
  } catch (apiError) {
    console.warn("External translation API unavailable, using dictionary fallback:", apiError.message);
  }

  const sampleTranslations = {
    "Nice video!": {
      te: "చాలా మంచి వీడియో!",
      hi: "बहुत अच्छा वीडियो!",
      ta: "மிகவும் நல்ல வீடியோ!",
      kn: "ಉತ್ತಮ ವೀಡಿಯೊ!",
      ml: "മികച്ച വീഡിയോ!",
      mr: "छान व्हिडिओ!",
    },
    "చాలా మంచి వీడియో!": {
      en: "Very good video!",
      hi: "बहुत अच्छा वीडियो!",
      ta: "மிகவும் நல்ல வீடியோ!",
    },
    "बहुत अच्छा वीडियो!": {
      en: "Very good video!",
      te: "చాలా మంచి వీడియో!",
      ta: "மிகவும் நல்ல வீடியோ!",
    },
  };

  const directMatch = sampleTranslations[text.trim()]?.[langCode];
  const fallbackText = directMatch || `[${langName} Translation]: ${text}`;

  return res.status(200).json({
    success: true,
    originalText: text,
    translatedText: fallbackText,
    targetLang: langCode,
    targetLangName: langName,
  });
};
