import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
import axiosInstance from "@/lib/axiosinstance";
import { Video } from "lucide-react";
import { FALLBACK_VIDEOS } from "@/lib/fallbackVideos";

const Videogrid = () => {
  const [videos, setvideo] = useState<any[]>([]);
  const [loading, setloading] = useState(true);

  useEffect(() => {
    const fetchvideo = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        if (res && Array.isArray(res.data) && res.data.length > 0) {
          setvideo(res.data);
        } else {
          setvideo(FALLBACK_VIDEOS);
        }
      } catch (error: any) {
        console.warn("Using fallback demo videos:", error?.message || error);
        setvideo(FALLBACK_VIDEOS);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="space-y-3">
            <div className="aspect-video bg-gray-200 rounded-lg"></div>
            <div className="flex gap-3">
              <div className="w-9 h-9 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
        <Video className="w-12 h-12 mb-3 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-800">No Videos Available</h3>
        <p className="text-sm text-gray-500 max-w-sm mt-1">
          Upload a video using the Header upload button to see it listed here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {videos.map((video: any) => (
        <Videocard key={video._id} video={video} />
      ))}
    </div>
  );
};

export default Videogrid;
