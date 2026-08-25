"use client";

import React from "react";
import { Users, Crown, Mic, MicOff, Camera, VideoOff, Monitor } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Participant } from "./VideoCallGrid";

interface ParticipantListPanelProps {
  participants: Participant[];
  localSocketId: string;
}

export default function ParticipantListPanel({
  participants,
  localSocketId,
}: ParticipantListPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-red-600" />
          <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-800">
            Participants ({participants.length})
          </h3>
        </div>
      </div>

      <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
        {participants.map((p) => {
          const isMe = p.socketId === localSocketId;

          return (
            <div
              key={p.socketId}
              className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                isMe ? "bg-red-50/70 border border-red-100" : "hover:bg-gray-50 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="w-7 h-7 border border-gray-200 shrink-0">
                  <AvatarImage src={p.avatar} />
                  <AvatarFallback className="bg-gray-200 text-gray-700 font-semibold text-[10px]">
                    {p.name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-900 truncate">{p.name}</span>
                    {p.isHost && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5 shrink-0">
                        <Crown className="w-2.5 h-2.5 text-amber-600" /> Host
                      </span>
                    )}
                  </div>
                  {isMe && <span className="text-[10px] text-gray-500 font-normal">You</span>}
                </div>
              </div>

              {/* Status Icons */}
              <div className="flex items-center gap-2 text-gray-500 shrink-0">
                {p.isScreenSharing && (
                  <span title="Sharing screen">
                    <Monitor className="w-3.5 h-3.5 text-blue-600" />
                  </span>
                )}
                {p.isCameraOff ? (
                  <span title="Camera off">
                    <VideoOff className="w-3.5 h-3.5 text-red-500" />
                  </span>
                ) : (
                  <span title="Camera on">
                    <Camera className="w-3.5 h-3.5 text-gray-600" />
                  </span>
                )}
                {p.isMuted ? (
                  <span title="Microphone muted">
                    <MicOff className="w-3.5 h-3.5 text-red-500" />
                  </span>
                ) : (
                  <span title="Microphone active">
                    <Mic className="w-3.5 h-3.5 text-emerald-600" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
