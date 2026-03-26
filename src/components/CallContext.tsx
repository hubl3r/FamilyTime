// src/components/CallContext.tsx
// Global call context — wraps the whole app so incoming calls
// show regardless of which page you're on
"use client";
import { createContext, useContext, useEffect, ReactNode } from "react";
import { useWebRTC, CallState, RemotePeer, IncomingCall } from "@/hooks/useWebRTC";
import { IncomingCallOverlay, InCallView } from "./CallUI";
import { useUser } from "./UserContext";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

  // Get current user info from me context
  const myMembership = me?.families[0];
  const myUserId     = myMembership?.family?.id ?? ""; // placeholder — will be replaced with real user_id
  const myName       = me ? `${me.first_name} ${me.last_name}` : "";
  const myInitials   = me?.initials ?? "";
  const myColor      = me?.color ?? "#E8A5A5";
  const myEmail      = me?.email ?? "";

  const webrtc = useWebRTC({
    myUserId: myEmail, // use email as stable identifier since we have it
    myName,
    myInitials,
    myColor,
  });

  // Subscribe to all channels the user is in for incoming call notifications
  useEffect(() => {
    if (!me?.families?.length) return;

    // Subscribe to each non-personal family's call channel
    const channels = me.families
      .filter(f => !(f.family as unknown as { is_personal?: boolean })?.is_personal)
      .map(f => {
        const ch = supabase
          .channel(`calls-listen:${f.family_id}`)
          .on("broadcast", { event: "signal" }, ({ payload }) => {
            if (payload.type === "call-invite" && payload.from_user_id !== myEmail) {
              // This is handled by the WebRTC hook's subscribeToChannel
              // But we need to ensure we're subscribed to the right channel
              webrtc.subscribeToChannel(payload.channel_id);
            }
          })
          .subscribe();
        return ch;
      });

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [me?.email]);

  const value: CallContextType = {
    callState:         webrtc.callState,
    localStream:       webrtc.localStream,
    remotePeers:       webrtc.remotePeers,
    isMuted:           webrtc.isMuted,
    isCameraOff:       webrtc.isCameraOff,
    isScreenSharing:   webrtc.isScreenSharing,
    callType:          webrtc.callType,
    incomingCall:      webrtc.incomingCall,
    startCall:         webrtc.startCall,
    endCall:           webrtc.endCall,
    toggleMute:        webrtc.toggleMute,
    toggleCamera:      webrtc.toggleCamera,
    toggleScreenShare: webrtc.toggleScreenShare,
    subscribeToChannel: webrtc.subscribeToChannel,
  };

  return (
    <CallContext.Provider value={value}>
      {children}

      {/* Incoming call overlay — shows on top of any page */}
      {webrtc.incomingCall && webrtc.callState === "incoming" && (
        <IncomingCallOverlay
          call={webrtc.incomingCall}
          onAccept={webrtc.acceptCall}
          onDecline={webrtc.declineCall}
        />
      )}

      {/* In-call view — fullscreen overlay when in a call */}
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
