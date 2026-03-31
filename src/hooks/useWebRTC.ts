// src/hooks/useWebRTC.ts
"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
  iceTransportPolicy: "all",
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
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
  const [waitingCall, setWaitingCall]     = useState<IncomingCall | null>(null); // call waiting while in a call
  const [isMuted, setIsMuted]             = useState(false);
  const [isCameraOff, setIsCameraOff]     = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callType, setCallType]           = useState<"video" | "audio">("video");

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef  = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const globalPollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchedChannels = useRef<Set<string>>(new Set());
  const globalLastTime  = useRef<string>(new Date(Date.now() - 10000).toISOString());
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

    // Add local tracks — ensure both audio and video are added
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    } else {
      // Pre-add transceivers so the offer includes video/audio even if stream isn't ready yet
      pc.addTransceiver("audio", { direction: "sendrecv" });
      pc.addTransceiver("video", { direction: "sendrecv" });
    }

    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      // Add the track directly — more reliable than relying on event.streams
      const track = event.track;
      // Remove existing track of same kind to avoid duplicates
      remoteStream.getTracks()
        .filter(t => t.kind === track.kind)
        .forEach(t => remoteStream.removeTrack(t));
      remoteStream.addTrack(track);

      // Also add from streams if available
      if (event.streams[0]) {
        event.streams[0].getTracks().forEach(t => {
          if (!remoteStream.getTracks().find(rt => rt.id === t.id)) {
            remoteStream.addTrack(t);
          }
        });
      }

      setRemotePeers(prev => {
        const next = new Map(prev);
        const existing = next.get(peerId);
        next.set(peerId, { ...existing!, stream: new MediaStream(remoteStream.getTracks()) });
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
        const newCall: IncomingCall = {
          sessionId:    sessId,
          channelId:    chanId,
          fromUserId:   signal.from_user_id,
          fromName:     signal.from_name,
          fromInitials: signal.from_initials,
          fromColor:    signal.from_color,
          type:         (signal.payload?.type as "video" | "audio") ?? "video",
        };
        if (callStateRef.current === "idle") {
          setIncomingCall(newCall);
          setCallState("incoming");
        } else if (callStateRef.current === "connected" || callStateRef.current === "calling") {
          // Queue as waiting call — show banner without interrupting current call
          setWaitingCall(newCall);
        }
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
    watchedChannels.current.add(chanId);

    // If already polling globally, just add channel and return
    if (globalPollRef.current) return;

    // If in a call, start per-channel fast poll too
    if (callStateRef.current !== "idle") {
      lastSignalTime.current = new Date(Date.now() - 10000).toISOString();
      startPolling(chanId);
    }

    const globalPoll = async () => {
      if (document.hidden) return;
      for (const id of watchedChannels.current) {
        try {
          const res = await fetch(`/api/calls/signal?channel_id=${id}&after=${encodeURIComponent(globalLastTime.current)}`);
          if (!res.ok) continue;
          const signals = await res.json();
          if (signals.length > 0) {
            globalLastTime.current = signals[signals.length - 1].created_at;
            for (const signal of signals) {
              await handleSignal({ ...signal, channel_id: id });
            }
          }
        } catch { /* silent */ }
      }
    };

    globalPoll();
    globalPollRef.current = setInterval(globalPoll, 2000);
  }, [startPolling, handleSignal]);

  // Note: global poll keeps running even during calls so we can detect incoming calls
  // The fast per-channel poll (startPolling) handles signaling for the active call

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
    // If already in a call, end it first
    if (callStateRef.current !== "idle") {
      await endCall();
      await new Promise(r => setTimeout(r, 600));
    }

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
    setChannelId(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);

    // Restart global poll so we can receive future incoming calls
    if (globalPollRef.current) clearInterval(globalPollRef.current);
    globalPollRef.current = null;
    globalLastTime.current = new Date(Date.now() - 5000).toISOString();

    if (watchedChannels.current.size > 0) {
      const globalPoll = async () => {
        if (document.hidden) return;
        for (const id of watchedChannels.current) {
          try {
            const res = await fetch(`/api/calls/signal?channel_id=${id}&after=${encodeURIComponent(globalLastTime.current)}`);
            if (!res.ok) continue;
            const signals = await res.json();
            if (signals.length > 0) {
              globalLastTime.current = signals[signals.length - 1].created_at;
              for (const signal of signals) await handleSignal({ ...signal, channel_id: id });
            }
          } catch { /* silent */ }
        }
      };
      globalPoll();
      globalPollRef.current = setInterval(globalPoll, 2000);
    }
  }, [stopPolling, handleSignal]);

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
  const isScreenSharingRef = useRef(false);

  const stopScreenShare = useCallback(async () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    // Restore camera
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode:"user" } });
      const videoTrack = cameraStream.getVideoTracks()[0];
      // Replace in all peer connections and renegotiate
      for (const [peerId, pc] of peerConnections.current) {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
          // Renegotiate
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendSignal("offer", { sdp: offer }, channelIdRef.current ?? "", sessionIdRef.current ?? "", peerId);
        }
      }
      // Update local stream preview
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => localStreamRef.current!.removeTrack(t));
        localStreamRef.current.addTrack(videoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
    } catch { /* silent */ }
    setIsScreenSharing(false);
    isScreenSharingRef.current = false;
  }, [sendSignal]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharingRef.current) {
      await stopScreenShare();
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as MediaTrackConstraints,
        audio: false,
      });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      // Replace track in all peer connections and renegotiate
      for (const [peerId, pc] of peerConnections.current) {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(screenTrack);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendSignal("offer", { sdp: offer }, channelIdRef.current ?? "", sessionIdRef.current ?? "", peerId);
        }
      }

      // Update local stream for self-preview
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => localStreamRef.current!.removeTrack(t));
        localStreamRef.current.addTrack(screenTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }

      // Auto-stop when user clicks browser "Stop sharing" button
      screenTrack.onended = () => stopScreenShare();
      setIsScreenSharing(true);
      isScreenSharingRef.current = true;
    } catch (e) {
      // User cancelled or not supported
      console.log("Screen share cancelled or not supported:", e);
    }
  }, [stopScreenShare, sendSignal]);

  // Cleanup on unmount
  useEffect(() => () => {
    stopPolling();
    if (globalPollRef.current) clearInterval(globalPollRef.current);
  }, [stopPolling]);

  // Accept waiting call — end current call first then accept
  const acceptWaitingCall = useCallback(async () => {
    if (!waitingCall) return;
    const pending = waitingCall;
    setWaitingCall(null);
    await endCall();
    // Small delay for cleanup
    await new Promise(r => setTimeout(r, 800));
    setIncomingCall(pending);
    setCallState("incoming");
  }, [waitingCall, endCall]);

  // Merge waiting call into current session (add as new peer)
  const mergeWaitingCall = useCallback(async () => {
    if (!waitingCall) return;
    const pending = waitingCall;
    setWaitingCall(null);
    // Signal acceptance to the waiting caller
    await sendSignal("call-accepted", {}, pending.channelId, pending.sessionId, pending.fromUserId);
    await sendSignal("peer-joined", {}, pending.channelId, pending.sessionId);
    // Join their session too
    await fetch("/api/calls/session", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: pending.sessionId, action: "join" }),
    });
  }, [waitingCall, sendSignal]);

  const declineWaitingCall = useCallback(async () => {
    if (!waitingCall) return;
    await sendSignal("call-declined", {}, waitingCall.channelId, waitingCall.sessionId, waitingCall.fromUserId);
    setWaitingCall(null);
  }, [waitingCall, sendSignal]);

  return {
    callState, sessionId, channelId, localStream, remotePeers,
    incomingCall, waitingCall, isMuted, isCameraOff, isScreenSharing, callType,
    startCall, acceptCall, declineCall, endCall,
    acceptWaitingCall, mergeWaitingCall, declineWaitingCall,
    toggleMute, toggleCamera, toggleScreenShare,
    subscribeToChannel,
  };
}
