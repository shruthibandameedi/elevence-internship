"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";

export default function WatchPartyIndex() {
  const router = useRouter();
  const { roomId, videoId } = router.query;

  useEffect(() => {
    if (router.isReady) {
      if (roomId && typeof roomId === "string") {
        router.replace({
          pathname: `/watch-party/${roomId}`,
          query: videoId ? { videoId } : {},
        });
      } else {
        const newRoomId = `wp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        router.replace({
          pathname: `/watch-party/${newRoomId}`,
          query: videoId ? { videoId } : {},
        });
      }
    }
  }, [router.isReady, roomId, videoId]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-gray-400">Connecting to Watch Party...</p>
      </div>
    </div>
  );
}
