import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
  Users,
  AlertCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";

const VideoInfo = ({ video }: any) => {
  const router = useRouter();
  const [likes, setlikes] = useState(video?.Like || 0);
  const [dislikes, setDislikes] = useState(video?.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);

  // Download state
  const [usage, setUsage] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleWatchParty = () => {
    const roomId = `wp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    router.push(`/watch-party/${roomId}?videoId=${video._id}`);
  };

  useEffect(() => {
    setlikes(video?.Like || 0);
    setDislikes(video?.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  // Fetch download usage whenever user or video changes
  const fetchDownloadUsage = async () => {
    if (!user?._id) return;
    try {
      const res = await axiosInstance.get(`/download/usage/${user._id}`);
      setUsage(res.data);
    } catch (error) {
      console.error("Error fetching download usage:", error);
    }
  };

  useEffect(() => {
    fetchDownloadUsage();
  }, [user]);

  useEffect(() => {
    const handleviews = async () => {
      if (!video?._id) return;
      if (user?._id) {
        try {
          return await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.warn("Error recording view history:", error);
        }
      } else {
        try {
          return await axiosInstance.post(`/history/views/${video?._id}`);
        } catch (error) {
          return console.warn("Error recording video view:", error);
        }
      }
    };
    handleviews();
  }, [user, video?._id]);

  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: any) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: any) => prev + 1);
          setIsLiked(true);
          if (isDisliked) {
            setDislikes((prev: any) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleWatchLater = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDislike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (!res.data.liked) {
        if (isDisliked) {
          setDislikes((prev: any) => prev - 1);
          setIsDisliked(false);
        } else {
          setDislikes((prev: any) => prev + 1);
          setIsDisliked(true);
          if (isLiked) {
            setlikes((prev: any) => prev - 1);
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Controlled Download Handler
  const handleDownload = async () => {
    setDownloadMsg(null);

    // 1. Check Authentication
    if (!user?._id) {
      setDownloadMsg({
        type: "error",
        text: "Please sign in to download videos.",
      });
      return;
    }

    // 2. Check cached daily limit before sending request if already known to be blocked
    if (usage && usage.isLimitReached) {
      const blockText =
        usage.plan === "free"
          ? "You have reached your daily download limit. Free users can download 1 video per day."
          : `You have reached your daily download limit of ${usage.limit} videos for your ${usage.plan.toUpperCase()} plan.`;
      setDownloadMsg({
        type: "error",
        text: blockText,
      });
      return;
    }

    try {
      setDownloading(true);

      // 3. Send Download request to backend (Backend evaluates user's actual DB plan & limits)
      const res = await axiosInstance.post(`/download/${video._id}`, {
        userId: user._id,
      });

      if (res.data && res.data.download) {
        // Update local usage state
        setUsage({
          plan: res.data.plan,
          todayCount: res.data.todayCount,
          limit: res.data.limit,
          remaining: Math.max(0, res.data.limit - res.data.todayCount),
          isLimitReached: res.data.todayCount >= res.data.limit,
        });

        setDownloadMsg({
          type: "success",
          text: `Download started! Used today: ${res.data.todayCount}/${res.data.limit}`,
        });

        // Trigger browser file download via direct server file download route
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
        const downloadUrl = `${backendUrl}/download/file/${video._id}`;
        
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute("download", res.data.filename || `${video.videotitle}.mp4`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error: any) {
      console.error("Download failed:", error);

      if (error.response && error.response.status === 403) {
        const errData = error.response.data;
        const msg =
          errData?.message ||
          "You have reached your daily download limit. Free users can download 1 video per day.";
        
        setDownloadMsg({
          type: "error",
          text: msg,
        });

        if (errData?.todayCount !== undefined && errData?.limit !== undefined) {
          setUsage({
            plan: errData.plan || usage?.plan || "free",
            todayCount: errData.todayCount,
            limit: errData.limit,
            remaining: 0,
            isLimitReached: true,
          });
        }
      } else {
        setDownloadMsg({
          type: "error",
          text: error.response?.data?.message || "Failed to download video. Please try again.",
        });
      }
    } finally {
      setDownloading(false);
    }
  };

  const isLimitReached = usage?.isLimitReached || false;
  const currentPlan = usage?.plan || "free";
  const todayCount = usage?.todayCount !== undefined ? usage.todayCount : 0;
  const limit = usage?.limit !== undefined ? usage.limit : (currentPlan === "free" ? 1 : 25);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{video.videochanel ? video.videochanel[0] : "C"}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{video.videochanel}</h3>
            <p className="text-sm text-gray-600">1.2M subscribers</p>
          </div>
          <Button className="ml-4">Subscribe</Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${
                  isLiked ? "fill-black text-black" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-gray-300" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-2 ${
                  isDisliked ? "fill-black text-black" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>

          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full shadow-sm flex items-center gap-1.5 px-4"
            onClick={handleWatchParty}
          >
            <Users className="w-4 h-4" />
            Watch Party
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 rounded-full ${
              isWatchLater ? "text-primary font-semibold" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full"
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>

          {/* Controlled Download Button & Usage Indicator */}
          <div className="relative flex flex-col items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={downloading || (Boolean(user) && isLimitReached)}
              className={`rounded-full transition-all flex items-center gap-1.5 px-4 ${
                isLimitReached
                  ? "bg-red-50 text-red-600 border border-red-200 cursor-not-allowed opacity-80"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-900"
              }`}
            >
              {isLimitReached ? (
                <Lock className="w-4 h-4 text-red-500" />
              ) : (
                <Download className="w-4 h-4 text-red-600" />
              )}
              <span className="font-medium">
                {downloading ? "Downloading..." : isLimitReached ? "Limit Reached" : "Download"}
              </span>
              
              {user && (
                <span className="ml-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700">
                  {todayCount}/{limit}
                </span>
              )}
            </Button>

            {user && (
              <span className="text-[10px] text-gray-500 font-medium mt-0.5">
                {currentPlan === "free" ? "1 download per day" : `${currentPlan.toUpperCase()} Plan (${limit}/day)`} • Used today: {todayCount}/{limit}
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="bg-gray-100 rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Download Alert / Notification Message */}
      {downloadMsg && (
        <div
          className={`p-3 rounded-lg flex items-center justify-between text-sm shadow-sm transition-all ${
            downloadMsg.type === "error"
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {downloadMsg.type === "error" ? (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            )}
            <span className="font-medium">{downloadMsg.text}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDownloadMsg(null)}
            className="text-xs h-6 px-2 text-gray-600 hover:bg-black/5"
          >
            Dismiss
          </Button>
        </div>
      )}

      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{(video.views || 0).toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt || Date.now()))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            Sample video description. This contains the actual video description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
    </div>
  );
};

export default VideoInfo;
