// src/components/CallContext.tsx
"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { useWebRTC, CallState, RemotePeer, IncomingCall } from "@/hooks/useWebRTC";
import { IncomingCallOverlay, InCallView, CallPiP } from "./CallUI";
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
  isFullScreen:       boolean;
  autoAnswer:         boolean;
  setAutoAnswer:      (v: boolean) => void;
  startCall:          (channelId: string, type?: "video" | "audio", calleeName?: string, calleeInitials?: string, calleeColor?: string) => void;
  endCall:            () => void;
  toggleMute:         () => void;
  toggleCamera:       () => void;
  toggleScreenShare:  () => void;
  subscribeToChannel: (channelId: string) => void;
  setFullScreen:      (v: boolean) => void;
};

const CallContext = createContext<CallContextType | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { me } = useUser();
  const [isFullScreen, setFullScreen] = useState(true);
  const [autoAnswer, setAutoAnswer]   = useState(false);
  const [calleeName, setCalleeName]   = useState("");
  const [calleeInitials, setCalleeInitials] = useState("");
  const [calleeColor, setCalleeColor] = useState("#E8A5A5");

  const myName     = me ? `${me.first_name} ${me.last_name}` : "";
  const myInitials = me?.initials ?? "";
  const myColor    = me?.color ?? "#E8A5A5";
  const myEmail    = me?.email ?? "";

  const webrtc = useWebRTC({ myUserId: myEmail, myName, myInitials, myColor });

  const isInCall = webrtc.callState === "connected" || webrtc.callState === "calling";

  const startCall = (channelId: string, type: "video"|"audio" = "video", name = "", initials = "", color = "#E8A5A5") => {
    setCalleeName(name);
    setCalleeInitials(initials);
    setCalleeColor(color);
    webrtc.startCall(channelId, type);
    setFullScreen(true);
  };

  const value: CallContextType = {
    callState:          webrtc.callState,
    localStream:        webrtc.localStream,
    remotePeers:        webrtc.remotePeers,
    isMuted:            webrtc.isMuted,
    isCameraOff:        webrtc.isCameraOff,
    isScreenSharing:    webrtc.isScreenSharing,
    callType:           webrtc.callType,
    incomingCall:       webrtc.incomingCall,
    isFullScreen,
    autoAnswer,
    setAutoAnswer,
    startCall,
    endCall:            webrtc.endCall,
    toggleMute:         webrtc.toggleMute,
    toggleCamera:       webrtc.toggleCamera,
    toggleScreenShare:  webrtc.toggleScreenShare,
    subscribeToChannel: webrtc.subscribeToChannel,
    setFullScreen,
  };

  return (
    <CallContext.Provider value={value}>
      {children}

      {/* Incoming call */}
      {webrtc.incomingCall && webrtc.callState === "incoming" && (
        <IncomingCallOverlay
          call={webrtc.incomingCall}
          onAccept={() => { webrtc.acceptCall(); setFullScreen(true); }}
          onDecline={webrtc.declineCall}
          autoAnswerSeconds={autoAnswer ? 5 : undefined}
        />
      )}

      {/* In-call full screen */}
      {isInCall && isFullScreen && (
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
          calleeName={calleeName || webrtc.incomingCall?.fromName}
          calleeInitials={calleeInitials || webrtc.incomingCall?.fromInitials}
          calleeColor={calleeColor || webrtc.incomingCall?.fromColor}
          onToggleMute={webrtc.toggleMute}
          onToggleCamera={webrtc.toggleCamera}
          onToggleScreenShare={webrtc.toggleScreenShare}
          onEndCall={webrtc.endCall}
          onMinimize={() => setFullScreen(false)}
        />
      )}

      {/* PiP when minimized */}
      {isInCall && !isFullScreen && (
        <CallPiP
          localStream={webrtc.localStream}
          remotePeers={webrtc.remotePeers}
          callType={webrtc.callType}
          isMuted={webrtc.isMuted}
          onToggleMute={webrtc.toggleMute}
          onExpand={() => setFullScreen(true)}
          onEndCall={webrtc.endCall}
        />
      )}
    </CallContext.Provider>
  );
}
