"use client";

import React, { useEffect, useRef } from "react";
import { Mic, MicOff, Camera, VideoOff, Crown, Monitor, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export interface Participant {
  socketId: string;
  userId: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isScreenSharing?: boolean;
  stream?: MediaStream | null;
}

interface VideoCallGridProps {
  participants: Participant[];
  localSocketId: string;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
}

export default function VideoCallGrid({
  participants,
  localSocketId,
  localStream,
  remoteStreams,
}: VideoCallGridProps) {
  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 shadow-inner flex flex-col h-full min-h-[220px]">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-red-500" />
          Video Call ({participants.length})
        </h3>
      </div>

      <div
        className={`grid gap-2 flex-1 w-full overflow-y-auto ${
          participants.length === 1
            ? "grid-cols-1"
            : participants.length === 2
            ? "grid-cols-2"
            : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-2"
        }`}
      >
        {participants.map((participant) => {
          const isLocal = participant.socketId === localSocketId;
          const stream = isLocal ? localStream : remoteStreams.get(participant.socketId);

          return (
            <ParticipantCard
              key={participant.socketId}
              participant={participant}
              isLocal={isLocal}
              stream={stream || null}
            />
          );
        })}
      </div>
    </div>
  );
}

function ParticipantCard({
  participant,
  isLocal,
  stream,
}: {
  participant: Participant;
  isLocal: boolean;
  stream: MediaStream | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, participant.isCameraOff, participant.isScreenSharing]);

  const showVideo = stream && !participant.isCameraOff;

  return (
    <div className="relative aspect-video bg-gray-950 rounded-lg overflow-hidden border border-gray-800 flex items-center justify-center group shadow-md">
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Mute local video to prevent audio feedback loop
          className={`w-full h-full object-cover ${isLocal && !participant.isScreenSharing ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-3 gap-1.5">
          <Avatar className="w-12 h-12 border-2 border-gray-700 shadow-md">
            <AvatarImage src={participant.avatar} />
            <AvatarFallback className="bg-gray-800 text-white font-semibold">
              {participant.name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Participant Name Overlay */}
      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] text-white flex items-center gap-1.5 max-w-[80%] truncate border border-white/10">
        {participant.isHost && (
          <Crown className="w-3 h-3 text-amber-400 shrink-0" />
        )}
        <span className="truncate">{participant.name} {isLocal && "(You)"}</span>
      </div>

      {/* Media Badges */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {participant.isScreenSharing && (
          <span className="bg-blue-600/90 text-white p-1 rounded-full text-[10px] shadow" title="Sharing screen">
            <Monitor className="w-3 h-3" />
          </span>
        )}
        {participant.isMuted ? (
          <span className="bg-red-600/90 text-white p-1 rounded-full text-[10px] shadow" title="Muted">
            <MicOff className="w-3 h-3" />
          </span>
        ) : (
          <span className="bg-emerald-600/80 text-white p-1 rounded-full text-[10px] shadow" title="Mic active">
            <Mic className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  );
}
