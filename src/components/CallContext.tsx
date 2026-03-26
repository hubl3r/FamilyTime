// src/components/CallContext.tsx
"use client";
import { createContext, useContext, useEffect, ReactNode } from "react";
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

  // Subscribe to all shared family channels for incoming call signals
  useEffect(() => {
    if (!me?.families?.length) return;

    // We need to poll for call-invite signals across all channels the user is in
    // Start polling on the first shared family's channels
    const sharedFamilies = me.families.filter(
      f => !(f.family as unknown as { is_personal?: boolean })?.is_personal
    );

    if (sharedFamilies.length > 0) {
      // Poll a global "inbox" endpoint for incoming calls
      // For now subscribe to each family's signal channel
      // The actual channel subscription happens when a call starts
    }
  }, [me?.email]);

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
