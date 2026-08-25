"use client";

import React, { useRef, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import VideoPlayer from "@/components/Videopplayer";

interface WatchPartyVideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  socket: Socket | null;
  roomId: string;
  isHost: boolean;
  hostName?: string;
}

export default function WatchPartyVideoPlayer({
  video,
  socket,
  roomId,
  isHost,
  hostName,
}: WatchPartyVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isSyncingRef = useRef(false);
  const [syncedStatus, setSyncedStatus] = useState("Synced in real-time");

  // Handle incoming video sync from Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleVideoSync = ({ action, currentTime, isPlaying }: any) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;

      isSyncingRef.current = true;

      if (currentTime !== undefined && Math.abs(videoEl.currentTime - currentTime) > 0.6) {
        videoEl.currentTime = currentTime;
      }

      if (action === "play" || isPlaying) {
        videoEl.play().catch(() => {});
      } else if (action === "pause" || isPlaying === false) {
        videoEl.pause();
      }

      setSyncedStatus(`Synced with Host (${action || "update"})`);

      setTimeout(() => {
        isSyncingRef.current = false;
      }, 300);
    };

    const handleRoomSyncResponse = ({ videoState }: any) => {
      const videoEl = videoRef.current;
      if (!videoEl || !videoState) return;

      isSyncingRef.current = true;
      if (videoState.currentTime !== undefined) {
        videoEl.currentTime = videoState.currentTime;
      }

      if (videoState.isPlaying) {
        videoEl.play().catch(() => {});
      } else {
        videoEl.pause();
      }

      setTimeout(() => {
        isSyncingRef.current = false;
      }, 300);
    };

    socket.on("video-action-sync", handleVideoSync);
    socket.on("room-sync-response", handleRoomSyncResponse);

    return () => {
      socket.off("video-action-sync", handleVideoSync);
      socket.off("room-sync-response", handleRoomSyncResponse);
    };
  }, [socket]);

  // Video event handlers for host sync emission
  const handlePlaySync = (currentTime: number) => {
    if (isSyncingRef.current || !socket || !isHost) return;

    socket.emit("video-action", {
      roomId,
      action: "play",
      currentTime,
      isPlaying: true,
    });
  };

  const handlePauseSync = (currentTime: number) => {
    if (isSyncingRef.current || !socket || !isHost) return;

    socket.emit("video-action", {
      roomId,
      action: "pause",
      currentTime,
      isPlaying: false,
    });
  };

  const handleSeekSync = (currentTime: number) => {
    if (isSyncingRef.current || !socket || !isHost) return;

    socket.emit("video-action", {
      roomId,
      action: "seek",
      currentTime,
      isPlaying: !videoRef.current?.paused,
    });
  };

  const requestManualSync = () => {
    if (socket) {
      socket.emit("request-room-sync", { roomId });
      setSyncedStatus("Syncing...");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <VideoPlayer
        video={video}
        externalVideoRef={videoRef}
        isHost={isHost}
        hostName={hostName}
        syncedStatus={!isHost ? `Host Control Active (${hostName || "Host"})` : syncedStatus}
        onPlaySync={handlePlaySync}
        onPauseSync={handlePauseSync}
        onSeekSync={handleSeekSync}
      />

      <div className="flex items-center justify-between px-2 text-xs text-gray-500">
        <div className="flex items-center gap-1.5 text-gray-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>{syncedStatus}</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={requestManualSync}
          className="h-7 text-xs text-gray-600 hover:text-black gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync Video
        </Button>
      </div>
    </div>
  );
}

