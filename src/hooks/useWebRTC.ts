// src/hooks/useWebRTC.ts
"use client";
import { useState, useEffect, useRef, useCallback } from "react";

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
  const [callState, setCallState]         = useState<CallState>("idle");
  const [sessionId, setSessionId]         = useState<string | null>(null);
  const [channelId, setChannelId]         = useState<string | null>(null);
  const [localStream, setLocalStream]     = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers]     = useState<Map<string, RemotePeer>>(new Map());
  const [incomingCall, setIncomingCall]   = useState<IncomingCall | null>(null);
  const [isMuted, setIsMuted]             = useState(false);
  const [isCameraOff, setIsCameraOff]     = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callType, setCallType]           = useState<"video" | "audio">("video");

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef  = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSignalTime  = useRef<string>(new Date().toISOString());
  const channelIdRef    = useRef<string | null>(null);
  const sessionIdRef    = useRef<string | null>(null);
  const callStateRef    = useRef<CallState>("idle");

  // Keep refs in sync
  useEffect(() => { channelIdRef.current = channelId; }, [channelId]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  // ── Send signal via API ───────────────────────────────────────
  const sendSignal = useCallback(async (
    type: string,
    payload: unknown,
    chanId: string,
    sessId?: string,
    toUserId?: string
  ) => {
    await fetch("/api/calls/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload, channel_id: chanId, session_id: sessId, to_user_id: toUserId }),
    });
  }, []);

  // ── Create peer connection ────────────────────────────────────
  const createPeerConnection = useCallback((peerId: string, peerName: string, peerInitials: string, peerColor: string, chanId: string, sessId: string) => {
    if (peerConnections.current.has(peerId)) return peerConnections.current.get(peerId)!;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
    }

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

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("ice-candidate", { candidate: event.candidate }, chanId, sessId, peerId);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallState("connected");
      } else if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        setRemotePeers(prev => { const next = new Map(prev); next.delete(peerId); return next; });
        peerConnections.current.delete(peerId);
        if (peerConnections.current.size === 0 && callStateRef.current === "connected") {
          setCallState("ended");
        }
      }
    };

    peerConnections.current.set(peerId, pc);
    setRemotePeers(prev => {
      const next = new Map(prev);
      if (!next.has(peerId)) next.set(peerId, { userId: peerId, name: peerName, initials: peerInitials, color: peerColor, stream: null, audioMuted: false, videoMuted: false });
      return next;
    });

    return pc;
  }, [sendSignal]);

  // ── Handle a signal ──────────────────────────────────────────
  const handleSignal = useCallback(async (signal: {
    type: string; from_user_id: string; from_name: string;
    from_initials: string; from_color: string;
    to_user_id: string | null; session_id: string | null;
    channel_id: string; payload: Record<string, unknown> | null;
  }) => {
    const chanId = signal.channel_id;
    const sessId = signal.session_id ?? sessionIdRef.current ?? "";

    switch (signal.type) {
      case "call-invite": {
        if (callStateRef.current !== "idle") return;
        setIncomingCall({
          sessionId:    sessId,
          channelId:    chanId,
          fromUserId:   signal.from_user_id,
          fromName:     signal.from_name,
          fromInitials: signal.from_initials,
          fromColor:    signal.from_color,
          type:         (signal.payload?.type as "video" | "audio") ?? "video",
        });
        setCallState("incoming");
        break;
      }

      case "call-accepted": {
        const pc = createPeerConnection(signal.from_user_id, signal.from_name, signal.from_initials, signal.from_color, chanId, sessId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal("offer", { sdp: offer }, chanId, sessId, signal.from_user_id);
        break;
      }

      case "call-declined": {
        if (peerConnections.current.size === 0) cleanupCall();
        break;
      }

      case "call-ended": {
        cleanupCall();
        break;
      }

      case "peer-joined": {
        if (callStateRef.current === "connected" || callStateRef.current === "calling") {
          const pc = createPeerConnection(signal.from_user_id, signal.from_name, signal.from_initials, signal.from_color, chanId, sessId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendSignal("offer", { sdp: offer }, chanId, sessId, signal.from_user_id);
        }
        break;
      }

      case "offer": {
        const sdp = signal.payload?.sdp as RTCSessionDescriptionInit;
        const pc = createPeerConnection(signal.from_user_id, signal.from_name, signal.from_initials, signal.from_color, chanId, sessId);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal("answer", { sdp: answer }, chanId, sessId, signal.from_user_id);
        break;
      }

      case "answer": {
        const sdp = signal.payload?.sdp as RTCSessionDescriptionInit;
        const pc = peerConnections.current.get(signal.from_user_id);
        if (pc && pc.signalingState !== "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }
        break;
      }

      case "ice-candidate": {
        const candidate = signal.payload?.candidate as RTCIceCandidateInit;
        const pc = peerConnections.current.get(signal.from_user_id);
        if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        break;
      }

      case "peer-left": {
        const pc = peerConnections.current.get(signal.from_user_id);
        if (pc) { pc.close(); peerConnections.current.delete(signal.from_user_id); }
        setRemotePeers(prev => { const next = new Map(prev); next.delete(signal.from_user_id); return next; });
        if (peerConnections.current.size === 0 && callStateRef.current === "connected") setCallState("ended");
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createPeerConnection, sendSignal]);

  // ── Poll for signals ─────────────────────────────────────────
  const startPolling = useCallback((chanId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    lastSignalTime.current = new Date().toISOString();

    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/calls/signal?channel_id=${chanId}&after=${encodeURIComponent(lastSignalTime.current)}`);
        if (!res.ok) return;
        const signals = await res.json();
        if (signals.length > 0) {
          lastSignalTime.current = signals[signals.length - 1].created_at;
          for (const signal of signals) {
            await handleSignal(signal);
          }
        }
      } catch { /* silent */ }
    };

    poll();
    pollRef.current = setInterval(poll, 1000); // 1 second for calls — needs to be fast
  }, [handleSignal]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // ── Subscribe to channel (called from outside) ────────────────
  const subscribeToChannel = useCallback((chanId: string) => {
    // Reset to 10 seconds ago to catch recent call-invites
    lastSignalTime.current = new Date(Date.now() - 10000).toISOString();
    startPolling(chanId);
  }, [startPolling]);

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

  // ── Start call ────────────────────────────────────────────────
  const startCall = useCallback(async (chanId: string, type: "video" | "audio" = "video") => {
    setCallState("calling");
    setCallType(type);
    setChannelId(chanId);
    startPolling(chanId);

    await getLocalStream(type);

    const res = await fetch("/api/calls/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel_id: chanId, type }),
    });
    const data = await res.json();
    setSessionId(data.session_id);

    await sendSignal("call-invite", { type, session_id: data.session_id }, chanId, data.session_id);
  }, [getLocalStream, sendSignal, startPolling]);

  // ── Accept call ───────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    setCallState("calling");
    setCallType(incomingCall.type);
    setChannelId(incomingCall.channelId);
    setSessionId(incomingCall.sessionId);
    setIncomingCall(null);
    startPolling(incomingCall.channelId);

    await getLocalStream(incomingCall.type);

    await fetch("/api/calls/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: incomingCall.sessionId, action: "join" }),
    });

    await sendSignal("call-accepted", {}, incomingCall.channelId, incomingCall.sessionId, incomingCall.fromUserId);
    await sendSignal("peer-joined", {}, incomingCall.channelId, incomingCall.sessionId);
  }, [incomingCall, getLocalStream, sendSignal, startPolling]);

  // ── Decline call ──────────────────────────────────────────────
  const declineCall = useCallback(async () => {
    if (!incomingCall) return;
    await sendSignal("call-declined", {}, incomingCall.channelId, incomingCall.sessionId, incomingCall.fromUserId);
    setIncomingCall(null);
    setCallState("idle");
  }, [incomingCall, sendSignal]);

  // ── Cleanup ───────────────────────────────────────────────────
  const cleanupCall = useCallback(() => {
    stopPolling();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    setLocalStream(null);
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemotePeers(new Map());
    setCallState("idle");
    setSessionId(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
  }, [stopPolling]);

  // ── End call ──────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    const chanId = channelIdRef.current;
    const sessId = sessionIdRef.current;
    if (chanId && sessId) {
      await sendSignal("call-ended", {}, chanId, sessId);
      await sendSignal("peer-left", {}, chanId, sessId);
      await fetch("/api/calls/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessId, action: "leave" }),
      });
      // Cleanup old signals
      fetch(`/api/calls/signal?channel_id=${chanId}`, { method: "DELETE" });
    }
    cleanupCall();
  }, [sendSignal, cleanupCall]);

  // ── Toggle mute ───────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
  }, []);

  // ── Toggle camera ─────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsCameraOff(!track.enabled); }
  }, []);

  // ── Screen share ──────────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
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

  // Cleanup on unmount
  useEffect(() => () => {
    stopPolling();
    if (globalPollRef.current) clearInterval(globalPollRef.current);
  }, [stopPolling]);

  return {
    callState, sessionId, channelId, localStream, remotePeers,
    incomingCall, isMuted, isCameraOff, isScreenSharing, callType,
    startCall, acceptCall, declineCall, endCall,
    toggleMute, toggleCamera, toggleScreenShare,
    subscribeToChannel,
  };
}
