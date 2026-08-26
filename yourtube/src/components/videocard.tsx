"use client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";

export default function VideoCard({ video }: any) {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:5000";

  const videoSrc = video?.filepath?.startsWith("http")
    ? video.filepath
    : `${backendUrl}/${video?.filepath?.replace(/\\/g, "/")}`;

  const formattedDate = video?.createdAt
    ? formatDistanceToNow(new Date(video.createdAt)) + " ago"
    : "Recently";

  return (
    <Link href={`/watch/${video?._id}`} className="group">
      <div className="space-y-3">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900 border border-gray-100 shadow-sm">
          <video
            src={videoSrc}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            preload="metadata"
            muted
            playsInline
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
            Video
          </div>
        </div>
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0 border border-gray-200">
            <AvatarFallback className="bg-red-600 text-white font-semibold text-xs">
              {video?.videochanel?.[0]?.toUpperCase() || "V"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 group-hover:text-red-600 leading-snug">
              {video?.videotitle || "Untitled Video"}
            </h3>
            <p className="text-xs text-gray-600 mt-1 font-medium">{video?.videochanel || "YouTube Channel"}</p>
            <p className="text-xs text-gray-500">
              {(video?.views || 0).toLocaleString()} views • {formattedDate}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
