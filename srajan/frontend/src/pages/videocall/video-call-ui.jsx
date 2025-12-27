import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { createClient, createMicrophoneAndCameraTracks } from "agora-rtc-sdk-ng";
import { io } from "socket.io-client";
import API_BASE_URL from "../../config/api.js";

export default function VideoCall({ channel, token, appId, uid }) {
  console.log('kjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj', token)
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const localVideoRef = useRef();
  const remoteContainerRef = useRef();
  const clientRef = useRef(null);
  const localTracksRef = useRef([]);

  const navigate = useNavigate();

  useEffect(() => {
    if (!channel) {
      toast.error("Missing required video call channel");
      navigate("/appointments");
      return;
    }

    console.log(appId)

    const initCall = async () => {
      try {
        // If token is provided, use Agora (existing flow)
        if (token) {
          const client = createClient({ mode: "rtc", codec: "vp8" });
          clientRef.current = client;

          await client.join(appId, channel, token, uid);

          const [microphoneTrack, cameraTrack] = await createMicrophoneAndCameraTracks();
          localTracksRef.current = [microphoneTrack, cameraTrack];
          cameraTrack.play(localVideoRef.current);

          await client.publish(localTracksRef.current);
          setIsConnected(true);
          setIsLoading(false);

          client.on("user-published", async (user, mediaType) => {
            await client.subscribe(user, mediaType);
            if (mediaType === "video") {
              const remoteDiv = document.createElement("div");
              remoteDiv.id = user.uid;
              remoteDiv.style.width = "100%";
              remoteDiv.style.height = "100%";
              remoteContainerRef.current.appendChild(remoteDiv);
              user.videoTrack.play(remoteDiv);
            }
            if (mediaType === "audio") {
              user.audioTrack.play();
            }
          });

          client.on("user-unpublished", (user) => {
            const remoteDiv = document.getElementById(user.uid);
            if (remoteDiv) remoteDiv.remove();
          });

          client.on("user-left", (user) => {
            const remoteDiv = document.getElementById(user.uid);
            if (remoteDiv) remoteDiv.remove();
          });
        } else {
          // Fallback: use Socket.IO signaling + WebRTC peer connection
          const socket = io(API_BASE_URL);
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });

          let localStream = null;
          const isInitiatorRef = { current: false };

          const handleRemoteStream = (stream) => {
            // remove existing remote nodes
            remoteContainerRef.current.innerHTML = "";
            const remoteVideo = document.createElement("video");
            remoteVideo.autoplay = true;
            remoteVideo.playsInline = true;
            remoteVideo.srcObject = stream;
            remoteVideo.style.width = "100%";
            remoteVideo.style.height = "100%";
            remoteContainerRef.current.appendChild(remoteVideo);
          };

          pc.ontrack = (event) => {
            const [stream] = event.streams;
            handleRemoteStream(stream);
            setIsConnected(true);
            setIsLoading(false);
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit('candidate', { room: channel, candidate: event.candidate });
            }
          };

          socket.on('created', () => {
            isInitiatorRef.current = true;
          });

          socket.on('start', async () => {
            if (isInitiatorRef.current) {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('offer', { room: channel, offer: pc.localDescription });
            }
          });

          socket.on('offer', async ({ offer }) => {
            if (!isInitiatorRef.current) {
              await pc.setRemoteDescription(offer);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit('answer', { room: channel, answer: pc.localDescription });
            }
          });

          socket.on('answer', async ({ answer }) => {
            try {
              await pc.setRemoteDescription(answer);
            } catch (err) {
              console.error('Error setting remote answer:', err);
            }
          });

          socket.on('candidate', async ({ candidate }) => {
            try {
              if (candidate) await pc.addIceCandidate(candidate);
            } catch (err) {
              console.error('Error adding ICE candidate:', err);
            }
          });

          socket.on('leave', () => {
            setIsConnected(false);
            // cleanup remote
            remoteContainerRef.current.innerHTML = "";
          });

          // get local media and add to peer
          try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideoRef.current.srcObject = localStream;
            localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
            localTracksRef.current = localStream.getTracks();
          } catch (err) {
            console.error('Failed to get local media:', err);
            toast.error('Failed to access camera/microphone');
            setIsLoading(false);
            return;
          }

          // join signaling room
          socket.emit('join-room', { room: channel, uid });

          // store socket and pc for cleanup
          clientRef.current = { socket, pc };
        }
      } catch (error) {
        console.error("Failed to initialize call:", error);
        toast.error("Failed to initialize video call");
        setIsLoading(false);
      }
    };

    initCall();

    return () => {
      // Cleanup on unmount
      try {
        if (Array.isArray(localTracksRef.current)) {
          localTracksRef.current.forEach(track => {
            try { if (track.stop) track.stop(); } catch (e) {}
            try { if (track.close) track.close(); } catch (e) {}
          });
        }

        if (clientRef.current) {
          // Agora client
          if (typeof clientRef.current.leave === 'function') {
            clientRef.current.leave();
          } else if (clientRef.current.socket) {
            // signaling client
            try { clientRef.current.socket.emit('leave', { room: channel }); } catch (e) {}
            try { clientRef.current.pc && clientRef.current.pc.close(); } catch (e) {}
            try { clientRef.current.socket.disconnect(); } catch (e) {}
          }
        }
      } catch (e) {
        console.error('Error during cleanup:', e);
      }

      clientRef.current = null;
    };
  }, [channel, token, appId, uid, navigate]);

  const toggleVideo = () => {
    // Agora track
    if (token && localTracksRef.current[1] && typeof localTracksRef.current[1].setEnabled === 'function') {
      localTracksRef.current[1].setEnabled(!isVideoEnabled);
      setIsVideoEnabled(prev => !prev);
      return;
    }

    // Native MediaStreamTrack
    const videoTrack = (localTracksRef.current || []).find(t => t.kind === 'video') || localTracksRef.current[1];
    if (videoTrack) {
      videoTrack.enabled = !isVideoEnabled;
      setIsVideoEnabled(prev => !prev);
    }
  };

  const toggleAudio = () => {
    if (token && localTracksRef.current[0] && typeof localTracksRef.current[0].setEnabled === 'function') {
      localTracksRef.current[0].setEnabled(!isAudioEnabled);
      setIsAudioEnabled(prev => !prev);
      return;
    }

    const audioTrack = (localTracksRef.current || []).find(t => t.kind === 'audio') || localTracksRef.current[0];
    if (audioTrack) {
      audioTrack.enabled = !isAudioEnabled;
      setIsAudioEnabled(prev => !prev);
    }
  };

  const endCall = () => {
    try {
      if (Array.isArray(localTracksRef.current)) {
        localTracksRef.current.forEach(track => {
          try { if (track.stop) track.stop(); } catch (e) {}
          try { if (track.close) track.close(); } catch (e) {}
        });
      }

      if (clientRef.current) {
        if (typeof clientRef.current.leave === 'function') {
          clientRef.current.leave();
        } else if (clientRef.current.socket) {
          try { clientRef.current.socket.emit('leave', { room: channel }); } catch (e) {}
          try { clientRef.current.pc && clientRef.current.pc.close(); } catch (e) {}
          try { clientRef.current.socket.disconnect(); } catch (e) {}
        }
      }
    } catch (e) {
      console.error('Error ending call:', e);
    }

    clientRef.current = null;
    navigate("/appointments");
  };

  if (!channel || !token || !appId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">
          Invalid Video Call
        </h1>
        <p className="text-muted-foreground mb-6">
          Missing required parameters for the video call.
        </p>
        <Button
          onClick={() => navigate("/appointments")}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          Back to Appointments
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Video Consultation
        </h1>
        <p className="text-muted-foreground">
          {isConnected
            ? "Connected"
            : isLoading
            ? "Connecting..."
            : "Connection failed"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-emerald-400 animate-spin mb-4" />
          <p className="text-white text-lg">Loading video call components...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Local video */}
            <div className="border border-emerald-900/20 rounded-lg overflow-hidden">
              <div className="bg-emerald-900/10 px-3 py-2 text-emerald-400 text-sm font-medium">
                You
              </div>
              <div
                ref={localVideoRef}
                className="w-full h-[300px] md:h-[400px] bg-muted/30"
              >
                {!isVideoEnabled && (
                  <div className="flex items-center justify-center h-full">
                    <div className="bg-muted/20 rounded-full p-8">
                      <User className="h-12 w-12 text-emerald-400" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Remote video */}
            <div className="border border-emerald-900/20 rounded-lg overflow-hidden">
              <div className="bg-emerald-900/10 px-3 py-2 text-emerald-400 text-sm font-medium">
                Other Participant
              </div>
              <div
                ref={remoteContainerRef}
                className="w-full h-[300px] md:h-[400px] bg-muted/30"
              ></div>
            </div>
          </div>

          {/* Video controls */}
          <div className="flex justify-center space-x-4">
            <Button
              variant="outline"
              size="lg"
              onClick={toggleVideo}
              className={`rounded-full p-4 h-14 w-14 ${
                isVideoEnabled
                  ? "border-emerald-900/30"
                  : "bg-red-900/20 border-red-900/30 text-red-400"
              }`}
            >
              {isVideoEnabled ? <Video /> : <VideoOff />}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={toggleAudio}
              className={`rounded-full p-4 h-14 w-14 ${
                isAudioEnabled
                  ? "border-emerald-900/30"
                  : "bg-red-900/20 border-red-900/30 text-red-400"
              }`}
            >
              {isAudioEnabled ? <Mic /> : <MicOff />}
            </Button>

            <Button
              variant="destructive"
              size="lg"
              onClick={endCall}
              className="rounded-full p-4 h-14 w-14 bg-red-600 hover:bg-red-700"
            >
              <PhoneOff />
            </Button>
          </div>

          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              {isVideoEnabled ? "Camera on" : "Camera off"} •
              {isAudioEnabled ? " Microphone on" : " Microphone off"}
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              When you're finished with your consultation, click the red button
              to end the call
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
