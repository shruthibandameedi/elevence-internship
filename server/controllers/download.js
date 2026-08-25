import mongoose from "mongoose";
import download from "../Modals/download.js";
import users from "../Modals/Auth.js";
import video from "../Modals/video.js";
import path from "path";
import fs from "fs";

import { PLAN_DOWNLOAD_LIMITS as PLAN_LIMITS } from "../config/subscriptionConfig.js";

function getDailyRange() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return { startOfDay, endOfDay, dateStr, now };
}

// Request and record a video download
export const requestDownload = async (req, res) => {
  const { videoId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated. Please log in to download videos." });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video ID" });
  }

  try {
    // 1. Fetch user from DB (Backend is source of truth for plan)
    const dbUser = await users.findById(userId);
    if (!dbUser) {
      return res.status(404).json({ message: "User profile not found in database" });
    }

    const actualPlan = (dbUser.plan || "free").toLowerCase();
    const allowedLimit = PLAN_LIMITS[actualPlan] || 1;

    // 2. Fetch video from DB
    const targetVideo = await video.findById(videoId);
    if (!targetVideo) {
      return res.status(404).json({ message: "Video not found" });
    }

    // 3. Calculate today's downloads for this user
    const { startOfDay, endOfDay, dateStr, now } = getDailyRange();

    const todayCount = await download.countDocuments({
      userId: dbUser._id,
      $or: [
        { downloadDate: dateStr },
        { downloadTimestamp: { $gte: startOfDay, $lte: endOfDay } },
      ],
    });

    // 4. Check if limit is reached
    if (todayCount >= allowedLimit) {
      const limitMsg =
        actualPlan === "free"
          ? "You have reached your daily download limit. Free users can download 1 video per day."
          : `You have reached your daily download limit of ${allowedLimit} videos for your ${actualPlan.toUpperCase()} plan.`;

      return res.status(403).json({
        message: limitMsg,
        todayCount,
        limit: allowedLimit,
        plan: actualPlan,
        isLimitReached: true,
      });
    }

    // 5. Record successful download
    const newDownloadRecord = new download({
      userId: dbUser._id,
      userPlan: actualPlan,
      videoId: targetVideo._id,
      videoTitle: targetVideo.videotitle,
      videoDetails: {
        filename: targetVideo.filename || "",
        filepath: targetVideo.filepath || "",
        filetype: targetVideo.filetype || "video/mp4",
        filesize: targetVideo.filesize || "Unknown",
        videochanel: targetVideo.videochanel || "Unknown",
        uploader: targetVideo.uploader || "",
      },
      downloadDate: dateStr,
      downloadTimestamp: now,
    });

    await newDownloadRecord.save();

    const newTodayCount = todayCount + 1;

    return res.status(200).json({
      message: "Download authorized successfully!",
      download: newDownloadRecord,
      todayCount: newTodayCount,
      limit: allowedLimit,
      plan: actualPlan,
      downloadUrl: targetVideo.filepath,
      filename: targetVideo.filename || `${targetVideo.videotitle}.mp4`,
    });
  } catch (error) {
    console.error("Error in requestDownload:", error);
    return res.status(500).json({ message: "Server error processing download request" });
  }
};

// Get user's today download usage
export const getDownloadUsage = async (req, res) => {
  const { userId } = req.params;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const dbUser = await users.findById(userId);
    if (!dbUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const actualPlan = (dbUser.plan || "free").toLowerCase();
    const allowedLimit = PLAN_LIMITS[actualPlan] || 1;

    const { startOfDay, endOfDay, dateStr } = getDailyRange();

    const todayCount = await download.countDocuments({
      userId: dbUser._id,
      $or: [
        { downloadDate: dateStr },
        { downloadTimestamp: { $gte: startOfDay, $lte: endOfDay } },
      ],
    });

    return res.status(200).json({
      plan: actualPlan,
      todayCount,
      limit: allowedLimit,
      remaining: Math.max(0, allowedLimit - todayCount),
      isLimitReached: todayCount >= allowedLimit,
    });
  } catch (error) {
    console.error("Error in getDownloadUsage:", error);
    return res.status(500).json({ message: "Server error fetching download usage" });
  }
};

// Get download history for logged-in user only
export const getDownloadHistory = async (req, res) => {
  const { userId } = req.params;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const history = await download
      .find({ userId })
      .populate("videoId")
      .sort({ downloadTimestamp: -1 });

    return res.status(200).json(history);
  } catch (error) {
    console.error("Error in getDownloadHistory:", error);
    return res.status(500).json({ message: "Server error fetching download history" });
  }
};

// Update user plan (for testing premium features)
export const updateUserPlan = async (req, res) => {
  const { userId } = req.params;
  const { plan } = req.body;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  const validPlans = ["free", "bronze", "silver", "gold", "premium"];
  const newPlan = (plan || "free").toLowerCase();

  if (!validPlans.includes(newPlan)) {
    return res.status(400).json({ message: `Invalid plan. Must be one of: ${validPlans.join(", ")}` });
  }

  try {
    const updatedUser = await users.findByIdAndUpdate(
      userId,
      { $set: { plan: newPlan } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: `User plan updated to ${newPlan.toUpperCase()} successfully`,
      user: updatedUser,
      plan: newPlan,
      limit: PLAN_LIMITS[newPlan] || 1,
    });
  } catch (error) {
    console.error("Error in updateUserPlan:", error);
    return res.status(500).json({ message: "Server error updating plan" });
  }
};

// Stream/deliver direct video download file safely
export const downloadVideoFile = async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).send("Invalid video ID");
  }

  try {
    const targetVideo = await video.findById(videoId);
    if (!targetVideo) {
      return res.status(404).send("Video file not found");
    }

    const filepath = targetVideo.filepath;

    // If external URL (e.g. sample video URL from seed), redirect or pipe stream
    if (filepath.startsWith("http://") || filepath.startsWith("https://")) {
      return res.redirect(filepath);
    }

    // Local file path validation to prevent path traversal
    const resolvedPath = path.resolve(filepath);
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).send("File on server does not exist");
    }

    res.download(resolvedPath, targetVideo.filename || "video.mp4");
  } catch (error) {
    console.error("Error downloading file:", error);
    return res.status(500).send("Server error delivering video file");
  }
};
