"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Download, DownloadCloud, Crown, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

export default function DownloadsContent() {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const { user } = useUser();

  const loadDownloadsAndUsage = async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      const [historyRes, usageRes] = await Promise.all([
        axiosInstance.get(`/download/history/${user._id}`),
        axiosInstance.get(`/download/usage/${user._id}`),
      ]);
      setDownloads(historyRes.data || []);
      setUsage(usageRes.data || null);
    } catch (error) {
      console.error("Error loading downloads or usage:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      loadDownloadsAndUsage();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handlePlanToggle = async (targetPlan: string) => {
    if (!user?._id) return;
    try {
      setUpdatingPlan(true);
      await axiosInstance.put(`/download/plan/${user._id}`, { plan: targetPlan });
      await loadDownloadsAndUsage();
    } catch (error) {
      console.error("Error updating plan:", error);
    } finally {
      setUpdatingPlan(false);
    }
  };

  const getVideoSrc = (filepath?: string) => {
    if (!filepath) return "";
    if (filepath.startsWith("http://") || filepath.startsWith("https://")) {
      return filepath;
    }
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    return `${backendUrl}/${filepath.replace(/\\/g, "/")}`;
  };

  if (!user) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300 p-8">
        <DownloadCloud className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sign in to view your downloads</h2>
        <p className="text-gray-600">Your downloaded videos are saved privately in your profile.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-3 text-gray-600">Loading downloads history...</span>
      </div>
    );
  }

  const currentPlan = usage?.plan || "free";
  const isPremium = currentPlan !== "free";

  return (
    <div className="space-y-6">
      {/* Plan Status Banner & Testing Control */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-sm border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${isPremium ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>
              {isPremium ? <Crown className="w-6 h-6" /> : <Download className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  User Plan: <span className="uppercase tracking-wider text-amber-400">{currentPlan}</span>
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-700 text-slate-300">
                  Backend Verified
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-0.5">
                Daily Limit: <span className="font-semibold text-white">{usage?.limit || 1} video(s)/day</span>
                {" • "}
                Used Today: <span className={`font-semibold ${usage?.isLimitReached ? "text-red-400" : "text-emerald-400"}`}>{usage?.todayCount || 0}/{usage?.limit || 1}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400 font-medium px-2">Test Plan Switcher:</span>
            <Button
              size="sm"
              variant={currentPlan === "free" ? "default" : "outline"}
              className={currentPlan === "free" ? "bg-gray-100 text-black hover:bg-gray-200" : "text-white border-slate-600 hover:bg-slate-700"}
              onClick={() => handlePlanToggle("free")}
              disabled={updatingPlan}
            >
              Free (1/day)
            </Button>
            <Button
              size="sm"
              variant={currentPlan === "gold" || currentPlan === "premium" ? "default" : "outline"}
              className={currentPlan === "gold" || currentPlan === "premium" ? "bg-amber-500 text-black hover:bg-amber-600 font-semibold" : "text-amber-400 border-amber-500/40 hover:bg-slate-700"}
              onClick={() => handlePlanToggle("gold")}
              disabled={updatingPlan}
            >
              <Crown className="w-3.5 h-3.5 mr-1" /> Premium Gold (25/day)
            </Button>
          </div>
        </div>
      </div>

      {/* Downloads List Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <DownloadCloud className="w-5 h-5 text-red-600" />
          <h3 className="font-semibold text-gray-800 text-lg">Downloaded Videos</h3>
          <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
            {downloads.length} {downloads.length === 1 ? "file" : "files"}
          </span>
        </div>
      </div>

      {/* Empty State */}
      {downloads.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200 p-8">
          <DownloadCloud className="w-16 h-16 mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-semibold text-gray-800 mb-1">No downloaded videos yet</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Videos you download will appear here in your profile downloads history.
          </p>
          <Link href="/">
            <Button className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
              Browse Videos to Download
            </Button>
          </Link>
        </div>
      ) : (
        /* Video List */
        <div className="space-y-4">
          {downloads.map((item) => {
            const vid = item.videoId || {};
            const details = item.videoDetails || {};
            const videoTitle = item.videoTitle || vid.videotitle || "Untitled Video";
            const channel = details.videochanel || vid.videochanel || "Unknown Channel";
            const fileSize = details.filesize || vid.filesize || "N/A";
            const filePath = details.filepath || vid.filepath || "";
            const downloadTime = item.downloadTimestamp
              ? format(new Date(item.downloadTimestamp), "MMM dd, yyyy • hh:mm a")
              : item.downloadDate || "N/A";

            return (
              <div
                key={item._id}
                className="flex flex-col sm:flex-row gap-4 p-3 bg-white border border-gray-200 hover:border-gray-300 rounded-xl transition-all shadow-sm group"
              >
                {/* Thumbnail / Video Preview */}
                <div className="relative w-full sm:w-52 aspect-video bg-black rounded-lg overflow-hidden flex-shrink-0">
                  <video
                    src={getVideoSrc(filePath)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    muted
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/watch/${vid._id || item.videoId}`}>
                      <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs rounded-full">
                        Watch Now
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/watch/${vid._id || item.videoId}`}>
                        <h4 className="font-semibold text-base text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2">
                          {videoTitle}
                        </h4>
                      </Link>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        item.userPlan === "free"
                          ? "bg-gray-100 text-gray-700 border border-gray-200"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}>
                        {item.userPlan || "free"} Plan
                      </span>
                    </div>

                    <p className="text-sm font-medium text-gray-600 mt-1">{channel}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">
                    <span className="flex items-center gap-1 font-medium text-gray-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Downloaded: {downloadTime}
                    </span>
                    <span>•</span>
                    <span>File size: {fileSize}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
