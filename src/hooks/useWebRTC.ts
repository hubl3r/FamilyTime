// src/hooks/useWebRTC.ts
// Manages WebRTC peer connections for group calls (mesh, up to 4 people)
// Signaling via Supabase Realtime broadcast

"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Google STUN servers — free, no signup
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export type CallState = "idle" | "calling" | "incoming" | "connected" | "ended";

export type RemotePeer = {
  userId: string;
  name: string;
  initials: string;
  color: string;
  stream: MediaStream | null;
  audioMuted: boolean;
  videoMuted: boolean;
};

export type IncomingCall = {
  sessionId: string;
  channelId: string;
  fromUserId: string;
  fromName: string;
  fromInitials: string;
  fromColor: string;
  type: "video" | "audio";
};

interface UseWebRTCProps {
  myUserId: string;
  myName: string;
  myInitials: string;
  myColor: string;
}

export function useWebRTC({ myUserId, myName, myInitials, myColor }: UseWebRTCProps) {
  const [callState, setCallState]       = useState<CallState>("idle");
  const [sessionId, setSessionId]       = useState<string | null>(null);
  const [channelId, setChannelId]       = useState<string | null>(null);
  const [localStream, setLocalStream]   = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers]   = useState<Map<string, RemotePeer>>(new Map());
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isMuted, setIsMuted]           = useState(false);
  const [isCameraOff, setIsCameraOff]   = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callType, setCallType]         = useState<"video" | "audio">("video");

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef  = useRef<MediaStream | null>(null);
  const supabaseChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // ── Helpers ──────────────────────────────────────────────────
  const sendSignal = useCallback(async (
    type: string,
    payload: unknown,
    targetChannelId: string,
    targetSessionId?: string,
    toUserId?: string
  ) => {
    await fetch("/api/calls/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        payload,
        channel_id: targetChannelId,
        session_id: targetSessionId,
        to_user_id: toUserId,
      }),
    });
  }, []);

  const createPeerConnection = useCallback((peerId: string, peerName: string, peerInitials: string, peerColor: string, chanId: string, sessId: string) => {
    if (peerConnections.current.has(peerId)) return peerConnections.current.get(peerId)!;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
      setRemotePeers(prev => {
        const next = new Map(prev);
        const existing = next.get(peerId);
        next.set(peerId, { ...existing!, stream: remoteStream });
        return next;
      });
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("ice-candidate", { candidate: event.candidate }, chanId, sessId, peerId);
      }
    };

    // Connection state
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallState("connected");
      } else if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        setRemotePeers(prev => {
          const next = new Map(prev);
          next.delete(peerId);
          return next;
        });
        peerConnections.current.delete(peerId);
        if (peerConnections.current.size === 0) setCallState("ended");
      }
    };

    peerConnections.current.set(peerId, pc);

    // Add to remote peers display
    setRemotePeers(prev => {
      const next = new Map(prev);
      if (!next.has(peerId)) {
        next.set(peerId, { userId: peerId, name: peerName, initials: peerInitials, color: peerColor, stream: null, audioMuted: false, videoMuted: false });
      }
      return next;
    });

    return pc;
  }, [sendSignal]);

  // ── Signal handler ────────────────────────────────────────────
  const handleSignal = useCallback(async (signal: {
    type: string;
    from_user_id: string;
    from_name: string;
    from_initials: string;
    from_color: string;
    to_user_id: string | null;
    session_id: string | null;
    channel_id: string | null;
    payload: unknown;
  }) => {
    if (signal.from_user_id === myUserId) return; // ignore own signals
    if (signal.to_user_id && signal.to_user_id !== myUserId) return; // not for me

    const chanId = signal.channel_id ?? channelId ?? "";
    const sessId = signal.session_id ?? sessionId ?? "";

    switch (signal.type) {
      case "call-invite": {
        const p = signal.payload as { type?: string };
        setIncomingCall({
          sessionId:    sessId,
          channelId:    chanId,
          fromUserId:   signal.from_user_id,
          fromName:     signal.from_name,
          fromInitials: signal.from_initials,
          fromColor:    signal.from_color,
          type:         (p?.type as "video" | "audio") ?? "video",
        });
        setCallState("incoming");
        break;
      }

      case "call-accepted": {
        // Someone accepted — create offer to them
        const pc = createPeerConnection(signal.from_user_id, signal.from_name, signal.from_initials, signal.from_color, chanId, sessId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal("offer", { sdp: offer }, chanId, sessId, signal.from_user_id);
        break;
      }

      case "call-declined": {
        if (peerConnections.current.size === 0) {
          endCall();
        }
        break;
      }

      case "call-ended": {
        cleanupCall();
        break;
      }

      case "peer-joined": {
        // New peer joined existing call — create offer to them
        if (callState === "connected" || callState === "calling") {
          const pc = createPeerConnection(signal.from_user_id, signal.from_name, signal.from_initials, signal.from_color, chanId, sessId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal("offer", { sdp: offer }, chanId, sessId, signal.from_user_id);
        }
        break;
      }

      case "offer": {
        const p = signal.payload as { sdp: RTCSessionDescriptionInit };
        const pc = createPeerConnection(signal.from_user_id, signal.from_name, signal.from_initials, signal.from_color, chanId, sessId);
        await pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal("answer", { sdp: answer }, chanId, sessId, signal.from_user_id);
        break;
      }

      case "answer": {
        const p = signal.payload as { sdp: RTCSessionDescriptionInit };
        const pc = peerConnections.current.get(signal.from_user_id);
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
        break;
      }

      case "ice-candidate": {
        const p = signal.payload as { candidate: RTCIceCandidateInit };
        const pc = peerConnections.current.get(signal.from_user_id);
        if (pc && p.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(p.candidate));
        }
        break;
      }

      case "peer-left": {
        const pc = peerConnections.current.get(signal.from_user_id);
        if (pc) { pc.close(); peerConnections.current.delete(signal.from_user_id); }
        setRemotePeers(prev => {
          const next = new Map(prev);
          next.delete(signal.from_user_id);
          return next;
        });
        if (peerConnections.current.size === 0) setCallState("ended");
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUserId, channelId, sessionId, callState, createPeerConnection, sendSignal]);

  // ── Subscribe to signals ──────────────────────────────────────
  const subscribeToChannel = useCallback((chanId: string) => {
    if (supabaseChannel.current) {
      supabase.removeChannel(supabaseChannel.current);
    }
    supabaseChannel.current = supabase
      .channel(`calls:${chanId}`)
      .on("broadcast", { event: "signal" }, ({ payload }) => {
        handleSignal(payload);
      })
      .subscribe();
  }, [handleSignal]);

  // Subscribe when channelId changes
  useEffect(() => {
    if (channelId) subscribeToChannel(channelId);
    return () => {
      if (supabaseChannel.current) supabase.removeChannel(supabaseChannel.current);
    };
  }, [channelId, subscribeToChannel]);

  // ── Get local media ───────────────────────────────────────────
  const getLocalStream = useCallback(async (type: "video" | "audio") => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video" ? { width: 1280, height: 720, facingMode: "user" } : false,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  // ── Start a call ──────────────────────────────────────────────
  const startCall = useCallback(async (chanId: string, type: "video" | "audio" = "video") => {
    setCallState("calling");
    setCallType(type);
    setChannelId(chanId);

    await getLocalStream(type);

    // Create session in DB
    const res = await fetch("/api/calls/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel_id: chanId, type }),
    });
    const data = await res.json();
    setSessionId(data.session_id);

    // Broadcast call invite to everyone in the channel
    await sendSignal("call-invite", { type, session_id: data.session_id }, chanId, data.session_id);
  }, [getLocalStream, sendSignal]);

  // ── Accept incoming call ──────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    setCallState("calling");
    setCallType(incomingCall.type);
    setChannelId(incomingCall.channelId);
    setSessionId(incomingCall.sessionId);
    setIncomingCall(null);

    await getLocalStream(incomingCall.type);

    // Join session in DB
    await fetch("/api/calls/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: incomingCall.sessionId, action: "join" }),
    });

    // Signal acceptance — caller will send us an offer
    await sendSignal("call-accepted", {}, incomingCall.channelId, incomingCall.sessionId, incomingCall.fromUserId);

    // Also notify any other connected peers
    await sendSignal("peer-joined", {}, incomingCall.channelId, incomingCall.sessionId);
  }, [incomingCall, getLocalStream, sendSignal]);

  // ── Decline call ─────────────────────────────────────────────
  const declineCall = useCallback(async () => {
    if (!incomingCall) return;
    await sendSignal("call-declined", {}, incomingCall.channelId, incomingCall.sessionId, incomingCall.fromUserId);
    setIncomingCall(null);
    setCallState("idle");
  }, [incomingCall, sendSignal]);

  // ── Cleanup ───────────────────────────────────────────────────
  const cleanupCall = useCallback(() => {
    // Stop all tracks
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    setLocalStream(null);

    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemotePeers(new Map());

    setCallState("idle");
    setSessionId(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
  }, []);

  // ── End call ─────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    if (sessionId && channelId) {
      await sendSignal("call-ended", {}, channelId, sessionId);
      await sendSignal("peer-left", {}, channelId, sessionId);
      await fetch("/api/calls/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, action: "leave" }),
      });
    }
    cleanupCall();
  }, [sessionId, channelId, sendSignal, cleanupCall]);

  // ── Toggle mute ───────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  // ── Toggle camera ─────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  }, []);

  // ── Screen share ──────────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen share, restore camera
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      const cameraStream = await getLocalStream(callType);
      const videoTrack = cameraStream.getVideoTracks()[0];
      peerConnections.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender && videoTrack) sender.replaceTrack(videoTrack);
      });
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        });
        // Update local stream video track for preview
        if (localStreamRef.current) {
          const oldVideo = localStreamRef.current.getVideoTracks()[0];
          if (oldVideo) localStreamRef.current.removeTrack(oldVideo);
          localStreamRef.current.addTrack(screenTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }
        screenTrack.onended = () => toggleScreenShare();
        setIsScreenSharing(true);
      } catch { /* user cancelled */ }
    }
  }, [isScreenSharing, callType, getLocalStream]);

  return {
    callState, sessionId, channelId, localStream, remotePeers,
    incomingCall, isMuted, isCameraOff, isScreenSharing, callType,
    startCall, acceptCall, declineCall, endCall,
    toggleMute, toggleCamera, toggleScreenShare,
    subscribeToChannel,
  };
}
