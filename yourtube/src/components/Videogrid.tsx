import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
import axiosInstance from "@/lib/axiosinstance";
import { Video, AlertTriangle } from "lucide-react";

const Videogrid = () => {
  const [videos, setvideo] = useState<any[]>([]);
  const [loading, setloading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchvideo = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        if (res && Array.isArray(res.data)) {
          setvideo(res.data);
          setErrorMsg(null);
        } else {
          setvideo([]);
        }
      } catch (error: any) {
        console.warn("Error fetching videos:", error?.message || error);
        setvideo([]);
        if (error?.code === "ERR_NETWORK" || !error?.response) {
          setErrorMsg("Backend server is not running on http://localhost:5000.");
        }
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
        {errorMsg ? (
          <div className="bg-amber-50/80 border border-amber-200 p-6 rounded-2xl max-w-lg shadow-sm text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-amber-500" />
            <h3 className="text-lg font-bold text-gray-800">Backend Server is Offline</h3>
            <p className="text-sm text-gray-600 mt-1 mb-4">
              The frontend is running, but the backend server at <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-mono text-xs">http://localhost:5000</code> is not responding.
            </p>
            <div className="bg-gray-900 text-gray-200 text-left p-4 rounded-xl text-xs font-mono space-y-2">
              <p className="font-semibold text-white">How to start both servers:</p>
              <p className="text-emerald-400"># Option 1: Run both concurrently from root folder</p>
              <p className="text-white">npm run dev</p>
              <p className="text-emerald-400 mt-2"># Option 2: Run start.bat script</p>
              <p className="text-white">Double click start.bat in project root</p>
            </div>
          </div>
        ) : (
          <>
            <Video className="w-12 h-12 mb-3 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800">No Videos Available</h3>
            <p className="text-sm text-gray-500 max-w-sm mt-1">
              Upload a video using the Header upload button or start the backend server to load sample videos.
            </p>
          </>
        )}
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
