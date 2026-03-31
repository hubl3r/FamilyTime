// src/app/dashboard/comms/page.tsx
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/components/UserContext";
import { useTheme } from "@/components/ThemeContext";
import { useCall } from "@/components/CallContext";

// ── Types ─────────────────────────────────────────────────────
type Contact = {
  user_id: string; first_name: string; last_name: string;
  initials: string; color: string; email: string;
  shared_families: { id: string; name: string }[];
};
type Message = {
  id: string; body: string | null; created_at: string; is_deleted: boolean;
  sender: { id: string; first_name: string; last_name: string; initials: string; color: string; email: string };
};
type Channel = {
  id: string; type: string; name: string | null;
  dm_contact: { first_name: string; last_name: string; initials: string; color: string; email: string } | null;
  last_message: { body: string | null; created_at: string } | null;
  unread_count: number;
};
type CallLog = {
  id: string; type: string; status: string; started_at: string;
  ended_at: string | null; duration_sec: number | null;
  initiated_by_user_id: string; channel_id: string;
};

// ── Helpers ───────────────────────────────────────────────────
function fmtTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit" });
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff < 7) return d.toLocaleDateString("en-US", { weekday:"short" });
  return d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
}

function fmtDuration(sec: number | null) {
  if (!sec) return "";
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec/60)}m ${sec%60}s`;
}

function Avatar({ initials, color, size = 44 }: { initials: string; color: string; size?: number }) {
  return (
    <div style={{ width:size, height:size, borderRadius:Math.round(size*0.28), background:color||"#E8A5A5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:Math.round(size*0.36), fontWeight:800, color:"#fff", flexShrink:0 }}>
      {initials}
    </div>
  );
}

// ── Conversation View ─────────────────────────────────────────
function ConversationView({ contact, onBack, accent, myEmail }: {
  contact: Contact; onBack: () => void; accent: string; myEmail: string;
}) {
  const { startCall, callState } = useCall();
  const [channel, setChannel]   = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const messagesEndRef           = useRef<HTMLDivElement>(null);
  const inputRef                 = useRef<HTMLTextAreaElement>(null);

  // Find or create DM channel
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      // Get all channels and find the DM with this contact
      const res = await fetch("/api/messages/channels");
      if (res.ok) {
        const channels: Channel[] = await res.json();
        const dm = channels.find(c =>
          c.type === "direct" &&
          c.dm_contact?.email === contact.email
        );
        if (dm) {
          setChannel(dm);
        } else {
          // Create DM channel
          const createRes = await fetch("/api/messages/channels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "direct", user_ids: [contact.user_id] }),
          });
          if (createRes.ok) {
            const { channel_id } = await createRes.json();
            setChannel({ id: channel_id, type: "direct", name: null, dm_contact: { first_name: contact.first_name, last_name: contact.last_name, initials: contact.initials, color: contact.color, email: contact.email }, last_message: null, unread_count: 0 });
          }
        }
      }
      setLoading(false);
    };
    init();
  }, [contact.email, contact.user_id]);

  // Poll messages
  useEffect(() => {
    if (!channel) return;
    let lastId = "";
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      if (document.hidden) return;
      const res = await fetch(`/api/messages/channels/${channel.id}`);
      if (!res.ok) return;
      const updated = await res.json();
      const latestId = updated.length > 0 ? updated[updated.length-1]?.id : "empty";
      if (latestId !== lastId) { lastId = latestId; setMessages(updated); }
    };

    poll();
    intervalId = setInterval(poll, 5000);
    fetch(`/api/messages/channels/${channel.id}`, { method: "PATCH" });

    const onVis = () => { if (!document.hidden) poll(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { if (intervalId) clearInterval(intervalId); document.removeEventListener("visibilitychange", onVis); };
  }, [channel?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !channel || sending) return;
    const draft = text.trim(); setText(""); setSending(true);
    await fetch("/api/messages/send", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ channel_id: channel.id, text: draft }),
    });
    setSending(false);
    inputRef.current?.focus();
  };

  const callDisabled = callState !== "idle";

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#fff" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:"1px solid var(--border)", background:"rgba(253,248,244,0.97)", flexShrink:0 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"var(--ink-subtle)", padding:0, flexShrink:0 }}>←</button>
        <Avatar initials={contact.initials} color={contact.color} size={38}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:800, color:"var(--ink)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {contact.first_name} {contact.last_name}
          </div>
          <div style={{ fontSize:11, color:"var(--ink-subtle)" }}>
            {contact.shared_families.map(f => f.name).join(", ")}
          </div>
        </div>
        {/* Call buttons */}
        <button onClick={() => channel && startCall(channel.id, "audio")} disabled={callDisabled || !channel}
          style={{ width:38, height:38, borderRadius:12, background:"var(--sage-light)", border:"none", cursor: callDisabled ? "not-allowed" : "pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", opacity: callDisabled ? 0.5 : 1 }}>
          📞
        </button>
        <button onClick={() => channel && startCall(channel.id, "video")} disabled={callDisabled || !channel}
          style={{ width:38, height:38, borderRadius:12, background:"var(--sky-light)", border:"none", cursor: callDisabled ? "not-allowed" : "pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", opacity: callDisabled ? 0.5 : 1 }}>
          📹
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:"var(--ink-subtle)", fontSize:13 }}>Loading...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 0" }}>
            <Avatar initials={contact.initials} color={contact.color} size={64}/>
            <div style={{ marginTop:12, fontSize:15, fontWeight:700, color:"var(--ink)" }}>{contact.first_name} {contact.last_name}</div>
            <div style={{ fontSize:13, color:"var(--ink-subtle)", marginTop:4 }}>Start your conversation</div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const prevMsg = messages[i-1];
              const isMe = msg.sender?.email === myEmail;
              const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
              const showAvatar = !prevMsg || prevMsg.sender?.id !== msg.sender?.id;
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div style={{ textAlign:"center", margin:"12px 0 8px", fontSize:11, color:"var(--ink-subtle)", fontWeight:600 }}>
                      {new Date(msg.created_at).toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })}
                    </div>
                  )}
                  <div style={{ display:"flex", flexDirection: isMe ? "row-reverse" : "row", gap:8, marginBottom: showAvatar ? 10 : 3, alignItems:"flex-end" }}>
                    {!isMe && <div style={{ width:28, flexShrink:0 }}>{showAvatar && <Avatar initials={msg.sender.initials} color={msg.sender.color} size={28}/>}</div>}
                    <div style={{ maxWidth:"75%" }}>
                      <div style={{ padding:"8px 12px", borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px", background: isMe ? accent : "#F3EDE8", color: isMe ? "#fff" : "var(--ink)", fontSize:14, lineHeight:1.5 }}>
                        {msg.body}
                      </div>
                      <div style={{ fontSize:10, color:"var(--ink-subtle)", marginTop:2, textAlign: isMe ? "right" : "left", paddingLeft:4, paddingRight:4 }}>
                        {fmtTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef}/>
          </>
        )}
      </div>

      {/* Input */}
      <div style={{ padding:"10px 12px", borderTop:"1px solid var(--border)", flexShrink:0, background:"rgba(253,248,244,0.97)" }}>
        <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
          <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="iMessage" rows={1}
            style={{ flex:1, padding:"10px 14px", border:"1.5px solid var(--border)", borderRadius:20, fontSize:14, color:"var(--ink)", background:"#fff", outline:"none", fontFamily:"inherit", resize:"none", maxHeight:100, overflowY:"auto" }}
          />
          <button onClick={send} disabled={!text.trim()||sending}
            style={{ width:38, height:38, borderRadius:"50%", border:"none", background: text.trim() ? accent : "#EDE0D8", color:"#fff", cursor: text.trim() ? "pointer" : "not-allowed", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Call Log Item ─────────────────────────────────────────────
function CallLogItem({ log, myUserId, contacts, onCall, accent }: {
  log: CallLog; myUserId: string; contacts: Contact[];
  onCall: (channelId: string, type: "audio"|"video") => void; accent: string;
}) {
  const isOutgoing = log.initiated_by_user_id === myUserId;
  const isMissed   = log.status === "ended" && !log.ended_at && !isOutgoing;

  // Find contact from channel
  const color = isMissed ? "#DC2626" : isOutgoing ? accent : "#16A34A";
  const icon  = isMissed ? "📵" : isOutgoing ? "↗️" : "↙️";
  const label = isMissed ? "Missed" : isOutgoing ? "Outgoing" : "Incoming";

  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:"1px solid var(--border)" }}>
      <div style={{ width:44, height:44, borderRadius:14, background: isMissed ? "#FEF2F2" : "#F0F9F0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
        {log.type === "video" ? "📹" : "📞"}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:700, color: isMissed ? "#DC2626" : "var(--ink)" }}>{label} {log.type} call</div>
        <div style={{ fontSize:12, color:"var(--ink-subtle)" }}>
          {fmtTime(log.started_at)}
          {log.duration_sec ? ` · ${fmtDuration(log.duration_sec)}` : ""}
        </div>
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={() => onCall(log.channel_id, "audio")}
          style={{ width:34, height:34, borderRadius:10, background:"var(--sage-light)", border:"none", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
          📞
        </button>
        <button onClick={() => onCall(log.channel_id, "video")}
          style={{ width:34, height:34, borderRadius:10, background:"var(--sky-light)", border:"none", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
          📹
        </button>
      </div>
    </div>
  );
}

// ── Main Comms Page ───────────────────────────────────────────
export default function CommsPage() {
  const { me } = useUser();
  const { theme } = useTheme();
  const { startCall, callState, subscribeToChannel } = useCall();
  const accent = theme.accent;

  const [tab, setTab]               = useState<"contacts"|"recent">("contacts");
  const [contacts, setContacts]     = useState<Contact[]>([]);
  const [channels, setChannels]     = useState<Channel[]>([]);
  const [callLogs, setCallLogs]     = useState<CallLog[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");

  const myEmail  = me?.email ?? "";

  const loadData = useCallback(async () => {
    setLoading(true);
    const [contactsRes, channelsRes] = await Promise.all([
      fetch("/api/messages/contacts"),
      fetch("/api/messages/channels"),
    ]);
    if (contactsRes.ok) setContacts(await contactsRes.json());
    if (channelsRes.ok) {
      const chs: Channel[] = await channelsRes.json();
      setChannels(chs);
      // Subscribe all channels for incoming call detection
      chs.forEach(ch => subscribeToChannel(ch.id));
    }
    setLoading(false);
  }, [subscribeToChannel]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load call logs from webrtc_sessions
  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/calls/session/history");
      if (res.ok) setCallLogs(await res.json());
    };
    load();
  }, []);

  const filteredContacts = contacts.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  // Get last message for a contact
  const getLastMessage = (contact: Contact) => {
    const dm = channels.find(ch => ch.type === "direct" && ch.dm_contact?.email === contact.email);
    return dm?.last_message ?? null;
  };

  const getUnread = (contact: Contact) => {
    const dm = channels.find(ch => ch.type === "direct" && ch.dm_contact?.email === contact.email);
    return dm?.unread_count ?? 0;
  };

  // If viewing a conversation
  if (activeContact) {
    return (
      <div style={{ position:"fixed", inset:0, top:"var(--nav-height, 0)", zIndex:200, background:"#fff" }}>
        <ConversationView
          contact={activeContact}
          onBack={() => setActiveContact(null)}
          accent={accent}
          myEmail={myEmail}
        />
      </div>
    );
  }

  return (
    <div style={{ paddingTop:16, paddingBottom:80 }}>
      {/* Page header */}
      <div style={{ marginBottom:16 }}>
        <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:500, color:"var(--ink)" }}>Comms</h1>
      </div>

      {/* Search */}
      <div style={{ marginBottom:16, position:"relative" }}>
        <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:16, pointerEvents:"none" }}>🔍</div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts..."
          style={{ width:"100%", padding:"10px 12px 10px 38px", border:"1.5px solid var(--border)", borderRadius:14, fontSize:14, color:"var(--ink)", background:"rgba(255,255,255,0.9)", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {(["contacts","recent"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:"9px", borderRadius:12, border:"none",
            background: tab === t ? accent : "rgba(255,255,255,0.8)",
            color: tab === t ? "#fff" : "var(--ink-subtle)",
            fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            boxShadow: tab === t ? "0 2px 8px rgba(100,60,60,0.15)" : "none",
          }}>
            {t === "contacts" ? "👥 Contacts" : "🕐 Recent"}
          </button>
        ))}
      </div>

      {/* Contacts tab */}
      {tab === "contacts" && (
        <div style={{ background:"rgba(255,255,255,0.85)", borderRadius:18, border:"1px solid var(--border)", overflow:"hidden" }}>
          {loading ? (
            <div style={{ padding:"32px 16px", textAlign:"center", color:"var(--ink-subtle)", fontSize:13 }}>Loading...</div>
          ) : filteredContacts.length === 0 ? (
            <div style={{ padding:"40px 16px", textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)", marginBottom:4 }}>No contacts yet</div>
              <div style={{ fontSize:13, color:"var(--ink-subtle)" }}>Invite family members to get started</div>
            </div>
          ) : (
            filteredContacts.map((contact, i) => {
              const lastMsg   = getLastMessage(contact);
              const unread    = getUnread(contact);
              const isLast    = i === filteredContacts.length - 1;
              return (
                <div key={contact.user_id}>
                  <button
                    onClick={() => setActiveContact(contact)}
                    style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}
                  >
                    <div style={{ position:"relative", flexShrink:0 }}>
                      <Avatar initials={contact.initials} color={contact.color} size={48}/>
                      {unread > 0 && (
                        <div style={{ position:"absolute", top:-2, right:-2, width:18, height:18, borderRadius:"50%", background:accent, color:"#fff", fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {unread > 9 ? "9+" : unread}
                        </div>
                      )}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div style={{ fontSize:15, fontWeight: unread > 0 ? 800 : 600, color:"var(--ink)" }}>
                          {contact.first_name} {contact.last_name}
                        </div>
                        {lastMsg && <div style={{ fontSize:11, color:"var(--ink-subtle)", flexShrink:0 }}>{fmtTime(lastMsg.created_at)}</div>}
                      </div>
                      <div style={{ fontSize:13, color:"var(--ink-subtle)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginTop:1 }}>
                        {lastMsg?.body ?? contact.email}
                      </div>
                    </div>
                    {/* Quick call buttons */}
                    <div style={{ display:"flex", gap:6, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Find or create channel then call
                          const chs: Channel[] = await fetch("/api/messages/channels").then(r=>r.json());
                          const dm = chs.find(c => c.type==="direct" && c.dm_contact?.email===contact.email);
                          if (dm) { startCall(dm.id, "audio"); return; }
                          const res = await fetch("/api/messages/channels", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ type:"direct", user_ids:[contact.user_id] }) });
                          if (res.ok) { const { channel_id } = await res.json(); startCall(channel_id, "audio"); }
                        }}
                        disabled={callState !== "idle"}
                        style={{ width:34, height:34, borderRadius:10, background:"var(--sage-light)", border:"none", cursor: callState!=="idle" ? "not-allowed" : "pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", opacity: callState!=="idle" ? 0.5 : 1 }}
                      >📞</button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const chs: Channel[] = await fetch("/api/messages/channels").then(r=>r.json());
                          const dm = chs.find(c => c.type==="direct" && c.dm_contact?.email===contact.email);
                          if (dm) { startCall(dm.id, "video"); return; }
                          const res = await fetch("/api/messages/channels", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ type:"direct", user_ids:[contact.user_id] }) });
                          if (res.ok) { const { channel_id } = await res.json(); startCall(channel_id, "video"); }
                        }}
                        disabled={callState !== "idle"}
                        style={{ width:34, height:34, borderRadius:10, background:"var(--sky-light)", border:"none", cursor: callState!=="idle" ? "not-allowed" : "pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", opacity: callState!=="idle" ? 0.5 : 1 }}
                      >📹</button>
                    </div>
                  </button>
                  {!isLast && <div style={{ height:1, background:"var(--border)", margin:"0 16px" }}/>}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Recent tab */}
      {tab === "recent" && (
        <div style={{ background:"rgba(255,255,255,0.85)", borderRadius:18, border:"1px solid var(--border)", overflow:"hidden" }}>
          {callLogs.length === 0 ? (
            <div style={{ padding:"40px 16px", textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📵</div>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)", marginBottom:4 }}>No recent calls</div>
              <div style={{ fontSize:13, color:"var(--ink-subtle)" }}>Your call history will appear here</div>
            </div>
          ) : (
            callLogs.map(log => (
              <CallLogItem
                key={log.id}
                log={log}
                myUserId={me?.email ?? ""}
                contacts={contacts}
                onCall={(channelId, type) => startCall(channelId, type)}
                accent={accent}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
