"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  SkipForward,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

export interface VideoItem {
  _id: string;
  videotitle?: string;
  filepath: string;
  videochanel?: string;
  views?: number;
  createdAt?: string;
}

interface VideoPlayerProps {
  video: VideoItem;
  allVideos?: VideoItem[];
  onNextVideo?: () => void;
  // Watch Party Integration Props
  socket?: any;
  roomId?: string;
  isHost?: boolean;
  hostName?: string;
  syncedStatus?: string;
  onPlaySync?: (currentTime: number) => void;
  onPauseSync?: (currentTime: number) => void;
  onSeekSync?: (currentTime: number) => void;
  externalVideoRef?: React.RefObject<HTMLVideoElement | null>;
}

export default function VideoPlayer({
  video,
  allVideos,
  onNextVideo,
  socket,
  roomId,
  isHost = true,
  hostName,
  syncedStatus,
  onPlaySync,
  onPauseSync,
  onSeekSync,
  externalVideoRef,
}: VideoPlayerProps) {
  const router = useRouter();

  // Internal video element ref (or external ref if provided)
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || internalVideoRef;

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const doubleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  // Player States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [lastVolume, setLastVolume] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);

  // Hover preview state for seek bar
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  // Gesture Feedback Overlay state (+10s / -10s ripple)
  const [gestureFeedback, setGestureFeedback] = useState<{
    type: "forward" | "rewind" | "play" | "pause";
    id: number;
  } | null>(null);

  // Resolve backend video URL with fallback resilience
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:5000";

  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>("");
  const [usedFallback, setUsedFallback] = useState<boolean>(false);

  useEffect(() => {
    const rawSrc = video?.filepath || "";
    let resolved = "";
    if (rawSrc) {
      if (rawSrc.startsWith("http://") || rawSrc.startsWith("https://")) {
        resolved = rawSrc;
      } else {
        const cleanPath = rawSrc.replace(/\\/g, "/").replace(/^\/+/, "");
        resolved = `${backendUrl}/${cleanPath}`;
      }
    }
    setCurrentVideoSrc(resolved);
    setUsedFallback(false);
    setIsLoading(true);
    setHasError(false);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [video?._id, video?.filepath, backendUrl]);

  // Helper to format time into MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "00:00";
    const totalSecs = Math.floor(seconds);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (num: number) => num.toString().padStart(2, "0");

    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Trigger temporary visual gesture feedback icon overlay
  const triggerGestureFeedback = (
    type: "forward" | "rewind" | "play" | "pause"
  ) => {
    setGestureFeedback({ type, id: Date.now() });
    setTimeout(() => {
      setGestureFeedback(null);
    }, 800);
  };

  // Auto-hide controls mechanism during playback
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying && !isScrubbing) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }, [isPlaying, isScrubbing]);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  const handleMouseLeave = () => {
    if (isPlaying && !isScrubbing) {
      setShowControls(false);
    }
  };

  // Play / Pause Toggle logic
  const togglePlayPause = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (videoEl.paused) {
      videoEl
        .play()
        .then(() => {
          setIsPlaying(true);
          triggerGestureFeedback("play");
        })
        .catch((err) => {
          console.warn("Video playback prevented:", err);
        });
    } else {
      videoEl.pause();
      setIsPlaying(false);
      triggerGestureFeedback("pause");
    }
  }, [videoRef]);

  // Volume Slider Logic
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
    }
    if (newVol === 0) {
      setIsMuted(true);
      if (videoRef.current) videoRef.current.muted = true;
    } else {
      setIsMuted(false);
      setLastVolume(newVol);
      if (videoRef.current) videoRef.current.muted = false;
    }
  };

  // Mute / Unmute Toggle
  const toggleMute = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (isMuted || volume === 0) {
      const restoredVol = lastVolume > 0 ? lastVolume : 1;
      videoEl.muted = false;
      videoEl.volume = restoredVol;
      setVolume(restoredVol);
      setIsMuted(false);
    } else {
      setLastVolume(volume);
      videoEl.muted = true;
      videoEl.volume = 0;
      setVolume(0);
      setIsMuted(true);
    }
  };

  // 10-Second Seek Rewind & Forward
  const seekRelative = useCallback(
    (seconds: number) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;

      const target = Math.max(
        0,
        Math.min(duration || videoEl.duration || 0, videoEl.currentTime + seconds)
      );

      videoEl.currentTime = target;
      setCurrentTime(target);

      if (seconds > 0) {
        triggerGestureFeedback("forward");
      } else {
        triggerGestureFeedback("rewind");
      }

      if (onSeekSync && isHost) {
        onSeekSync(target);
      }
    },
    [duration, isHost, onSeekSync, videoRef]
  );

  // Seek Bar Scrubbing
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleSeekMouseDown = () => {
    setIsScrubbing(true);
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setIsScrubbing(false);
    resetControlsTimeout();
    if (onSeekSync && isHost && videoRef.current) {
      onSeekSync(videoRef.current.currentTime);
    }
  };

  // Seek Bar Hover Tooltip Calculation
  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
    const calculatedHoverTime = percentage * (duration || 0);

    setHoverPosition(offsetX);
    setHoverTime(calculatedHoverTime);
  };

  const handleSeekMouseLeave = () => {
    setHoverTime(null);
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch((err) => {
          console.error("Fullscreen error:", err);
        });
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((container as any).mozRequestFullScreen) {
        (container as any).mozRequestFullScreen();
      } else if ((container as any).msRequestFullscreen) {
        (container as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.error("Exit fullscreen error:", err);
        });
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  // Next Video Handler
  const handleNextVideoClick = () => {
    if (onNextVideo) {
      onNextVideo();
      return;
    }

    if (allVideos && allVideos.length > 0 && video?._id) {
      const currentIndex = allVideos.findIndex((v) => v._id === video._id);
      if (currentIndex !== -1 && currentIndex < allVideos.length - 1) {
        const nextVideoObj = allVideos[currentIndex + 1];
        router.push(`/watch/${nextVideoObj._id}`);
      } else if (allVideos.length > 1) {
        // Loop back to first video if at end of array
        router.push(`/watch/${allVideos[0]._id}`);
      }
    }
  };

  const hasNextVideo =
    Boolean(onNextVideo) ||
    (Boolean(allVideos) &&
      (allVideos?.length || 0) > 1 &&
      allVideos?.findIndex((v) => v._id === video?._id) !== -1);

  // Mobile / Surface Tap and Double-Tap Handler
  const handleSurfaceClick = (e: React.MouseEvent<HTMLElement>) => {
    // Prevent double-tap logic if clicking directly on bottom controls
    const target = e.target as HTMLElement;
    if (target.closest(".custom-player-controls")) return;

    const now = Date.now();
    const rect = containerRef.current?.getBoundingClientRect();
    const clickX = rect ? e.clientX - rect.left : 0;
    const containerWidth = rect ? rect.width : 1;

    // Check if double tap (within 300ms)
    if (now - lastTapRef.current.time < 300) {
      // Clear single tap timer if pending
      if (doubleTapTimerRef.current) {
        clearTimeout(doubleTapTimerRef.current);
        doubleTapTimerRef.current = null;
      }

      if (clickX < containerWidth / 2) {
        // Double-tap on LEFT side -> Rewind 10s
        seekRelative(-10);
      } else {
        // Double-tap on RIGHT side -> Skip Forward 10s
        seekRelative(10);
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      // Single tap -> Delay briefly before toggling play/pause
      lastTapRef.current = { time: now, x: clickX };
      doubleTapTimerRef.current = setTimeout(() => {
        togglePlayPause();
        doubleTapTimerRef.current = null;
      }, 250);
    }
  };

  // Keyboard Shortcuts (Space for play/pause, Left/Right for seeking, F for fullscreen, M for mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if active element is an input, textarea, etc.
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlayPause();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          seekRelative(-10);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          seekRelative(10);
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePlayPause, seekRelative]);

  // Video Event Handlers
  const handleLoadedMetadata = () => {
    const videoEl = videoRef.current;
    if (videoEl) {
      setDuration(videoEl.duration);
      setIsLoading(false);
      setHasError(false);
    }
  };

  const handleTimeUpdate = () => {
    const videoEl = videoRef.current;
    if (videoEl && !isScrubbing) {
      setCurrentTime(videoEl.currentTime);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsLoading(false);
    resetControlsTimeout();
    if (onPlaySync && isHost && videoRef.current) {
      onPlaySync(videoRef.current.currentTime);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    setShowControls(true);
    if (onPauseSync && isHost && videoRef.current) {
      onPauseSync(videoRef.current.currentTime);
    }
  };

  const handleWaiting = () => {
    setIsLoading(true);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handleVideoError = () => {
    if (!usedFallback && currentVideoSrc.startsWith("http")) {
      console.warn("Primary video URL failed to load. Switching to reliable fallback video stream...");
      setUsedFallback(true);
      setCurrentVideoSrc("https://www.w3schools.com/html/mov_bbb.mp4");
      setIsLoading(true);
      setHasError(false);
    } else {
      setIsLoading(false);
      setHasError(true);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
    if (hasNextVideo) {
      handleNextVideoClick();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative group bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800 select-none flex flex-col justify-center items-center ${
        isFullscreen ? "w-screen h-screen rounded-none border-none" : "w-full aspect-video"
      }`}
    >
      {/* HTML5 Video Element */}
      {currentVideoSrc ? (
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          src={currentVideoSrc}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
          autoPlay
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          onWaiting={handleWaiting}
          onCanPlay={handleCanPlay}
          onError={handleVideoError}
          onEnded={handleEnded}
          onClick={handleSurfaceClick}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center text-gray-400 gap-2">
          <AlertTriangle className="w-10 h-10 text-yellow-500" />
          <p className="text-sm font-medium">Video source not available.</p>
        </div>
      )}

      {/* Loading / Buffering Spinner Overlay */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none z-20 transition-opacity duration-300">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
          <span className="mt-3 text-xs font-semibold text-white tracking-wider uppercase bg-black/60 px-3 py-1 rounded-full border border-white/10">
            Buffering...
          </span>
        </div>
      )}

      {/* Video Load Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-950/90 flex flex-col items-center justify-center p-6 text-center z-20">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-2 animate-bounce" />
          <h3 className="text-base font-bold text-white mb-1">Playback Error</h3>
          <p className="text-xs text-gray-400 max-w-md mb-4">
            Failed to load video file. Please check your network connection or server uploads.
          </p>
          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.load();
                setHasError(false);
                setIsLoading(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Loading
          </button>
        </div>
      )}

      {/* Gesture Feedback Ripple Overlay (+10s / -10s / Play / Pause) */}
      {gestureFeedback && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          {gestureFeedback.type === "forward" && (
            <div className="absolute right-12 bg-black/75 backdrop-blur-md text-white font-extrabold px-6 py-4 rounded-full flex flex-col items-center justify-center animate-ping border border-red-500/40 shadow-xl">
              <RotateCw className="w-8 h-8 text-red-500 mb-1" />
              <span className="text-sm">+10s</span>
            </div>
          )}
          {gestureFeedback.type === "rewind" && (
            <div className="absolute left-12 bg-black/75 backdrop-blur-md text-white font-extrabold px-6 py-4 rounded-full flex flex-col items-center justify-center animate-ping border border-red-500/40 shadow-xl">
              <RotateCcw className="w-8 h-8 text-red-500 mb-1" />
              <span className="text-sm">-10s</span>
            </div>
          )}
          {gestureFeedback.type === "play" && (
            <div className="bg-black/70 text-white p-5 rounded-full border border-white/20 animate-pulse">
              <Play className="w-10 h-10 fill-white text-white translate-x-0.5" />
            </div>
          )}
          {gestureFeedback.type === "pause" && (
            <div className="bg-black/70 text-white p-5 rounded-full border border-white/20 animate-pulse">
              <Pause className="w-10 h-10 fill-white text-white" />
            </div>
          )}
        </div>
      )}

      {/* Watch Party Sync Header / Status Badge */}
      {syncedStatus && (
        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs text-white flex items-center gap-2 z-20 shadow-lg pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span>{syncedStatus}</span>
        </div>
      )}

      {/* Custom Video Controls Bar Overlay */}
      <div
        className={`custom-player-controls absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-10 pb-3 px-4 flex flex-col gap-2 z-20 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Seek Bar / Progress Bar */}
        <div className="relative group/seekbar w-full flex items-center py-1 cursor-pointer">
          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-7 bg-black/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow border border-white/10 -translate-x-1/2 pointer-events-none"
              style={{ left: `${hoverPosition}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Background Progress Rail */}
          <div className="relative w-full h-1.5 group-hover/seekbar:h-2.5 bg-white/20 rounded-full overflow-hidden transition-all">
            {/* Filled Progress Bar */}
            <div
              className="h-full bg-red-600 rounded-full transition-all relative"
              style={{
                width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full shadow border border-white opacity-0 group-hover/seekbar:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* HTML Range Input Overlay for Dragging/Seeking */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeekChange}
            onMouseDown={handleSeekMouseDown}
            onMouseUp={handleSeekMouseUp}
            onMouseMove={handleSeekMouseMove}
            onMouseLeave={handleSeekMouseLeave}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Lower Control Buttons Bar */}
        <div className="flex items-center justify-between text-white text-sm font-medium">
          {/* Left Controls Group: Play/Pause, Rewind 10, Forward 10, Volume, Time */}
          <div className="flex items-center gap-3">
            {/* Play / Pause Toggle Button */}
            <button
              onClick={togglePlayPause}
              title={isPlaying ? "Pause (k)" : "Play (k)"}
              className="p-1.5 hover:bg-white/20 rounded-full transition text-white focus:outline-none"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white translate-x-0.5" />
              )}
            </button>

            {/* Rewind 10 Seconds */}
            <button
              onClick={() => seekRelative(-10)}
              title="Rewind 10 seconds (j)"
              className="p-1.5 hover:bg-white/20 rounded-full transition text-gray-200 hover:text-white flex items-center gap-0.5 focus:outline-none"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-[10px] font-bold">10</span>
            </button>

            {/* Forward 10 Seconds */}
            <button
              onClick={() => seekRelative(10)}
              title="Skip 10 seconds (l)"
              className="p-1.5 hover:bg-white/20 rounded-full transition text-gray-200 hover:text-white flex items-center gap-0.5 focus:outline-none"
            >
              <RotateCw className="w-4 h-4" />
              <span className="text-[10px] font-bold">10</span>
            </button>

            {/* Volume Control Group */}
            <div className="flex items-center gap-1.5 group/volume">
              <button
                onClick={toggleMute}
                title={isMuted ? "Unmute (m)" : "Mute (m)"}
                className="p-1.5 hover:bg-white/20 rounded-full transition text-gray-200 hover:text-white focus:outline-none"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-500" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              {/* Volume Slider Bar */}
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 accent-red-600 h-1 bg-white/30 rounded-lg cursor-pointer transition-all group-hover/volume:w-20"
                title="Volume"
              />
            </div>

            {/* Time Format Display: Current / Total */}
            <div className="text-xs text-gray-300 font-mono tracking-tight ml-1">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-gray-500">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls Group: Next Video, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Next Video Button */}
            <button
              onClick={handleNextVideoClick}
              disabled={!hasNextVideo}
              title={hasNextVideo ? "Next Video" : "No next video available"}
              className={`p-1.5 rounded-full transition flex items-center gap-1 focus:outline-none ${
                hasNextVideo
                  ? "hover:bg-white/20 text-white cursor-pointer"
                  : "text-gray-600 cursor-not-allowed opacity-50"
              }`}
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen (f)" : "Full Screen (f)"}
              className="p-1.5 hover:bg-white/20 rounded-full transition text-gray-200 hover:text-white focus:outline-none"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
