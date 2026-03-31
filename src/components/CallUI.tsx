// src/components/CallUI.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import type { RemotePeer, IncomingCall } from "@/hooks/useWebRTC";

// ── Video tile — fills its container completely ───────────────
function VideoTile({ stream, name, initials, color, isMuted, isCameraOff, isLocal = false, fill = false }: {
  stream: MediaStream | null;
  name: string;
  initials: string;
  color: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isLocal?: boolean;
  fill?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.srcObject = null;
    }
  }, [stream, stream?.id]);

  return (
    <div style={{
      position: "relative",
      background: "#1a1a2e",
      borderRadius: fill ? 0 : 16,
      overflow: "hidden",
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {stream && !isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: isLocal ? "scaleX(-1)" : "none",
          }}
        />
      ) : (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          <div style={{ width:72, height:72, borderRadius:22, background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:800, color:"#fff" }}>
            {initials}
          </div>
          <div style={{ fontSize:14, color:"rgba(255,255,255,0.8)", fontWeight:600 }}>{name}</div>
        </div>
      )}
      {/* Name + mute badge */}
      <div style={{ position:"absolute", bottom:10, left:10, display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ fontSize:12, color:"#fff", fontWeight:700, background:"rgba(0,0,0,0.55)", padding:"3px 8px", borderRadius:20, backdropFilter:"blur(4px)" }}>
          {isLocal ? "You" : name}
        </div>
        {isMuted && <div style={{ fontSize:11, background:"rgba(220,38,38,0.85)", color:"#fff", padding:"3px 7px", borderRadius:20 }}>🔇</div>}
      </div>
    </div>
  );
}

// ── Control button ────────────────────────────────────────────
function ControlBtn({ onClick, active, danger, children, label }: {
  onClick: () => void; active?: boolean; danger?: boolean;
  children: React.ReactNode; label: string;
}) {
  return (
    <button onClick={onClick} title={label} style={{
      width:56, height:56, borderRadius:18,
      background: danger ? "#DC2626" : active ? "#374151" : "rgba(255,255,255,0.18)",
      border:"none", cursor:"pointer", fontSize:22,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      color:"#fff", gap:2, transition:"background 0.15s",
    }}>
      {children}
      <span style={{ fontSize:9, opacity:0.7, fontFamily:"sans-serif" }}>{label}</span>
    </button>
  );
}

// ── Calling screen — shown while waiting to connect ───────────
function CallingScreen({ calleeName, calleeInitials, calleeColor, callType, elapsed }: {
  calleeName: string; calleeInitials: string; calleeColor: string;
  callType: "video"|"audio"; elapsed: number;
}) {
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20, background:"linear-gradient(160deg,#1a1a2e,#0f0f18)" }}>
      {/* Pulsing avatar */}
      <div style={{ position:"relative" }}>
        <div style={{ position:"absolute", inset:-16, borderRadius:"50%", background:calleeColor, opacity:0.15, animation:"pulse 2s infinite" }}/>
        <div style={{ position:"absolute", inset:-8, borderRadius:"50%", background:calleeColor, opacity:0.1, animation:"pulse 2s infinite 0.5s" }}/>
        <div style={{ width:96, height:96, borderRadius:28, background:calleeColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, fontWeight:800, color:"#fff", position:"relative", zIndex:1 }}>
          {calleeInitials}
        </div>
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ color:"#fff", fontSize:22, fontWeight:700, marginBottom:6 }}>{calleeName}</div>
        <div style={{ color:"rgba(255,255,255,0.6)", fontSize:15 }}>
          {callType === "video" ? "📹 Video call" : "📞 Voice call"} · {timeStr}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:0.15}50%{transform:scale(1.2);opacity:0.05}}`}</style>
    </div>
  );
}

// ── Audio device selector ─────────────────────────────────────
function AudioDeviceMenu({ onClose }: { onClose: () => void }) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devs => {
      const outputs = devs.filter(d => d.kind === "audiooutput");
      setDevices(outputs);
      setSelected(outputs[0]?.deviceId ?? "");
    });
  }, []);

  const selectDevice = async (deviceId: string) => {
    setSelected(deviceId);
    // Apply to all audio elements
    document.querySelectorAll("video, audio").forEach(el => {
      if ("setSinkId" in el) {
        (el as HTMLVideoElement & { setSinkId: (id: string) => Promise<void> })
          .setSinkId(deviceId).catch(() => {});
      }
    });
    onClose();
  };

  const iconFor = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("bluetooth") || l.includes("airpod") || l.includes("headphone")) return "🎧";
    if (l.includes("speaker")) return "🔊";
    return "📱";
  };

  return (
    <div style={{ position:"absolute", bottom:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)", background:"#1e1e2e", border:"1px solid rgba(255,255,255,0.15)", borderRadius:14, padding:8, minWidth:220, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", zIndex:10 }}>
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", fontWeight:700, textTransform:"uppercase", letterSpacing:1, padding:"4px 10px 8px" }}>Audio Output</div>
      {devices.length === 0 && (
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", padding:"8px 10px" }}>No output devices found</div>
      )}
      {devices.map(d => (
        <button key={d.deviceId} onClick={() => selectDevice(d.deviceId)} style={{
          width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 10px", background: selected===d.deviceId ? "rgba(255,255,255,0.1)" : "none",
          border:"none", borderRadius:8, cursor:"pointer", color:"#fff", fontFamily:"inherit", textAlign:"left",
        }}>
          <span style={{ fontSize:18 }}>{iconFor(d.label)}</span>
          <span style={{ fontSize:13, fontWeight: selected===d.deviceId ? 700 : 400 }}>{d.label || "Default"}</span>
          {selected === d.deviceId && <span style={{ marginLeft:"auto", fontSize:14 }}>✓</span>}
        </button>
      ))}
    </div>
  );
}

// ── Incoming call overlay ─────────────────────────────────────
export function IncomingCallOverlay({ call, onAccept, onDecline, autoAnswerSeconds }: {
  call: IncomingCall; onAccept: () => void; onDecline: () => void;
  autoAnswerSeconds?: number;
}) {
  const [countdown, setCountdown] = useState(autoAnswerSeconds ?? 0);

  useEffect(() => {
    if (!autoAnswerSeconds) return;
    if (countdown <= 0) { onAccept(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, autoAnswerSeconds, onAccept]);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e)", borderRadius:28, padding:"44px 36px", textAlign:"center", width:320, boxShadow:"0 24px 64px rgba(0,0,0,0.6)" }}>
        <div style={{ position:"relative", display:"inline-block", marginBottom:24 }}>
          <div style={{ position:"absolute", inset:-10, borderRadius:"50%", background:call.fromColor, opacity:0.2, animation:"pulse2 1.5s infinite" }}/>
          <div style={{ width:88, height:88, borderRadius:26, background:call.fromColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, fontWeight:800, color:"#fff", position:"relative", zIndex:1 }}>
            {call.fromInitials}
          </div>
        </div>
        <div style={{ color:"#fff", fontSize:20, fontWeight:800, marginBottom:4 }}>{call.fromName}</div>
        <div style={{ color:"rgba(255,255,255,0.55)", fontSize:14, marginBottom: autoAnswerSeconds ? 8 : 36 }}>
          Incoming {call.type === "video" ? "📹 video" : "📞 voice"} call
        </div>
        {autoAnswerSeconds && countdown > 0 && (
          <div style={{ color:"rgba(255,255,255,0.4)", fontSize:12, marginBottom:24 }}>
            Auto-answering in {countdown}s
          </div>
        )}
        <div style={{ display:"flex", gap:20, justifyContent:"center" }}>
          <button onClick={onDecline} style={{ width:68, height:68, borderRadius:22, background:"#DC2626", border:"none", cursor:"pointer", fontSize:28, display:"flex", alignItems:"center", justifyContent:"center" }}>📵</button>
          <button onClick={onAccept}  style={{ width:68, height:68, borderRadius:22, background:"#16A34A", border:"none", cursor:"pointer", fontSize:28, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {call.type === "video" ? "📹" : "📞"}
          </button>
        </div>
      </div>
      <style>{`@keyframes pulse2{0%,100%{transform:scale(1);opacity:0.2}50%{transform:scale(1.15);opacity:0.08}}`}</style>
    </div>
  );
}

// ── In-call view ──────────────────────────────────────────────
export function InCallView({ localStream, remotePeers, isMuted, isCameraOff, isScreenSharing, callType, myName, myInitials, myColor, calleeName, calleeInitials, calleeColor, onToggleMute, onToggleCamera, onToggleScreenShare, onEndCall, onMinimize }: {
  localStream: MediaStream | null;
  remotePeers: Map<string, RemotePeer>;
  isMuted: boolean; isCameraOff: boolean; isScreenSharing: boolean;
  callType: "video"|"audio";
  myName: string; myInitials: string; myColor: string;
  calleeName?: string; calleeInitials?: string; calleeColor?: string;
  onToggleMute: () => void; onToggleCamera: () => void;
  onToggleScreenShare: () => void; onEndCall: () => void;
  onMinimize?: () => void;
}) {
  const peers = Array.from(remotePeers.values());
  const hasRemote = peers.length > 0;
  const [showAudio, setShowAudio] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Call timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = hasRemote ? `${mins}:${secs.toString().padStart(2, "0")}` : "";

  return (
    <div style={{ position:"fixed", inset:0, background:"#0f0f1a", display:"flex", flexDirection:"column", zIndex:999 }}>

      {/* Status bar */}
      <div style={{ padding:"12px 16px 8px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, background:"rgba(0,0,0,0.3)" }}>
        <div style={{ color:"rgba(255,255,255,0.7)", fontSize:13, fontWeight:600 }}>
          {hasRemote ? (callType === "video" ? "📹 Video call" : "📞 Voice call") : "Calling..."}
        </div>
        {hasRemote && (
          <div style={{ color:"rgba(255,255,255,0.6)", fontSize:13, fontWeight:700 }}>{timeStr}</div>
        )}
        {onMinimize && (
          <button onClick={onMinimize} style={{ background:"rgba(255,255,255,0.12)", border:"none", borderRadius:10, padding:"5px 10px", color:"rgba(255,255,255,0.7)", cursor:"pointer", fontSize:12, fontWeight:700 }}>
            ↙ PiP
          </button>
        )}
      </div>

      {/* Video area — fills remaining space */}
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>

        {/* Waiting to connect */}
        {!hasRemote && (
          <CallingScreen
            calleeName={calleeName ?? "..."}
            calleeInitials={calleeInitials ?? "?"}
            calleeColor={calleeColor ?? "#E8A5A5"}
            callType={callType}
            elapsed={elapsed}
          />
        )}

        {/* 1-on-1: remote fills screen */}
        {hasRemote && peers.length === 1 && (
          <div style={{ position:"absolute", inset:0 }}>
            <VideoTile
              stream={peers[0].stream}
              name={peers[0].name}
              initials={peers[0].initials}
              color={peers[0].color}
              isMuted={peers[0].audioMuted}
              fill
            />
          </div>
        )}

        {/* 2+ remote: grid */}
        {hasRemote && peers.length >= 2 && (
          <div style={{ position:"absolute", inset:0, display:"grid", gridTemplateColumns: peers.length <= 2 ? "1fr" : "1fr 1fr", gap:2 }}>
            {peers.map(peer => (
              <VideoTile key={peer.userId} stream={peer.stream} name={peer.name} initials={peer.initials} color={peer.color} isMuted={peer.audioMuted} fill/>
            ))}
          </div>
        )}

        {/* Self-view PiP — bottom right when remote is connected */}
        {hasRemote && callType === "video" && (
          <div style={{ position:"absolute", bottom:16, right:16, width:90, height:130, borderRadius:12, overflow:"hidden", border:"2px solid rgba(255,255,255,0.25)", boxShadow:"0 4px 20px rgba(0,0,0,0.5)", zIndex:5 }}>
            <VideoTile stream={localStream} name="You" initials={myInitials} color={myColor} isMuted={isMuted} isCameraOff={isCameraOff} isLocal fill/>
          </div>
        )}

        {/* Calling state: show local video preview behind the calling screen */}
        {!hasRemote && callType === "video" && localStream && (
          <div style={{ position:"absolute", inset:0, opacity:0.3 }}>
            <VideoTile stream={localStream} name="You" initials={myInitials} color={myColor} isLocal fill/>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding:"16px 16px 32px", flexShrink:0, background:"rgba(0,0,0,0.5)" }}>
        <div style={{ display:"flex", justifyContent:"center", gap:12, flexWrap:"wrap" }}>
          <ControlBtn onClick={onToggleMute} active={isMuted} label={isMuted ? "Unmute" : "Mute"}>
            {isMuted ? "🔇" : "🎤"}
          </ControlBtn>

          {callType === "video" && (
            <ControlBtn onClick={onToggleCamera} active={isCameraOff} label={isCameraOff ? "Cam On" : "Cam Off"}>
              {isCameraOff ? "📷" : "📹"}
            </ControlBtn>
          )}

          {callType === "video" && (
            <ControlBtn onClick={onToggleScreenShare} active={isScreenSharing} label={isScreenSharing ? "Stop Share" : "Share"}>
              🖥️
            </ControlBtn>
          )}

          {/* Audio output selector */}
          <div style={{ position:"relative" }}>
            <ControlBtn onClick={() => setShowAudio(v => !v)} active={showAudio} label="Audio">
              🔊
            </ControlBtn>
            {showAudio && <AudioDeviceMenu onClose={() => setShowAudio(false)}/>}
          </div>

          <ControlBtn onClick={onEndCall} danger label="End">
            📵
          </ControlBtn>
        </div>
      </div>
    </div>
  );
}

// ── PiP bubble ────────────────────────────────────────────────
export function CallPiP({ localStream, remotePeers, callType, onExpand, onEndCall, isMuted, onToggleMute }: {
  localStream: MediaStream | null;
  remotePeers: Map<string, import("@/hooks/useWebRTC").RemotePeer>;
  callType: "video"|"audio";
  onExpand: () => void; onEndCall: () => void;
  isMuted: boolean; onToggleMute: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peers = Array.from(remotePeers.values());
  const firstPeer = peers[0];
  const streamToShow = firstPeer?.stream ?? localStream;

  useEffect(() => {
    if (!videoRef.current) return;
    if (streamToShow) { videoRef.current.srcObject = streamToShow; videoRef.current.play().catch(()=>{}); }
    else videoRef.current.srcObject = null;
  }, [streamToShow, streamToShow?.id]);

  return (
    <div onClick={onExpand} style={{
      position:"fixed", bottom:90, right:16,
      width:120, height:90, borderRadius:16, overflow:"hidden",
      background:"#1a1a2e", boxShadow:"0 8px 32px rgba(0,0,0,0.4)",
      zIndex:998, cursor:"pointer", border:"2px solid rgba(255,255,255,0.2)",
    }}>
      {callType === "video" && streamToShow ? (
        <video ref={videoRef} autoPlay playsInline muted={!firstPeer} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
      ) : (
        <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:4 }}>
          <div style={{ fontSize:26 }}>📞</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", fontWeight:600 }}>
            {peers.length > 0 ? "Connected" : "Calling..."}
          </div>
        </div>
      )}
      <div style={{ position:"absolute", bottom:4, left:0, right:0, display:"flex", justifyContent:"center", gap:6 }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onToggleMute} style={{ width:26, height:26, borderRadius:8, background:"rgba(0,0,0,0.6)", border:"none", cursor:"pointer", fontSize:12, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {isMuted ? "🔇" : "🎤"}
        </button>
        <button onClick={onEndCall} style={{ width:26, height:26, borderRadius:8, background:"rgba(220,38,38,0.8)", border:"none", cursor:"pointer", fontSize:12, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
          📵
        </button>
      </div>
    </div>
  );
}
