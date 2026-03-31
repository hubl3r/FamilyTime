// src/components/CallUI.tsx
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { RemotePeer, IncomingCall } from "@/hooks/useWebRTC";

// ── Global audio sink ID ──────────────────────────────────────
let globalSinkId = "";

// ── Video tile ────────────────────────────────────────────────
function VideoTile({ stream, name, initials, color, isMuted, isCameraOff, isLocal = false }: {
  stream: MediaStream | null; name: string; initials: string; color: string;
  isMuted?: boolean; isCameraOff?: boolean; isLocal?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const attach = () => {
      if (!el) return;
      if (stream) {
        if (el.srcObject !== stream) {
          el.srcObject = stream;
        }
        // Apply audio sink
        if (!isLocal && globalSinkId && "setSinkId" in el) {
          (el as HTMLVideoElement & { setSinkId:(id:string)=>Promise<void> })
            .setSinkId(globalSinkId).catch(()=>{});
        }
        el.play().catch(()=>{});
      } else {
        el.srcObject = null;
      }
    };

    attach();

    // Reattach when page becomes visible (screen wake, tab switch)
    const onVisible = () => { if (!document.hidden) attach(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [stream, stream?.id, isLocal]);

  return (
    <div style={{ position:"relative", background:"#1a1a2e", overflow:"hidden", width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
      {stream && !isCameraOff ? (
        <video ref={videoRef} autoPlay playsInline muted={isLocal}
          style={{ width:"100%", height:"100%", objectFit:"cover", transform: isLocal ? "scaleX(-1)" : "none" }}
        />
      ) : (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          <div style={{ width:72, height:72, borderRadius:22, background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:800, color:"#fff" }}>{initials}</div>
          <div style={{ fontSize:14, color:"rgba(255,255,255,0.8)", fontWeight:600 }}>{name}</div>
        </div>
      )}
      <div style={{ position:"absolute", bottom:10, left:10, display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ fontSize:12, color:"#fff", fontWeight:700, background:"rgba(0,0,0,0.55)", padding:"3px 8px", borderRadius:20 }}>
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
      width:54, height:54, borderRadius:17,
      background: danger ? "#DC2626" : active ? "#374151" : "rgba(255,255,255,0.18)",
      border:"none", cursor:"pointer", fontSize:21,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      color:"#fff", gap:2, transition:"background 0.15s", flexShrink:0,
    }}>
      {children}
      <span style={{ fontSize:9, opacity:0.7, fontFamily:"sans-serif" }}>{label}</span>
    </button>
  );
}

// ── Calling screen ────────────────────────────────────────────
function CallingScreen({ calleeName, calleeInitials, calleeColor, callType, elapsed }: {
  calleeName: string; calleeInitials: string; calleeColor: string;
  callType: "video"|"audio"; elapsed: number;
}) {
  const mins = Math.floor(elapsed/60);
  const secs = elapsed%60;
  return (
    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20, background:"linear-gradient(160deg,#1a1a2e,#0f0f18)" }}>
      <div style={{ position:"relative" }}>
        <div style={{ position:"absolute", inset:-16, borderRadius:"50%", background:calleeColor, opacity:0.15, animation:"cpulse 2s infinite" }}/>
        <div style={{ position:"absolute", inset:-8, borderRadius:"50%", background:calleeColor, opacity:0.1, animation:"cpulse 2s infinite 0.5s" }}/>
        <div style={{ width:96, height:96, borderRadius:28, background:calleeColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, fontWeight:800, color:"#fff", position:"relative", zIndex:1 }}>
          {calleeInitials}
        </div>
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ color:"#fff", fontSize:22, fontWeight:700, marginBottom:6 }}>{calleeName}</div>
        <div style={{ color:"rgba(255,255,255,0.55)", fontSize:15 }}>
          {callType === "video" ? "📹 Video call" : "📞 Voice call"} · {mins}:{secs.toString().padStart(2,"0")}
        </div>
      </div>
      <style>{`@keyframes cpulse{0%,100%{transform:scale(1);opacity:0.15}50%{transform:scale(1.2);opacity:0.05}}`}</style>
    </div>
  );
}

// ── Audio device selector ─────────────────────────────────────
function AudioDeviceMenu({ onClose }: { onClose: () => void }) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selected, setSelected] = useState(globalSinkId);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devs => {
      const outputs = devs.filter(d => d.kind === "audiooutput");
      setDevices(outputs);
      if (!globalSinkId && outputs[0]) setSelected(outputs[0].deviceId);
    });
  }, []);

  const selectDevice = async (deviceId: string) => {
    globalSinkId = deviceId;
    setSelected(deviceId);

    // Apply to all media elements — setSinkId needs readyState > 0 on some browsers
    const apply = async (el: HTMLVideoElement) => {
      if (!("setSinkId" in el)) return;
      const sink = el as HTMLVideoElement & { setSinkId:(id:string)=>Promise<void> };
      try {
        await sink.setSinkId(deviceId);
      } catch {
        // Try after a short delay if element not ready
        setTimeout(() => sink.setSinkId(deviceId).catch(()=>{}), 500);
      }
    };

    document.querySelectorAll<HTMLVideoElement>("video, audio").forEach(el => apply(el));
    onClose();
  };

  const iconFor = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("bluetooth")||l.includes("airpod")||l.includes("wireless")||l.includes("headphone")||l.includes("headset")) return "🎧";
    if (l.includes("speaker")||l.includes("built-in")) return "🔊";
    return "📱";
  };

  return (
    <div style={{ position:"absolute", bottom:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)", background:"#1e1e2e", border:"1px solid rgba(255,255,255,0.15)", borderRadius:14, padding:8, minWidth:220, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", zIndex:10 }}
      onClick={e => e.stopPropagation()}>
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", fontWeight:700, textTransform:"uppercase", letterSpacing:1, padding:"4px 10px 8px" }}>Audio Output</div>
      {devices.length === 0 && <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", padding:"8px 10px" }}>No devices found</div>}
      {devices.map(d => (
        <button key={d.deviceId} onClick={() => selectDevice(d.deviceId)} style={{
          width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 10px",
          background: selected===d.deviceId ? "rgba(255,255,255,0.1)" : "none",
          border:"none", borderRadius:8, cursor:"pointer", color:"#fff", fontFamily:"inherit", textAlign:"left",
        }}>
          <span style={{ fontSize:18 }}>{iconFor(d.label)}</span>
          <span style={{ fontSize:13, fontWeight: selected===d.deviceId ? 700 : 400 }}>{d.label||"Default"}</span>
          {selected===d.deviceId && <span style={{ marginLeft:"auto", fontSize:14 }}>✓</span>}
        </button>
      ))}
    </div>
  );
}

// ── Draggable Self-view PiP ───────────────────────────────────
function SelfViewPiP({ stream, initials, color, isMuted, isCameraOff }: {
  stream: MediaStream | null; initials: string; color: string;
  isMuted: boolean; isCameraOff: boolean;
}) {
  const [pos, setPos] = useState({ x: -16, y: -16 }); // negative = from right/bottom
  const dragging = useRef(false);
  const startPos = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const W = 90, H = 130;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    const rect = ref.current!.getBoundingClientRect();
    startPos.current = { mx: e.clientX, my: e.clientY, px: rect.left, py: rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startPos.current.mx;
    const dy = e.clientY - startPos.current.my;
    const newX = Math.max(0, Math.min(window.innerWidth - W, startPos.current.px + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - H, startPos.current.py + dy));
    setPos({ x: newX, y: newY });
  }, []);

  const onPointerUp = useCallback(() => { dragging.current = false; }, []);

  // Convert from absolute position to render
  const style: React.CSSProperties = {
    position: "absolute",
    left: pos.x === -16 ? undefined : pos.x,
    right: pos.x === -16 ? 16 : undefined,
    top: pos.y === -16 ? undefined : pos.y,
    bottom: pos.y === -16 ? 16 : undefined,
    width: W, height: H,
    borderRadius: 12,
    overflow: "hidden",
    border: "2px solid rgba(255,255,255,0.25)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
    zIndex: 5,
    cursor: dragging.current ? "grabbing" : "grab",
    touchAction: "none",
  };

  return (
    <div ref={ref} style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}>
      <VideoTile stream={stream} name="You" initials={initials} color={color} isMuted={isMuted} isCameraOff={isCameraOff} isLocal/>
    </div>
  );
}

// ── Call waiting banner ──────────────────────────────────────
export function CallWaitingBanner({ call, onAccept, onMerge, onDecline }: {
  call: import("@/hooks/useWebRTC").IncomingCall;
  onAccept: () => void;
  onMerge: () => void;
  onDecline: () => void;
}) {
  const [show, setShow] = useState(true);

  if (!show) return null;

  return (
    <div style={{
      position:"absolute", top:12, left:12, right:12,
      background:"rgba(20,20,35,0.95)", backdropFilter:"blur(12px)",
      borderRadius:18, padding:"14px 16px",
      border:"1px solid rgba(255,255,255,0.15)",
      boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
      zIndex:20, display:"flex", alignItems:"center", gap:12,
      animation:"slideDown 0.3s ease",
    }}>
      <div style={{ width:44, height:44, borderRadius:14, background:call.fromColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:"#fff", flexShrink:0, position:"relative" }}>
        {call.fromInitials}
        <div style={{ position:"absolute", inset:-3, borderRadius:17, border:`2px solid ${call.fromColor}`, opacity:0.4, animation:"cpulse 1.5s infinite" }}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ color:"#fff", fontSize:14, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{call.fromName}</div>
        <div style={{ color:"rgba(255,255,255,0.5)", fontSize:12 }}>Incoming {call.type === "video" ? "video" : "voice"} call</div>
      </div>
      <div style={{ display:"flex", gap:8, flexShrink:0 }}>
        <button onClick={onDecline} title="Decline" style={{ width:36, height:36, borderRadius:11, background:"#DC2626", border:"none", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>📵</button>
        <button onClick={onMerge} title="Add to call" style={{ width:36, height:36, borderRadius:11, background:"#2563EB", border:"none", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>➕</button>
        <button onClick={onAccept} title="Switch to this call" style={{ width:36, height:36, borderRadius:11, background:"#16A34A", border:"none", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>📞</button>
      </div>
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}`}</style>
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
    if (!autoAnswerSeconds || countdown <= 0) { if (autoAnswerSeconds && countdown <= 0) onAccept(); return; }
    const t = setTimeout(() => setCountdown(c => c-1), 1000);
    return () => clearTimeout(t);
  }, [countdown, autoAnswerSeconds, onAccept]);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e)", borderRadius:28, padding:"44px 36px", textAlign:"center", width:320, boxShadow:"0 24px 64px rgba(0,0,0,0.6)" }}>
        <div style={{ position:"relative", display:"inline-block", marginBottom:24 }}>
          <div style={{ position:"absolute", inset:-10, borderRadius:"50%", background:call.fromColor, opacity:0.2, animation:"cpulse 1.5s infinite" }}/>
          <div style={{ width:88, height:88, borderRadius:26, background:call.fromColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, fontWeight:800, color:"#fff", position:"relative", zIndex:1 }}>
            {call.fromInitials}
          </div>
        </div>
        <div style={{ color:"#fff", fontSize:20, fontWeight:800, marginBottom:4 }}>{call.fromName}</div>
        <div style={{ color:"rgba(255,255,255,0.55)", fontSize:14, marginBottom: autoAnswerSeconds ? 8 : 36 }}>
          Incoming {call.type==="video" ? "📹 video" : "📞 voice"} call
        </div>
        {autoAnswerSeconds && countdown > 0 && (
          <div style={{ color:"rgba(255,255,255,0.4)", fontSize:12, marginBottom:24 }}>Auto-answering in {countdown}s</div>
        )}
        <div style={{ display:"flex", gap:20, justifyContent:"center" }}>
          <button onClick={onDecline} style={{ width:68, height:68, borderRadius:22, background:"#DC2626", border:"none", cursor:"pointer", fontSize:28, display:"flex", alignItems:"center", justifyContent:"center" }}>📵</button>
          <button onClick={onAccept}  style={{ width:68, height:68, borderRadius:22, background:"#16A34A", border:"none", cursor:"pointer", fontSize:28, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {call.type==="video" ? "📹" : "📞"}
          </button>
        </div>
      </div>
      <style>{`@keyframes cpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}`}</style>
    </div>
  );
}

// ── In-call view ──────────────────────────────────────────────
export function InCallView({ localStream, remotePeers, isMuted, isCameraOff, isScreenSharing, callType, myName, myInitials, myColor, calleeName, calleeInitials, calleeColor, waitingCall, onToggleMute, onToggleCamera, onToggleScreenShare, onEndCall, onMinimize, onAcceptWaiting, onMergeWaiting, onDeclineWaiting }: {
  localStream: MediaStream | null; remotePeers: Map<string, RemotePeer>;
  isMuted: boolean; isCameraOff: boolean; isScreenSharing: boolean;
  callType: "video"|"audio"; myName: string; myInitials: string; myColor: string;
  calleeName?: string; calleeInitials?: string; calleeColor?: string;
  waitingCall?: import("@/hooks/useWebRTC").IncomingCall | null;
  onToggleMute: () => void; onToggleCamera: () => void;
  onToggleScreenShare: () => void; onEndCall: () => void; onMinimize?: () => void;
  onAcceptWaiting?: () => void; onMergeWaiting?: () => void; onDeclineWaiting?: () => void;
}) {
  const peers = Array.from(remotePeers.values());
  const hasRemote = peers.length > 0;
  const [showAudio, setShowAudio] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isLandscape, setIsLandscape] = useState(false);
  const [zoom, setZoom] = useState(1);
  const lastDist = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist / lastDist.current;
      setZoom(z => Math.min(3, Math.max(1, z * delta)));
      lastDist.current = dist;
    }
  };
  const onDoubleTap = () => setZoom(z => z > 1 ? 1 : 2);

  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight * 1.2);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => { window.removeEventListener("resize", check); window.removeEventListener("orientationchange", check); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e+1), 1000);
    return () => clearInterval(t);
  }, []);

  const mins = Math.floor(elapsed/60);
  const secs = elapsed%60;
  const timeStr = hasRemote ? `${mins}:${secs.toString().padStart(2,"0")}` : "";

  // Landscape: controls on the right side; Portrait: controls at bottom
  const controlsStyle: React.CSSProperties = isLandscape
    ? { width:72, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, padding:"8px", background:"rgba(0,0,0,0.5)", flexShrink:0 }
    : { padding:"12px 16px 28px", display:"flex", justifyContent:"center", gap:12, flexWrap:"wrap", background:"rgba(0,0,0,0.5)", flexShrink:0 };

  const wrapperStyle: React.CSSProperties = isLandscape
    ? { position:"fixed", inset:0, background:"#0f0f1a", display:"flex", flexDirection:"row", zIndex:999 }
    : { position:"fixed", inset:0, background:"#0f0f1a", display:"flex", flexDirection:"column", zIndex:999 };

  return (
    <div style={wrapperStyle}>
      {/* Status bar — only in portrait */}
      {!isLandscape && (
        <div style={{ padding:"10px 16px 6px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, background:"rgba(0,0,0,0.3)" }}>
          <div style={{ color:"rgba(255,255,255,0.7)", fontSize:13, fontWeight:600 }}>
            {hasRemote ? (callType==="video" ? "📹 Video call" : "📞 Voice call") : "Calling..."}
          </div>
          {hasRemote && <div style={{ color:"rgba(255,255,255,0.6)", fontSize:13, fontWeight:700 }}>{timeStr}</div>}
  
        </div>
      )}

      {/* Video area with pinch-to-zoom */}
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onDoubleClick={onDoubleTap}>
        {/* Waiting call banner */}
        {waitingCall && onAcceptWaiting && onMergeWaiting && onDeclineWaiting && (
          <CallWaitingBanner call={waitingCall} onAccept={onAcceptWaiting} onMerge={onMergeWaiting} onDecline={onDeclineWaiting}/>
        )}
        {/* Waiting to connect */}
        {!hasRemote && (
          <CallingScreen calleeName={calleeName??"..."} calleeInitials={calleeInitials??"?"} calleeColor={calleeColor??"#E8A5A5"} callType={callType} elapsed={elapsed}/>
        )}
        {/* Dim local preview while calling */}
        {!hasRemote && callType==="video" && localStream && (
          <div style={{ position:"absolute", inset:0, opacity:0.25 }}>
            <VideoTile stream={localStream} name="You" initials={myInitials} color={myColor} isLocal/>
          </div>
        )}

        {/* 1-on-1: remote fills screen */}
        {hasRemote && peers.length===1 && (
          <div style={{ position:"absolute", inset:0, transform:`scale(${zoom})`, transformOrigin:"center center", transition:"transform 0.1s" }}>
            <VideoTile stream={peers[0].stream} name={peers[0].name} initials={peers[0].initials} color={peers[0].color} isMuted={peers[0].audioMuted}/>
          </div>
        )}
        {/* Grid for 2+ */}
        {hasRemote && peers.length>=2 && (
          <div style={{ position:"absolute", inset:0, display:"grid", gridTemplateColumns: peers.length<=2?"1fr":"1fr 1fr", gap:2, transform:`scale(${zoom})`, transformOrigin:"center center" }}>
            {peers.map(p => <VideoTile key={p.userId} stream={p.stream} name={p.name} initials={p.initials} color={p.color} isMuted={p.audioMuted}/>)}
          </div>
        )}

        {/* Self-view draggable PiP */}
        {hasRemote && callType==="video" && (
          <SelfViewPiP stream={localStream} initials={myInitials} color={myColor} isMuted={isMuted} isCameraOff={isCameraOff}/>
        )}

        {/* Audio-only remote */}
        {hasRemote && callType==="audio" && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
            {peers.map(p => (
              <div key={p.userId} style={{ textAlign:"center" }}>
                <div style={{ width:88, height:88, borderRadius:26, background:p.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:34, fontWeight:800, color:"#fff", margin:"0 auto 10px" }}>{p.initials}</div>
                <div style={{ color:"#fff", fontSize:18, fontWeight:700 }}>{p.name}</div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:13, marginTop:4 }}>{timeStr}</div>
                {p.audioMuted && <div style={{ color:"rgba(255,100,100,0.8)", fontSize:12, marginTop:4 }}>Muted</div>}
              </div>
            ))}
          </div>
        )}

        {/* Landscape status overlay */}
        {isLandscape && hasRemote && (
          <div style={{ position:"absolute", top:8, left:8, background:"rgba(0,0,0,0.5)", borderRadius:10, padding:"4px 10px" }}>
            <span style={{ color:"rgba(255,255,255,0.8)", fontSize:12, fontWeight:700 }}>{timeStr}</span>
          </div>
        )}
        {isLandscape && onMinimize && (
          <button onClick={onMinimize} style={{ position:"absolute", top:8, right:8, background:"rgba(255,255,255,0.12)", border:"none", borderRadius:10, padding:"5px 10px", color:"rgba(255,255,255,0.7)", cursor:"pointer", fontSize:12, fontWeight:700 }}>↙</button>
        )}
      </div>

      {/* Controls */}
      <div style={controlsStyle}>
        <ControlBtn onClick={onToggleMute} active={isMuted} label={isMuted?"Unmute":"Mute"}>
          {isMuted?"🔇":"🎤"}
        </ControlBtn>
        {callType==="video" && (
          <ControlBtn onClick={onToggleCamera} active={isCameraOff} label={isCameraOff?"Cam On":"Cam Off"}>
            {isCameraOff?"📷":"📹"}
          </ControlBtn>
        )}
        {callType==="video" && (
          <ControlBtn onClick={onToggleScreenShare} active={isScreenSharing} label={isScreenSharing?"Stop":"Share"}>
            🖥️
          </ControlBtn>
        )}
        <div style={{ position:"relative" }}>
          <ControlBtn onClick={() => setShowAudio(v=>!v)} active={showAudio} label="Audio">🔊</ControlBtn>
          {showAudio && <AudioDeviceMenu onClose={() => setShowAudio(false)}/>}
        </div>
        {onMinimize && (
          <ControlBtn onClick={onMinimize} label="Chat">💬</ControlBtn>
        )}
        <ControlBtn onClick={onEndCall} danger label="End">📵</ControlBtn>
      </div>
    </div>
  );
}

// ── App-level PiP bubble (draggable) ─────────────────────────
export function CallPiP({ localStream, remotePeers, callType, onExpand, onEndCall, isMuted, onToggleMute }: {
  localStream: MediaStream | null; remotePeers: Map<string, RemotePeer>;
  callType: "video"|"audio"; onExpand: () => void; onEndCall: () => void;
  isMuted: boolean; onToggleMute: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pos, setPos] = useState({ x: window.innerWidth - 136, y: window.innerHeight - 186 });
  const dragging = useRef(false);
  const startPos = useRef({ mx:0, my:0, px:0, py:0 });
  const ref = useRef<HTMLDivElement>(null);
  const W=120, H=90;

  const peers = Array.from(remotePeers.values());
  const streamToShow = peers[0]?.stream ?? localStream;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const attach = () => {
      if (streamToShow) {
        if (el.srcObject !== streamToShow) el.srcObject = streamToShow;
        el.play().catch(()=>{});
      } else {
        el.srcObject = null;
      }
    };
    attach();
    const onVisible = () => { if (!document.hidden) attach(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [streamToShow, streamToShow?.id]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    startPos.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const newX = Math.max(0, Math.min(window.innerWidth-W, startPos.current.px + e.clientX - startPos.current.mx));
    const newY = Math.max(0, Math.min(window.innerHeight-H, startPos.current.py + e.clientY - startPos.current.my));
    setPos({ x: newX, y: newY });
  };
  const onPointerUp = () => { dragging.current = false; };

  return (
    <div ref={ref} style={{ position:"fixed", left:pos.x, top:pos.y, width:W, height:H, borderRadius:16, overflow:"hidden", background:"#1a1a2e", boxShadow:"0 8px 32px rgba(0,0,0,0.4)", zIndex:998, border:"2px solid rgba(255,255,255,0.2)", cursor:"grab", touchAction:"none" }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <div onClick={onExpand} style={{ position:"absolute", inset:0 }}>
        {callType==="video" && streamToShow ? (
          <video ref={videoRef} autoPlay playsInline muted={!peers[0]} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
        ) : (
          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:4 }}>
            <div style={{ fontSize:26 }}>📞</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", fontWeight:600 }}>{peers.length>0?"Connected":"Calling..."}</div>
          </div>
        )}
      </div>
      <div style={{ position:"absolute", bottom:4, left:0, right:0, display:"flex", justifyContent:"center", gap:6 }} onClick={e=>e.stopPropagation()}>
        <button onClick={onToggleMute} style={{ width:26, height:26, borderRadius:8, background:"rgba(0,0,0,0.6)", border:"none", cursor:"pointer", fontSize:12, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {isMuted?"🔇":"🎤"}
        </button>
        <button onClick={onEndCall} style={{ width:26, height:26, borderRadius:8, background:"rgba(220,38,38,0.8)", border:"none", cursor:"pointer", fontSize:12, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>📵</button>
      </div>
    </div>
  );
}
