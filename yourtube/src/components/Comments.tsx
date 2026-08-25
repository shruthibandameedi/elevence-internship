import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import {
  ThumbsUp,
  ThumbsDown,
  Flag,
  Languages,
  MapPin,
  Shield,
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  X,
  ChevronDown,
  Globe,
  Sliders,
  RotateCcw,
} from "lucide-react";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  userAvatar?: string;
  locationDisplay?: string;
  likes?: string[];
  dislikes?: string[];
  reports?: any[];
  isReported?: boolean;
  moderationStatus?: "normal" | "flagged" | "under_review" | "resolved";
  commentedon: string;
}

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "te", name: "Telugu (తెలుగు)" },
  { code: "hi", name: "Hindi (हिंदी)" },
  { code: "ta", name: "Tamil (தமிழ்)" },
  { code: "kn", name: "Kannada (ಕನ್ನಡ)" },
  { code: "ml", name: "Malayalam (മലയാളം)" },
  { code: "mr", name: "Marathi (मराठी)" },
];

const REPORT_REASONS = [
  "Spam or unwanted commercial content",
  "Abusive or offensive language",
  "Harassment or cyberbullying",
  "Misleading or false information",
  "Other inappropriate content",
];

const Comments = ({ videoId }: { videoId?: string | string[] }) => {
  const cleanVideoId = Array.isArray(videoId) ? videoId[0] : videoId || "";
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(true);

  // Error & Toast Messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Translation state per comment
  const [translations, setTranslations] = useState<{
    [commentId: string]: {
      text: string;
      targetLang: string;
      targetLangName: string;
      loading?: boolean;
      active?: boolean;
    };
  }>({});

  // Active translation dropdown per comment
  const [openLangSelectId, setOpenLangSelectId] = useState<string | null>(null);

  // Report Modal state
  const [reportingComment, setReportingComment] = useState<Comment | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Comment Location Privacy Settings State
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const { user, setUser } = useUser();
  const [showLocation, setShowLocation] = useState(user?.showLocationOnComments || false);
  const [locationCity, setLocationCity] = useState(
    user?.commentLocationCity || user?.lastLoginCity || "Hyderabad"
  );
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  useEffect(() => {
    if (user) {
      setShowLocation(user.showLocationOnComments || false);
      setLocationCity(user.commentLocationCity || user.lastLoginCity || "Hyderabad");
    }
  }, [user]);

  useEffect(() => {
    if (cleanVideoId) {
      loadComments();
    }
  }, [cleanVideoId]);

  const loadComments = async () => {
    if (!cleanVideoId) return;
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/comment/${cleanVideoId}`);
      setComments(res.data);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleToggleLocationPrivacy = async (enabled: boolean, city: string) => {
    if (!user) return;
    setIsSavingPrivacy(true);
    try {
      const res = await axiosInstance.patch(`/user/update/${user._id}`, {
        showLocationOnComments: enabled,
        commentLocationCity: city,
      });
      if (res.data) {
        setUser({
          ...user,
          showLocationOnComments: enabled,
          commentLocationCity: city,
        });
        setSuccessMessage(
          enabled
            ? `Comment location privacy updated: "${city}" will be shown on new comments.`
            : "Comment location privacy updated: Location hidden on comments."
        );
      }
    } catch (err: any) {
      console.error("Error updating location privacy:", err);
      setErrorMessage("Failed to update comment privacy settings.");
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;
    clearMessages();
    setIsSubmitting(true);

    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: cleanVideoId,
        userid: user._id,
        commentbody: newComment.trim(),
        usercommented: user.name || "Anonymous",
        userAvatar: user.image || "",
      });

      if (res.data.comment) {
        const createdData = res.data.data;
        const newCommentObj: Comment = {
          _id: createdData?._id || Date.now().toString(),
          videoid: cleanVideoId,
          userid: user._id,
          commentbody: newComment.trim(),
          usercommented: user.name || "Anonymous",
          userAvatar: user.image || "",
          locationDisplay: createdData?.locationDisplay || (showLocation ? locationCity : ""),
          likes: [],
          dislikes: [],
          reports: [],
          isReported: false,
          moderationStatus: "normal",
          commentedon: createdData?.commentedon || new Date().toISOString(),
        };
        setComments([newCommentObj, ...comments]);
        setNewComment("");
        setSuccessMessage("Comment published successfully!");
      }
    } catch (error: any) {
      console.error("Error posting comment:", error);
      const msg = error.response?.data?.message || "Failed to post comment. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
    clearMessages();
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    clearMessages();
    try {
      const res = await axiosInstance.post(`/comment/editcomment/${editingCommentId}`, {
        commentbody: editText.trim(),
      });
      if (res.data) {
        setComments((prev) =>
          prev.map((c) => (c._id === editingCommentId ? { ...c, commentbody: editText.trim() } : c))
        );
        setEditingCommentId(null);
        setEditText("");
        setSuccessMessage("Comment updated successfully!");
      }
    } catch (error: any) {
      console.error("Error updating comment:", error);
      const msg = error.response?.data?.message || "Failed to update comment.";
      setErrorMessage(msg);
    }
  };

  const handleDelete = async (id: string) => {
    clearMessages();
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
        setSuccessMessage("Comment deleted.");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      setErrorMessage("Failed to delete comment.");
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) {
      setErrorMessage("Please sign in to like comments.");
      return;
    }
    clearMessages();

    // Optimistic UI update
    setComments((prev) =>
      prev.map((c) => {
        if (c._id !== commentId) return c;
        const currentLikes = c.likes || [];
        const currentDislikes = c.dislikes || [];
        const userIdStr = String(user._id);
        const hasLiked = currentLikes.includes(userIdStr);

        let newLikes = [...currentLikes];
        let newDislikes = [...currentDislikes];

        if (hasLiked) {
          newLikes = newLikes.filter((id) => id !== userIdStr);
        } else {
          newLikes.push(userIdStr);
          newDislikes = newDislikes.filter((id) => id !== userIdStr);
        }
        return { ...c, likes: newLikes, dislikes: newDislikes };
      })
    );

    try {
      await axiosInstance.post(`/comment/like/${commentId}`, { userid: user._id });
    } catch (error) {
      console.error("Like error:", error);
      loadComments();
    }
  };

  const handleDislike = async (commentId: string) => {
    if (!user) {
      setErrorMessage("Please sign in to dislike comments.");
      return;
    }
    clearMessages();

    // Optimistic UI update
    setComments((prev) =>
      prev.map((c) => {
        if (c._id !== commentId) return c;
        const currentLikes = c.likes || [];
        const currentDislikes = c.dislikes || [];
        const userIdStr = String(user._id);
        const hasDisliked = currentDislikes.includes(userIdStr);

        let newLikes = [...currentLikes];
        let newDislikes = [...currentDislikes];

        if (hasDisliked) {
          newDislikes = newDislikes.filter((id) => id !== userIdStr);
        } else {
          newDislikes.push(userIdStr);
          newLikes = newLikes.filter((id) => id !== userIdStr);
        }
        return { ...c, likes: newLikes, dislikes: newDislikes };
      })
    );

    try {
      await axiosInstance.post(`/comment/dislike/${commentId}`, { userid: user._id });
    } catch (error) {
      console.error("Dislike error:", error);
      loadComments();
    }
  };

  const handleTranslate = async (commentId: string, text: string, targetLangCode: string) => {
    setOpenLangSelectId(null);
    clearMessages();

    const targetLangObj = LANGUAGES.find((l) => l.code === targetLangCode) || LANGUAGES[0];

    setTranslations((prev) => ({
      ...prev,
      [commentId]: {
        text: "",
        targetLang: targetLangCode,
        targetLangName: targetLangObj.name,
        loading: true,
        active: true,
      },
    }));

    try {
      const res = await axiosInstance.post("/comment/translate", {
        text,
        targetLang: targetLangCode,
      });

      if (res.data && res.data.translatedText) {
        setTranslations((prev) => ({
          ...prev,
          [commentId]: {
            text: res.data.translatedText,
            targetLang: targetLangCode,
            targetLangName: res.data.targetLangName || targetLangObj.name,
            loading: false,
            active: true,
          },
        }));
      }
    } catch (error) {
      console.error("Translation error:", error);
      setTranslations((prev) => ({
        ...prev,
        [commentId]: {
          text: `[${targetLangObj.name} Translation]: ${text}`,
          targetLang: targetLangCode,
          targetLangName: targetLangObj.name,
          loading: false,
          active: true,
        },
      }));
    }
  };

  const toggleHideTranslation = (commentId: string) => {
    setTranslations((prev) => {
      const existing = prev[commentId];
      if (!existing) return prev;
      return {
        ...prev,
        [commentId]: {
          ...existing,
          active: !existing.active,
        },
      };
    });
  };

  const handleOpenReportModal = (comment: Comment) => {
    if (!user) {
      setErrorMessage("Please sign in to report comments.");
      return;
    }
    setReportingComment(comment);
    setSelectedReason(REPORT_REASONS[0]);
    clearMessages();
  };

  const handleSubmitReport = async () => {
    if (!user || !reportingComment) return;
    setIsSubmittingReport(true);
    clearMessages();

    try {
      const res = await axiosInstance.post(`/comment/report/${reportingComment._id}`, {
        userid: user._id,
        reason: selectedReason,
      });

      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === reportingComment._id
              ? { ...c, isReported: true, moderationStatus: "flagged" }
              : c
          )
        );
        setSuccessMessage("Comment reported and flagged for review.");
        setReportingComment(null);
      }
    } catch (error: any) {
      console.error("Report error:", error);
      const msg = error.response?.data?.message || "Failed to submit report.";
      setErrorMessage(msg);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const getRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "recently";
      return formatDistanceToNow(d, { addSuffix: true });
    } catch (e) {
      return "recently";
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-gray-500 animate-pulse">Loading comments...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Privacy Settings Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <span>{comments.length} Comments</span>
        </h2>

        {user && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPrivacySettings(!showPrivacySettings)}
            className="flex items-center gap-2 text-xs border-dashed"
          >
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Comment Privacy</span>
            <Sliders className="w-3 h-3 text-gray-400" />
          </Button>
        )}
      </div>

      {/* Expandable Privacy Settings Panel */}
      {showPrivacySettings && user && (
        <div className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" /> Optional Location Display Settings
            </span>
            <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
              Default: OFF (Privacy-Safe)
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            For privacy reasons, exact city name and GPS are hidden by default. Enable this setting if you wish to display your city tag (e.g. <strong>Hyderabad</strong>) on your new comments.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={showLocation}
                onChange={(e) => {
                  const val = e.target.checked;
                  setShowLocation(val);
                  handleToggleLocationPrivacy(val, locationCity);
                }}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Show my city on comments</span>
            </label>

            {showLocation && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">City label:</span>
                <input
                  type="text"
                  value={locationCity}
                  onChange={(e) => setLocationCity(e.target.value)}
                  onBlur={() => handleToggleLocationPrivacy(showLocation, locationCity)}
                  placeholder="e.g. Hyderabad"
                  className="px-2 py-1 text-xs border rounded bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}

            {isSavingPrivacy && (
              <span className="text-xs text-blue-500 animate-pulse">Saving...</span>
            )}
          </div>
        </div>
      )}

      {/* Global Alert Banners for Messages */}
      {errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)}>
            <X className="w-4 h-4 text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-md text-green-700 dark:text-green-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-green-500" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="w-4 h-4 text-green-400 hover:text-green-600" />
          </button>
        </div>
      )}

      {/* Comment Input Box */}
      {user ? (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment in any language (English, Telugu, Hindi, etc.)..."
              value={newComment}
              onChange={(e: any) => {
                setNewComment(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0 text-sm"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-gray-500 flex items-center gap-1">
                <Globe className="w-3 h-3 text-gray-400" /> Supports Unicode & Multi-Language
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNewComment("");
                    clearMessages();
                  }}
                  disabled={!newComment.trim()}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                >
                  {isSubmitting ? "Posting..." : "Comment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic bg-gray-50 dark:bg-zinc-900 p-3 rounded text-center">
          Sign in to post comments, translate, like, dislike, or report comments.
        </p>
      )}

      {/* Comments List */}
      <div className="space-y-6 pt-2">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => {
            const currentUserId = user?._id ? String(user._id) : "";
            const likesList = comment.likes || [];
            const dislikesList = comment.dislikes || [];
            const hasLiked = currentUserId ? likesList.includes(currentUserId) : false;
            const hasDisliked = currentUserId ? dislikesList.includes(currentUserId) : false;
            const translationState = translations[comment._id];

            return (
              <div key={comment._id} className="flex gap-4 group">
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={comment.userAvatar || "/placeholder.svg?height=40&width=40"} />
                  <AvatarFallback>{comment.usercommented?.[0] || "U"}</AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1.5 min-w-0">
                  {/* User Details & Timestamp & Location Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {comment.usercommented}
                    </span>

                    <span className="text-xs text-gray-500">
                      {getRelativeTime(comment.commentedon)}
                    </span>

                    {/* Privacy-Safe Location Tag if enabled */}
                    {comment.locationDisplay && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <MapPin className="w-3 h-3 text-blue-500" />
                        <span>{comment.locationDisplay}</span>
                      </span>
                    )}

                    {/* Flagged Review Tag */}
                    {(comment.isReported || comment.moderationStatus === "flagged") && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        <ShieldAlert className="w-3 h-3 text-amber-600" />
                        <span>Flagged for review</span>
                      </span>
                    )}
                  </div>

                  {/* Comment Body / Edit View */}
                  {editingCommentId === comment._id ? (
                    <div className="space-y-2 pt-1">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="text-sm min-h-[60px]"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" onClick={handleUpdateComment} disabled={!editText.trim()}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Original Comment Text */}
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                        {comment.commentbody}
                      </p>

                      {/* Translated Text Card if active */}
                      {translationState && translationState.active && (
                        <div className="p-3 bg-blue-50/70 dark:bg-zinc-900 border-l-4 border-blue-500 rounded-r-md text-sm space-y-1">
                          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Languages className="w-3.5 h-3.5" />
                              Translated to {translationState.targetLangName}
                            </span>
                            <button
                              onClick={() => toggleHideTranslation(comment._id)}
                              className="text-[11px] underline text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" /> Show Original
                            </button>
                          </div>

                          {translationState.loading ? (
                            <p className="text-xs text-gray-500 animate-pulse italic">
                              Translating comment...
                            </p>
                          ) : (
                            <p className="text-sm font-normal text-gray-900 dark:text-gray-100">
                              {translationState.text}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Actions Bar: Like, Dislike, Translate, Report, Edit, Delete */}
                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-gray-600 dark:text-gray-400">
                        {/* Like Button */}
                        <button
                          onClick={() => handleLike(comment._id)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors ${
                            hasLiked ? "text-blue-600 dark:text-blue-400 font-semibold" : ""
                          }`}
                          title="Like comment"
                        >
                          <ThumbsUp className={`w-4 h-4 ${hasLiked ? "fill-blue-600 dark:fill-blue-400" : ""}`} />
                          <span>{likesList.length > 0 ? likesList.length : ""}</span>
                        </button>

                        {/* Dislike Button */}
                        <button
                          onClick={() => handleDislike(comment._id)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors ${
                            hasDisliked ? "text-red-600 dark:text-red-400 font-semibold" : ""
                          }`}
                          title="Dislike comment"
                        >
                          <ThumbsDown className={`w-4 h-4 ${hasDisliked ? "fill-red-600 dark:fill-red-400" : ""}`} />
                          <span>{dislikesList.length > 0 ? dislikesList.length : ""}</span>
                        </button>

                        {/* Translate Dropdown Button */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenLangSelectId(openLangSelectId === comment._id ? null : comment._id)
                            }
                            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-blue-600 dark:text-blue-400 font-medium transition-colors"
                          >
                            <Languages className="w-4 h-4" />
                            <span>Translate</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          {openLangSelectId === comment._id && (
                            <div className="absolute left-0 top-full mt-1 z-20 w-44 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md shadow-lg py-1">
                              <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-zinc-800">
                                Select Language
                              </div>
                              {LANGUAGES.map((lang) => (
                                <button
                                  key={lang.code}
                                  onClick={() => handleTranslate(comment._id, comment.commentbody, lang.code)}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-zinc-800 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-between"
                                >
                                  <span>{lang.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Report Button */}
                        <button
                          onClick={() => handleOpenReportModal(comment)}
                          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-red-600 transition-colors"
                          title="Report comment"
                        >
                          <Flag className="w-3.5 h-3.5" />
                          <span>Report</span>
                        </button>

                        {/* User Edit / Delete if author */}
                        {comment.userid === user?._id && (
                          <>
                            <button
                              onClick={() => handleEdit(comment)}
                              className="hover:underline hover:text-gray-900 dark:hover:text-gray-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(comment._id)}
                              className="hover:underline hover:text-red-600"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Report Modal */}
      {reportingComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-base flex items-center gap-2 text-red-600">
                <Flag className="w-4 h-4" /> Report Comment
              </h3>
              <button onClick={() => setReportingComment(null)}>
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              Select a reason for reporting this comment by <strong>{reportingComment.usercommented}</strong>.
            </p>

            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason}
                  className="flex items-center gap-2 p-2 border rounded-md hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer text-xs"
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReportingComment(null)}
                disabled={isSubmittingReport}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSubmitReport}
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Comments;
