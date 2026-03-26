// src/components/CallContext.tsx
"use client";
import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useWebRTC, CallState, RemotePeer, IncomingCall } from "@/hooks/useWebRTC";
import { IncomingCallOverlay, InCallView } from "./CallUI";
import { useUser } from "./UserContext";

type CallContextType = {
  callState:          CallState;
  localStream:        MediaStream | null;
  remotePeers:        Map<string, RemotePeer>;
  isMuted:            boolean;
  isCameraOff:        boolean;
  isScreenSharing:    boolean;
  callType:           "video" | "audio";
  incomingCall:       IncomingCall | null;
  startCall:          (channelId: string, type?: "video" | "audio") => void;
  endCall:            () => void;
  toggleMute:         () => void;
  toggleCamera:       () => void;
  toggleScreenShare:  () => void;
  subscribeToChannel: (channelId: string) => void;
};

const CallContext = createContext<CallContextType | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { me } = useUser();

  const myName     = me ? `${me.first_name} ${me.last_name}` : "";
  const myInitials = me?.initials ?? "";
  const myColor    = me?.color ?? "#E8A5A5";
  const myEmail    = me?.email ?? "";

  const webrtc = useWebRTC({
    myUserId:   myEmail,
    myName,
    myInitials,
    myColor,
  });

  const globalPollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSignalTime  = useRef<string>(new Date(Date.now() - 5000).toISOString());
  const channelIdsRef   = useRef<string[]>([]);

  // Keep channel list in sync
  useEffect(() => {
    if (!me?.families) return;
    // Fetch all channels this user is in
    fetch("/api/messages/channels")
      .then(r => r.ok ? r.json() : [])
      .then(channels => {
        channelIdsRef.current = channels.map((c: { id: string }) => c.id);
      })
      .catch(() => {});
  }, [me?.email]);

  // Global poller — checks ALL channels for incoming call signals
  // This runs regardless of which page the user is on
  useEffect(() => {
    if (!myEmail) return;

    const poll = async () => {
      if (document.hidden) return;
      const channelIds = channelIdsRef.current;
      if (channelIds.length === 0) return;

      // Poll each channel for new signals
      for (const chanId of channelIds) {
        try {
          const res = await fetch(
            `/api/calls/signal?channel_id=${chanId}&after=${encodeURIComponent(lastSignalTime.current)}`
          );
          if (!res.ok) continue;
          const signals = await res.json();
          if (signals.length > 0) {
            lastSignalTime.current = signals[signals.length - 1].created_at;
            // Pass signals to the WebRTC hook's handler
            // Only process call-invite here — other signals handled per-channel
            for (const signal of signals) {
              if (signal.type === "call-invite") {
                // Trigger the incoming call UI by subscribing to that channel
                webrtc.subscribeToChannel(chanId);
                break;
              }
            }
          }
        } catch { /* silent */ }
      }
    };

    globalPollRef.current = setInterval(poll, 2000);
    poll();

    return () => {
      if (globalPollRef.current) clearInterval(globalPollRef.current);
    };
  }, [myEmail, webrtc.subscribeToChannel]);

  const value: CallContextType = {
    callState:          webrtc.callState,
    localStream:        webrtc.localStream,
    remotePeers:        webrtc.remotePeers,
    isMuted:            webrtc.isMuted,
    isCameraOff:        webrtc.isCameraOff,
    isScreenSharing:    webrtc.isScreenSharing,
    callType:           webrtc.callType,
    incomingCall:       webrtc.incomingCall,
    startCall:          webrtc.startCall,
    endCall:            webrtc.endCall,
    toggleMute:         webrtc.toggleMute,
    toggleCamera:       webrtc.toggleCamera,
    toggleScreenShare:  webrtc.toggleScreenShare,
    subscribeToChannel: webrtc.subscribeToChannel,
  };

  return (
    <CallContext.Provider value={value}>
      {children}

      {webrtc.incomingCall && webrtc.callState === "incoming" && (
        <IncomingCallOverlay
          call={webrtc.incomingCall}
          onAccept={webrtc.acceptCall}
          onDecline={webrtc.declineCall}
        />
      )}

      {(webrtc.callState === "connected" || webrtc.callState === "calling") && (
        <InCallView
          localStream={webrtc.localStream}
          remotePeers={webrtc.remotePeers}
          isMuted={webrtc.isMuted}
          isCameraOff={webrtc.isCameraOff}
          isScreenSharing={webrtc.isScreenSharing}
          callType={webrtc.callType}
          myName={myName}
          myInitials={myInitials}
          myColor={myColor}
          onToggleMute={webrtc.toggleMute}
          onToggleCamera={webrtc.toggleCamera}
          onToggleScreenShare={webrtc.toggleScreenShare}
          onEndCall={webrtc.endCall}
        />
      )}
    </CallContext.Provider>
  );
}
