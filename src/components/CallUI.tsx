// src/components/CallUI.tsx
"use client";
import { useEffect, useRef } from "react";
import type { RemotePeer, IncomingCall } from "@/hooks/useWebRTC";

// ── Video tile ────────────────────────────────────────────────
function VideoTile({ stream, name, initials, color, isMuted, isCameraOff, isLocal = false }: {
  stream: MediaStream | null;
  name: string;
  initials: string;
  color: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isLocal?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={{ position:"relative", background:"#1a1a2e", borderRadius:16, overflow:"hidden", aspectRatio:"16/9", display:"flex", alignItems:"center", justifyContent:"center" }}>
      {stream && !isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{ width:"100%", height:"100%", objectFit:"cover", transform: isLocal ? "scaleX(-1)" : "none" }}
        />
      ) : (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          <div style={{ width:64, height:64, borderRadius:20, background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:800, color:"#fff" }}>
            {initials}
          </div>
          <div style={{ fontSize:13, color:"#fff", fontWeight:600, opacity:0.8 }}>{name}</div>
        </div>
      )}

      {/* Name badge */}
      <div style={{ position:"absolute", bottom:10, left:12, display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ fontSize:12, color:"#fff", fontWeight:700, background:"rgba(0,0,0,0.5)", padding:"3px 8px", borderRadius:20 }}>
          {isLocal ? "You" : name}
        </div>
        {isMuted && <div style={{ fontSize:12, background:"rgba(220,38,38,0.8)", color:"#fff", padding:"3px 6px", borderRadius:20 }}>🔇</div>}
      </div>
    </div>
  );
}

// ── Control button ────────────────────────────────────────────
function ControlBtn({ onClick, active, danger, children, label }: {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button onClick={onClick} title={label} style={{
      width:56, height:56, borderRadius:18,
      background: danger ? "#DC2626" : active ? "#374151" : "rgba(255,255,255,0.15)",
      border:"none", cursor:"pointer", fontSize:22,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      color:"#fff", gap:2, transition:"all 0.15s",
    }}>
      {children}
      <span style={{ fontSize:9, opacity:0.7 }}>{label}</span>
    </button>
  );
}

// ── Incoming call overlay ─────────────────────────────────────
export function IncomingCallOverlay({ call, onAccept, onDecline }: {
  call: IncomingCall;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e)", borderRadius:24, padding:"40px 32px", textAlign:"center", width:300, boxShadow:"0 24px 64px rgba(0,0,0,0.5)" }}>
        {/* Caller avatar with pulse */}
        <div style={{ position:"relative", display:"inline-block", marginBottom:20 }}>
          <div style={{ position:"absolute", inset:-8, borderRadius:"50%", background:call.fromColor, opacity:0.3, animation:"pulse 1.5s infinite" }}/>
          <div style={{ width:80, height:80, borderRadius:24, background:call.fromColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:800, color:"#fff", position:"relative" }}>
            {call.fromInitials}
          </div>
        </div>

        <div style={{ color:"#fff", fontSize:18, fontWeight:700, marginBottom:4 }}>{call.fromName}</div>
        <div style={{ color:"rgba(255,255,255,0.6)", fontSize:13, marginBottom:32 }}>
          Incoming {call.type === "video" ? "📹 video" : "📞 voice"} call
        </div>

        <div style={{ display:"flex", gap:16, justifyContent:"center" }}>
          <button onClick={onDecline} style={{ width:64, height:64, borderRadius:20, background:"#DC2626", border:"none", cursor:"pointer", fontSize:26, display:"flex", alignItems:"center", justifyContent:"center" }}>
            📵
          </button>
          <button onClick={onAccept} style={{ width:64, height:64, borderRadius:20, background:"#16A34A", border:"none", cursor:"pointer", fontSize:26, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {call.type === "video" ? "📹" : "📞"}
          </button>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:0.3} 50%{transform:scale(1.15);opacity:0.15} }`}</style>
    </div>
  );
}

// ── In-call view ──────────────────────────────────────────────
export function InCallView({ localStream, remotePeers, isMuted, isCameraOff, isScreenSharing, callType, myName, myInitials, myColor, onToggleMute, onToggleCamera, onToggleScreenShare, onEndCall }: {
  localStream: MediaStream | null;
  remotePeers: Map<string, RemotePeer>;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  callType: "video" | "audio";
  myName: string;
  myInitials: string;
  myColor: string;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
}) {
  const peers = Array.from(remotePeers.values());
  const totalParticipants = peers.length + 1; // +1 for local

  // Grid layout based on participant count
  const gridCols = totalParticipants <= 2 ? 1 : 2;

  return (
    <div style={{ position:"fixed", inset:0, background:"#0f0f1a", display:"flex", flexDirection:"column", zIndex:999 }}>
      {/* Video grid */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns:`repeat(${gridCols}, 1fr)`, gap:8, padding:8, overflow:"hidden" }}>
        {/* Remote peers */}
        {peers.map(peer => (
          <VideoTile
            key={peer.userId}
            stream={peer.stream}
            name={peer.name}
            initials={peer.initials}
            color={peer.color}
            isMuted={peer.audioMuted}
            isCameraOff={peer.videoMuted}
          />
        ))}

        {/* Local video */}
        {callType === "video" ? (
          <VideoTile
            stream={localStream}
            name="You"
            initials={myInitials}
            color={myColor}
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            isLocal
          />
        ) : (
          /* Audio only — show avatar */
          <VideoTile
            stream={null}
            name="You"
            initials={myInitials}
            color={myColor}
            isMuted={isMuted}
          />
        )}
      </div>

      {/* Controls */}
      <div style={{ padding:"16px 24px 32px", display:"flex", justifyContent:"center", gap:16, background:"rgba(0,0,0,0.4)" }}>
        <ControlBtn onClick={onToggleMute} active={isMuted} label={isMuted ? "Unmute" : "Mute"}>
          {isMuted ? "🔇" : "🎤"}
        </ControlBtn>

        {callType === "video" && (
          <ControlBtn onClick={onToggleCamera} active={isCameraOff} label={isCameraOff ? "Show" : "Hide"}>
            {isCameraOff ? "📷" : "📹"}
          </ControlBtn>
        )}

        {callType === "video" && (
          <ControlBtn onClick={onToggleScreenShare} active={isScreenSharing} label={isScreenSharing ? "Stop" : "Share"}>
            🖥️
          </ControlBtn>
        )}

        <ControlBtn onClick={onEndCall} danger label="End">
          📵
        </ControlBtn>
      </div>
    </div>
  );
}
