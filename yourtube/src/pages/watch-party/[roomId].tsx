"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import { io, Socket } from "socket.io-client";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import {
  createPeerConnection,
  getUserMediaStream,
  getDisplayMediaStream,
} from "@/lib/webrtc";
import WatchPartyVideoPlayer from "@/components/WatchParty/WatchPartyVideoPlayer";
import VideoCallGrid, { Participant } from "@/components/WatchParty/VideoCallGrid";
import PartyChatPanel, { ChatMessage } from "@/components/WatchParty/PartyChatPanel";
import ParticipantListPanel from "@/components/WatchParty/ParticipantListPanel";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Check,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  PhoneOff,
  Users,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Share2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { FALLBACK_VIDEOS } from "@/lib/fallbackVideos";

export default function WatchPartyRoom() {
  const router = useRouter();
  const rawRoomId = router.query.roomId;
  const rawVideoId = router.query.videoId;
  const safeRoomId = Array.isArray(rawRoomId) ? rawRoomId[0] : (rawRoomId as string) || "";
  const safeVideoId = Array.isArray(rawVideoId) ? rawVideoId[0] : (rawVideoId as string) || "";

  const { user: authUser } = useUser();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [localSocketId, setLocalSocketId] = useState<string>("");
  const [video, setVideo] = useState<any>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string>("");
  const [isHost, setIsHost] = useState(false);
  const [hostName, setHostName] = useState("Host");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "participants">("chat");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Media Controls State
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  // WebRTC Peer Connections Map
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  // Build stable local user profile fallback
  const guestUser = useMemo(
    () => ({
      _id: `guest_${Math.random().toString(36).substr(2, 6)}`,
      name: `Guest_${Math.floor(1000 + Math.random() * 9000)}`,
      image: "https://github.com/shadcn.png",
    }),
    []
  );

  const currentUser = authUser || guestUser;

  // 1. Fetch Video Details when videoId is known
  useEffect(() => {
    const fetchVideoDetails = async (vId: string) => {
      if (!vId) return;
      try {
        const res = await axiosInstance.get("/video/getall");
        const list = Array.isArray(res.data) && res.data.length > 0 ? res.data : FALLBACK_VIDEOS;
        const found = list.find(
          (item: any) => item._id === vId || String(item._id) === String(vId)
        ) || FALLBACK_VIDEOS[0];
        if (found) setVideo(found);
      } catch (err) {
        console.warn("Using fallback video details in Watch Party:", err);
        const found = FALLBACK_VIDEOS.find(
          (item: any) => item._id === vId || String(item._id) === String(vId)
        ) || FALLBACK_VIDEOS[0];
        setVideo(found);
      }
    };

    if (safeVideoId) {
      setCurrentVideoId(safeVideoId);
      fetchVideoDetails(safeVideoId);
    }
  }, [safeVideoId]);

  // 2. Initialize Socket.IO connection when router is ready
  useEffect(() => {
    if (!router.isReady || !safeRoomId) return;

    const newSocket = io(backendUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      setConnectionError(null);
      setLocalSocketId(newSocket.id || "");
      newSocket.emit("join-room", {
        roomId: safeRoomId,
        videoId: safeVideoId || "",
        user: currentUser,
      });
    });

    newSocket.on("connect_error", () => {
      setConnectionError("Unable to connect to Watch Party. Please try again.");
    });

    newSocket.on("room-error", ({ message }) => {
      setConnectionError(message || "Watch Party room not found.");
    });

    newSocket.on("room-joined", ({ roomId, videoId: roomVideoId, hostId, isHost, participants, videoState, chatMessages }) => {
      setIsHost(isHost);
      setParticipants(participants);
      if (chatMessages) setChatMessages(chatMessages);

      const effectiveVideoId = safeVideoId || roomVideoId;
      if (effectiveVideoId) {
        setCurrentVideoId(effectiveVideoId);
        axiosInstance
          .get("/video/getall")
          .then((res) => {
            const list = Array.isArray(res.data) && res.data.length > 0 ? res.data : FALLBACK_VIDEOS;
            const found = list.find(
              (v: any) => v._id === effectiveVideoId || String(v._id) === String(effectiveVideoId)
            ) || FALLBACK_VIDEOS[0];
            if (found) setVideo(found);
          })
          .catch(() => {
            const found = FALLBACK_VIDEOS.find(
              (v: any) => v._id === effectiveVideoId || String(v._id) === String(effectiveVideoId)
            ) || FALLBACK_VIDEOS[0];
            if (found) setVideo(found);
          });
      }

      const hostUser = participants.find((p: any) => p.socketId === hostId || p.isHost);
      if (hostUser) setHostName(hostUser.name);
    });

    newSocket.on("user-joined-room", ({ participant, participants, systemMessage }) => {
      setParticipants(participants);
      if (systemMessage) {
        setChatMessages((prev) => [...prev, systemMessage]);
      }
      toast.info(`${participant.name} joined the watch party!`);
    });

    newSocket.on("user-left-room", ({ socketId, participants, systemMessage }) => {
      setParticipants(participants);
      if (systemMessage) {
        setChatMessages((prev) => [...prev, systemMessage]);
      }
      // Clean up peer connection
      if (peerConnectionsRef.current.has(socketId)) {
        peerConnectionsRef.current.get(socketId)?.close();
        peerConnectionsRef.current.delete(socketId);
      }
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    });

    newSocket.on("participants-updated", (updatedList: Participant[]) => {
      setParticipants(updatedList);
    });

    newSocket.on("receive-chat-message", (chatMsg: ChatMessage) => {
      setChatMessages((prev) => [...prev, chatMsg]);
    });

    newSocket.on("host-changed", ({ newHostId, newHostName }) => {
      const amIHost = newSocket.id === newHostId;
      setIsHost(amIHost);
      setHostName(newHostName);
      toast.success(amIHost ? "You are now the Host!" : `${newHostName} is now the Host.`);
    });

    return () => {
      newSocket.emit("leave-room", { roomId: safeRoomId });
      newSocket.disconnect();
    };
  }, [router.isReady, safeRoomId, backendUrl]);

  // 3. WebRTC Setup & Media Stream Initialization
  useEffect(() => {
    let isMounted = true;

    async function initMedia() {
      const stream = await getUserMediaStream(true, true);
      if (stream && isMounted) {
        setLocalStream(stream);
      }
    }

    initMedia();

    return () => {
      isMounted = false;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // WebRTC Signaling listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("webrtc-offer", async ({ senderSocketId, offer }) => {
      try {
        let pc = peerConnectionsRef.current.get(senderSocketId);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(senderSocketId);
        }

        pc = createPeerConnection(
          senderSocketId,
          (candidate) => socket.emit("webrtc-ice-candidate", { targetSocketId: senderSocketId, candidate }),
          (remoteStream) => {
            setRemoteStreams((prev) => new Map(prev).set(senderSocketId, remoteStream));
          }
        );

        peerConnectionsRef.current.set(senderSocketId, pc);

        if (localStream) {
          localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc-answer", { targetSocketId: senderSocketId, answer });
      } catch (err) {
        console.error("Error handling WebRTC offer:", err);
      }
    });

    socket.on("webrtc-answer", async ({ senderSocketId, answer }) => {
      try {
        const pc = peerConnectionsRef.current.get(senderSocketId);
        if (pc && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error("Error handling WebRTC answer:", err);
      }
    });

    socket.on("webrtc-ice-candidate", async ({ senderSocketId, candidate }) => {
      try {
        const pc = peerConnectionsRef.current.get(senderSocketId);
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error("Error handling ICE candidate:", err);
      }
    });

    return () => {
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("webrtc-ice-candidate");
    };
  }, [socket, localStream]);

  // Connect WebRTC peers for newly joined participants using deterministic offerer logic
  useEffect(() => {
    if (!socket || !localSocketId || !localStream) return;

    participants.forEach(async (p) => {
      if (p.socketId !== localSocketId && !peerConnectionsRef.current.has(p.socketId)) {
        if (localSocketId < p.socketId) {
          try {
            const pc = createPeerConnection(
              p.socketId,
              (candidate) => socket.emit("webrtc-ice-candidate", { targetSocketId: p.socketId, candidate }),
              (remoteStream) => {
                setRemoteStreams((prev) => new Map(prev).set(p.socketId, remoteStream));
              }
            );

            peerConnectionsRef.current.set(p.socketId, pc);

            localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit("webrtc-offer", { targetSocketId: p.socketId, offer });
          } catch (err) {
            console.error("Error creating WebRTC offer for participant:", p.socketId, err);
          }
        }
      }
    });
  }, [participants, socket, localSocketId, localStream]);

  // Media Controls Actions
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const nextMuted = !audioTrack.enabled;
        setIsMuted(nextMuted);

        socket?.emit("update-media-status", {
          roomId: safeRoomId,
          isMuted: nextMuted,
          isCameraOff,
          isScreenSharing,
        });
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const nextCamOff = !videoTrack.enabled;
        setIsCameraOff(nextCamOff);

        socket?.emit("update-media-status", {
          roomId: safeRoomId,
          isMuted,
          isCameraOff: nextCamOff,
          isScreenSharing,
        });
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert to camera stream
      const camStream = await getUserMediaStream(true, !isMuted);
      if (camStream) {
        setLocalStream(camStream);
        setIsScreenSharing(false);

        // Replace track in peer connections
        const videoTrack = camStream.getVideoTracks()[0];
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender && videoTrack) sender.replaceTrack(videoTrack);
        });

        socket?.emit("update-media-status", {
          roomId: safeRoomId,
          isMuted,
          isCameraOff,
          isScreenSharing: false,
        });
      }
    } else {
      // Start Screen Share
      const screenStream = await getDisplayMediaStream();
      if (screenStream) {
        setLocalStream(screenStream);
        setIsScreenSharing(true);

        const screenVideoTrack = screenStream.getVideoTracks()[0];

        screenVideoTrack.onended = () => {
          toggleScreenShare(); // Handle native stop share button
        };

        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender && screenVideoTrack) sender.replaceTrack(screenVideoTrack);
        });

        socket?.emit("update-media-status", {
          roomId: safeRoomId,
          isMuted,
          isCameraOff: false,
          isScreenSharing: true,
        });
      }
    }
  };

  const handleSendMessage = (text: string) => {
    if (socket && safeRoomId) {
      socket.emit("send-chat-message", {
        roomId: safeRoomId,
        text,
        user: currentUser,
      });
    }
  };

  const copyInviteLink = () => {
    const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const inviteUrl = `${baseUrl}/watch-party/${safeRoomId}${currentVideoId ? `?videoId=${currentVideoId}` : ""}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2500);
  };

  const leaveWatchParty = () => {
    if (socket && safeRoomId) {
      socket.emit("leave-room", { roomId: safeRoomId });
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (currentVideoId) {
      router.push(`/watch/${currentVideoId}`);
    } else {
      router.push("/");
    }
  };

  if (connectionError) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center max-w-md w-full space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-800 flex items-center justify-center mx-auto text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">{connectionError}</h2>
            <p className="text-xs text-gray-400">Please check your connection or verify the room link.</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => router.reload()}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-full px-4 py-2 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </Button>
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:text-white text-xs font-medium rounded-full px-4 py-2"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col w-full">
      {/* Top Watch Party Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={leaveWatchParty}
            className="text-gray-300 hover:text-white hover:bg-gray-800 gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to YouTube</span>
          </Button>

          <div className="h-5 w-px bg-gray-800" />

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
            <h1 className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-1.5">
              Watch Party
              <span className="bg-red-950 text-red-400 border border-red-800 text-[10px] uppercase px-2 py-0.5 rounded-full font-semibold">
                Live
              </span>
            </h1>
          </div>
        </div>

        {/* Video Info Title Banner */}
        <div className="hidden lg:block max-w-md truncate text-xs text-gray-400 font-medium">
          Watching: <span className="text-gray-200 font-semibold">{video?.videotitle || "Selected YouTube Video"}</span>
        </div>

        {/* Share & Leave Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={copyInviteLink}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded-full gap-1.5 shadow"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied Link" : "Invite Friends"}</span>
          </Button>

          <Button
            onClick={leaveWatchParty}
            variant="destructive"
            size="sm"
            className="bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 text-xs rounded-full gap-1"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </Button>
        </div>
      </header>

      {/* Main Watch Party Grid Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2-Columns: Synced Video Player + WebRTC Call Grid + Media Controls */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Main Synced Video Player */}
          {video ? (
            <WatchPartyVideoPlayer
              video={video}
              socket={socket}
              roomId={safeRoomId}
              isHost={isHost}
              hostName={hostName}
            />
          ) : (
            <div className="aspect-video bg-gray-900 rounded-xl flex flex-col items-center justify-center border border-gray-800 gap-2">
              <Sparkles className="w-8 h-8 text-red-500 animate-spin" />
              <p className="text-xs text-gray-400 font-medium">Loading synchronized video player...</p>
            </div>
          )}

          {/* Media Control Toolbar (Mute, Cam, Screen Share, Invite) */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-2.5 flex items-center justify-between flex-wrap gap-2 shadow-md">
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleMute}
                variant={isMuted ? "destructive" : "secondary"}
                size="sm"
                className={`rounded-full h-9 px-3.5 text-xs font-medium gap-1.5 ${
                  isMuted ? "bg-red-600 text-white" : "bg-gray-800 hover:bg-gray-700 text-gray-200"
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                <span>{isMuted ? "Muted" : "Mute"}</span>
              </Button>

              <Button
                onClick={toggleCamera}
                variant={isCameraOff ? "destructive" : "secondary"}
                size="sm"
                className={`rounded-full h-9 px-3.5 text-xs font-medium gap-1.5 ${
                  isCameraOff ? "bg-red-600 text-white" : "bg-gray-800 hover:bg-gray-700 text-gray-200"
                }`}
              >
                {isCameraOff ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4 text-blue-400" />}
                <span>{isCameraOff ? "Cam Off" : "Cam On"}</span>
              </Button>

              <Button
                onClick={toggleScreenShare}
                variant={isScreenSharing ? "default" : "secondary"}
                size="sm"
                className={`rounded-full h-9 px-3.5 text-xs font-medium gap-1.5 ${
                  isScreenSharing ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-800 hover:bg-gray-700 text-gray-200"
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>{isScreenSharing ? "Stop Share" : "Screen Share"}</span>
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{participants.length} Participant{participants.length === 1 ? "" : "s"} Connected</span>
            </div>
          </div>

          {/* WebRTC Video Call Grid */}
          <div className="flex-1 min-h-[220px]">
            <VideoCallGrid
              participants={participants}
              localSocketId={localSocketId}
              localStream={localStream}
              remoteStreams={remoteStreams}
            />
          </div>
        </div>

        {/* Right 1-Column: Live Chat & Participant List Panels */}
        <div className="flex flex-col gap-3 min-h-[400px]">
          {/* Tabs header */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-1 flex items-center gap-1">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "chat"
                  ? "bg-red-600 text-white shadow"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Live Chat ({chatMessages.filter((m) => !m.isSystem).length})
            </button>

            <button
              onClick={() => setActiveTab("participants")}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "participants"
                  ? "bg-red-600 text-white shadow"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Members ({participants.length})
            </button>
          </div>

          {/* Active Tab Panel */}
          <div className="flex-1 min-h-[380px] text-gray-900">
            {activeTab === "chat" ? (
              <PartyChatPanel
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                localSocketId={localSocketId}
              />
            ) : (
              <ParticipantListPanel
                participants={participants}
                localSocketId={localSocketId}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
