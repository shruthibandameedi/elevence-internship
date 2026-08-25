const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function createPeerConnection(
  targetSocketId: string,
  onIceCandidate: (candidate: RTCIceCandidate) => void,
  onTrack: (stream: MediaStream) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection(ICE_SERVERS);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  };

  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      onTrack(event.streams[0]);
    }
  };

  return pc;
}

export async function getUserMediaStream(video = true, audio = true): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: video ? { width: { ideal: 640 }, height: { ideal: 360 } } : false,
      audio,
    });
    return stream;
  } catch (error) {
    console.error("Error accessing user media devices:", error);
    return null;
  }
}

export async function getDisplayMediaStream(): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    return stream;
  } catch (error) {
    console.error("Error accessing screen share:", error);
    return null;
  }
}
