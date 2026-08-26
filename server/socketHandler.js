const rooms = new Map();

export function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join room
    socket.on("join-room", ({ roomId, videoId, user }) => {
      if (!roomId) {
        socket.emit("room-error", { message: "Watch Party room not found." });
        return;
      }

      socket.join(roomId);

      let room = rooms.get(roomId);
      if (!room) {
        room = {
          roomId,
          videoId: videoId || null,
          hostId: socket.id,
          participants: new Map(),
          videoState: { currentTime: 0, isPlaying: false, lastUpdated: Date.now() },
          chatMessages: [],
        };
        rooms.set(roomId, room);
      } else if (videoId && !room.videoId) {
        room.videoId = videoId;
      }

      const isHost = room.hostId === socket.id;
      const participant = {
        socketId: socket.id,
        userId: user?._id || socket.id,
        name: user?.name || `Guest_${socket.id.slice(0, 4)}`,
        avatar: user?.image || "https://github.com/shadcn.png",
        isHost,
        isMuted: false,
        isCameraOff: false,
        isScreenSharing: false,
      };

      room.participants.set(socket.id, participant);

      const participantsList = Array.from(room.participants.values());

      // Send initial room data to joining participant
      socket.emit("room-joined", {
        roomId,
        videoId: room.videoId,
        hostId: room.hostId,
        isHost,
        participants: participantsList,
        videoState: room.videoState,
        chatMessages: room.chatMessages,
      });

      // System chat message for new member
      const systemMessage = {
        id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        senderName: "System",
        text: `${participant.name} joined the party!`,
        timestamp: new Date().toISOString(),
        isSystem: true,
      };
      room.chatMessages.push(systemMessage);
      if (room.chatMessages.length > 100) room.chatMessages.shift();

      // Notify others in room
      socket.to(roomId).emit("user-joined-room", {
        participant,
        participants: participantsList,
        systemMessage,
      });

      // Broadcast updated participants list to everyone in room
      io.to(roomId).emit("participants-updated", participantsList);
    });

    // Handle video sync actions (play, pause, seek)
    socket.on("video-action", ({ roomId, action, currentTime, isPlaying }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      room.videoState = {
        currentTime: currentTime !== undefined ? currentTime : room.videoState.currentTime,
        isPlaying: isPlaying !== undefined ? isPlaying : room.videoState.isPlaying,
        lastUpdated: Date.now(),
      };

      // Broadcast video action to all other participants in the room
      socket.to(roomId).emit("video-action-sync", {
        action,
        currentTime: room.videoState.currentTime,
        isPlaying: room.videoState.isPlaying,
        senderSocketId: socket.id,
      });
    });

    // Request current video sync state
    socket.on("request-room-sync", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room) {
        socket.emit("room-sync-response", {
          videoState: room.videoState,
          videoId: room.videoId,
          hostId: room.hostId,
        });
      }
    });

    // Real-time Chat message
    socket.on("send-chat-message", ({ roomId, text, user }) => {
      const room = rooms.get(roomId);
      if (!room || !text.trim()) return;

      const participant = room.participants.get(socket.id);
      const chatMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        senderName: participant?.name || user?.name || "Guest",
        senderAvatar: participant?.avatar || user?.image || "",
        senderSocketId: socket.id,
        text: text.trim(),
        timestamp: new Date().toISOString(),
        isSystem: false,
      };

      room.chatMessages.push(chatMsg);
      if (room.chatMessages.length > 100) room.chatMessages.shift();

      io.to(roomId).emit("receive-chat-message", chatMsg);
    });

    // Media status updates (mic, camera, screen share)
    socket.on("update-media-status", ({ roomId, isMuted, isCameraOff, isScreenSharing }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const participant = room.participants.get(socket.id);
      if (participant) {
        if (isMuted !== undefined) participant.isMuted = isMuted;
        if (isCameraOff !== undefined) participant.isCameraOff = isCameraOff;
        if (isScreenSharing !== undefined) participant.isScreenSharing = isScreenSharing;

        const participantsList = Array.from(room.participants.values());
        io.to(roomId).emit("participants-updated", participantsList);
      }
    });

    // WebRTC Signaling
    socket.on("webrtc-offer", ({ targetSocketId, offer }) => {
      const participant = getParticipantBySocketId(socket.id);
      io.to(targetSocketId).emit("webrtc-offer", {
        senderSocketId: socket.id,
        offer,
        senderParticipant: participant,
      });
    });

    socket.on("webrtc-answer", ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit("webrtc-answer", {
        senderSocketId: socket.id,
        answer,
      });
    });

    socket.on("webrtc-ice-candidate", ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit("webrtc-ice-candidate", {
        senderSocketId: socket.id,
        candidate,
      });
    });

    // Handle Disconnect & Leave
    const handleLeave = (socketId) => {
      rooms.forEach((room, roomId) => {
        if (room.participants.has(socketId)) {
          const participant = room.participants.get(socketId);
          room.participants.delete(socketId);

          if (room.participants.size === 0) {
            rooms.delete(roomId);
          } else {
            // Transfer host if host left
            if (room.hostId === socketId) {
              const nextHostSocketId = Array.from(room.participants.keys())[0];
              room.hostId = nextHostSocketId;
              const nextHost = room.participants.get(nextHostSocketId);
              if (nextHost) nextHost.isHost = true;

              io.to(roomId).emit("host-changed", {
                newHostId: nextHostSocketId,
                newHostName: nextHost?.name || "Participant",
              });
            }

            const systemMessage = {
              id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              senderName: "System",
              text: `${participant?.name || "A participant"} left the party.`,
              timestamp: new Date().toISOString(),
              isSystem: true,
            };
            room.chatMessages.push(systemMessage);

            const participantsList = Array.from(room.participants.values());
            io.to(roomId).emit("user-left-room", {
              socketId,
              participants: participantsList,
              systemMessage,
            });
            io.to(roomId).emit("participants-updated", participantsList);
          }
        }
      });
    };

    socket.on("leave-room", ({ roomId }) => {
      socket.leave(roomId);
      handleLeave(socket.id);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      handleLeave(socket.id);
    });
  });

  function getParticipantBySocketId(socketId) {
    for (const room of rooms.values()) {
      if (room.participants.has(socketId)) {
        return room.participants.get(socketId);
      }
    }
    return null;
  }
}
