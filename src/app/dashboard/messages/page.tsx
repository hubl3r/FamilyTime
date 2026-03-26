// src/app/dashboard/messages/page.tsx
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/components/UserContext";
import { useCall } from "@/components/CallContext";
import { useTheme } from "@/components/ThemeContext";

type Sender = { id: string; first_name: string; last_name: string; initials: string; color: string; email: string };
type Message = { id: string; body: string | null; type: string; parent_id: string | null; is_edited: boolean; is_deleted: boolean; created_at: string; sender: Sender };
type DmContact = { first_name: string; last_name: string; initials: string; color: string; email: string };
type GroupParticipant = { first_name: string; initials: string; color: string };
type Channel = {
  id: string; name: string | null; type: string; description: string | null;
  icon: string | null; is_archived: boolean; created_at: string;
  is_family_channel: boolean; family_id: string;
  last_read_at: string | null; is_muted: boolean;
  dm_contact: DmContact | null;
  group_participants: GroupParticipant[];
  member_count: number;
  last_message: { body: string | null; created_at: string } | null;
  unread_count: number;
};
type Contact = {
  user_id: string; first_name: string; last_name: string;
  initials: string; color: string; email: string; member_id: string;
  shared_families: { id: string; name: string }[];
};

function fmtTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit" });
  return d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
}

function getChannelDisplayName(ch: Channel): string {
  if (ch.type === "direct" && ch.dm_contact)
    return `${ch.dm_contact.first_name} ${ch.dm_contact.last_name}`;
  if (ch.name) return ch.name;
  if (ch.type === "group" && ch.group_participants.length > 0)
    return ch.group_participants.map(p => p.first_name).join(", ");
  return "Unnamed";
}

function ChannelAvatar({ ch, accent, size = 40 }: { ch: Channel; accent: string; size?: number }) {
  const r = Math.round(size * 0.3);
  if (ch.type === "direct" && ch.dm_contact)
    return <div style={{ width:size, height:size, borderRadius:r, background:ch.dm_contact.color||accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:Math.round(size*0.35), fontWeight:800, color:"#fff", flexShrink:0 }}>{ch.dm_contact.initials}</div>;
  if (ch.type === "group")
    return <div style={{ width:size, height:size, borderRadius:r, background:"linear-gradient(135deg,#E8A5A5,#B5A8D4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:Math.round(size*0.45), flexShrink:0 }}>👥</div>;
  return <div style={{ width:size, height:size, borderRadius:r, background:accent+"20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:Math.round(size*0.45), flexShrink:0 }}>🏡</div>;
}

function Avatar({ sender, size = 32 }: { sender: Sender; size?: number }) {
  return <div style={{ width:size, height:size, borderRadius:Math.round(size*0.3), background:sender.color||"#E8A5A5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:Math.round(size*0.38), fontWeight:800, color:"#fff", flexShrink:0 }}>{sender.initials||sender.first_name?.[0]||"?"}</div>;
}

function ChannelRow({ ch, isActive, onClick, accent }: { ch: Channel; isActive: boolean; onClick: () => void; accent: string }) {
  return (
    <button onClick={onClick} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 16px", border:"none", textAlign:"left" as const, background: isActive ? accent+"18" : "transparent", borderLeft: isActive ? `3px solid ${accent}` : "3px solid transparent", cursor:"pointer", fontFamily:"inherit" }}>
      <ChannelAvatar ch={ch} accent={accent} size={38} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:13, fontWeight: ch.unread_count > 0 ? 800 : 600, color:"var(--ink)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{getChannelDisplayName(ch)}</div>
          {ch.last_message && <div style={{ fontSize:10, color:"var(--ink-subtle)", flexShrink:0, marginLeft:4 }}>{fmtTime(ch.last_message.created_at)}</div>}
        </div>
        <div style={{ fontSize:11, color:"var(--ink-subtle)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const, marginTop:1 }}>{ch.last_message?.body ?? "No messages yet"}</div>
      </div>
      {ch.unread_count > 0 && <div style={{ width:18, height:18, borderRadius:"50%", background:accent, color:"#fff", fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{ch.unread_count > 9 ? "9+" : ch.unread_count}</div>}
    </button>
  );
}

function NewConversationModal({ contacts, onClose, onCreate, accent, myFamilies }: {
  contacts: Contact[]; onClose: () => void; onCreate: (id: string) => void; accent: string;
  myFamilies: { family_id: string; family?: { name?: string } | null }[];
}) {
  const [type, setType] = useState<"direct"|"group"|"family">("direct");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedFamily, setSelectedFamily] = useState(myFamilies[0]?.family_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (uid: string) => setSelected(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);

  const submit = async () => {
    if (type === "direct" && selected.length !== 1) { setError("Select one person"); return; }
    if (type === "group" && selected.length < 1) { setError("Select at least one person"); return; }
    if ((type === "group" || type === "family") && !name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/messages/channels", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ type, name:name.trim()||null, user_ids:selected, family_id: type==="family" ? selectedFamily : undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); setSaving(false); return; }
      onCreate(data.channel_id); onClose();
    } catch { setError("Something went wrong"); setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(61,44,44,0.4)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", zIndex:500 }}>
      <div style={{ background:"#FDF8F4", borderRadius:"20px 20px 0 0", width:"100%", maxHeight:"88vh", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"20px 20px 0", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:600, color:"#3D2C2C" }}>New Conversation</div>
            <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#B8A8A8" }}>×</button>
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:16 }}>
            {(["direct","group","family"] as const).map(t => (
              <button key={t} onClick={() => { setType(t); setSelected([]); setName(""); }} style={{ flex:1, padding:"8px 4px", borderRadius:10, border:"none", background: type===t ? accent+"20" : "#EDE0D8", color: type===t ? accent : "#8B7070", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", outline: type===t ? `1.5px solid ${accent}` : "none" }}>
                {t === "direct" ? "💬 Direct" : t === "group" ? "👥 Group" : "🏡 Family"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowY:"auto", padding:"0 20px 40px", flex:1 }}>
          {error && <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#DC2626", marginBottom:12 }}>{error}</div>}
          {(type === "group" || type === "family") && (
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1, color:"#B8A8A8", display:"block", marginBottom:6 }}>
                {type === "family" ? "Channel Name" : "Group Name"}
              </label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={type==="family" ? "e.g. general" : "e.g. weekend-plans"}
                style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #EDE0D8", borderRadius:10, fontSize:14, color:"#3D2C2C", background:"#fff", outline:"none", fontFamily:"inherit", boxSizing:"border-box" as const }}/>
            </div>
          )}
          {type === "family" && myFamilies.length > 1 && (
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1, color:"#B8A8A8", display:"block", marginBottom:6 }}>Family Hub</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const }}>
                {myFamilies.map(f => (
                  <button key={f.family_id} onClick={() => setSelectedFamily(f.family_id)} style={{ padding:"6px 12px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:"inherit", background: selectedFamily===f.family_id ? accent : "#EDE0D8", color: selectedFamily===f.family_id ? "#fff" : "#8B7070", fontSize:12, fontWeight:700 }}>
                    {(f.family as { name?: string }|null)?.name ?? "Family"}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(type === "direct" || type === "group") && (
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1, color:"#B8A8A8", display:"block", marginBottom:8 }}>
                {type === "direct" ? "Select Person" : "Add People"}
              </label>
              {contacts.length === 0 ? (
                <div style={{ padding:"24px 0", textAlign:"center", color:"#B8A8A8", fontSize:13 }}>No contacts yet</div>
              ) : contacts.map(c => (
                <button key={c.user_id} onClick={() => toggle(c.user_id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", width:"100%", background: selected.includes(c.user_id) ? accent+"15" : "#fff", border:`1.5px solid ${selected.includes(c.user_id) ? accent : "#EDE0D8"}`, borderRadius:12, cursor:"pointer", fontFamily:"inherit", textAlign:"left" as const, marginBottom:8 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:c.color||"#E8A5A5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#fff", flexShrink:0 }}>{c.initials}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#3D2C2C" }}>{c.first_name} {c.last_name}</div>
                    <div style={{ fontSize:11, color:"#B8A8A8" }}>{c.shared_families.map(f => f.name).join(", ")}</div>
                  </div>
                  {selected.includes(c.user_id) && <span style={{ fontSize:16, color:accent }}>✓</span>}
                </button>
              ))}
            </div>
          )}
          <button onClick={submit} disabled={saving} style={{ width:"100%", padding:13, marginTop:20, background:saving?"#EDE0D8":accent, color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:800, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit" }}>
            {saving ? "Creating..." : type==="direct" ? "Open Chat" : type==="group" ? "Create Group" : "Create Channel"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { me } = useUser();
  const { theme } = useTheme();
  const accent = theme.accent;

  const [channels, setChannels]           = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [text, setText]                   = useState("");
  const [sending, setSending]             = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showNew, setShowNew]             = useState(false);
  const [showChannelMenu, setShowChannelMenu] = useState(false);
  const [confirmClear, setConfirmClear]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [contacts, setContacts]           = useState<Contact[]>([]);
  const [showSidebar, setShowSidebar]     = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  const { startCall, callState, subscribeToChannel } = useCall();

  const sharedFamilies = (me?.families ?? []).filter(
    f => !(f.family as unknown as { is_personal?: boolean })?.is_personal
  );

  const loadChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const res = await fetch("/api/messages/channels");
      if (res.ok) setChannels(await res.json());
    } finally { setLoadingChannels(false); }
  }, []);

  const loadContacts = useCallback(async () => {
    const res = await fetch("/api/messages/contacts");
    if (res.ok) setContacts(await res.json());
  }, []);

  useEffect(() => { loadChannels(); loadContacts(); }, [loadChannels, loadContacts]);

  // Subscribe to all channels for incoming call detection
  useEffect(() => {
    if (!channels.length) return;
    channels.forEach(ch => subscribeToChannel(ch.id));
  }, [channels.length, subscribeToChannel]);

  // Poll for new messages
  useEffect(() => {
    if (!activeChannel) return;
    const chId = activeChannel.id;
    let lastMessageId = "";
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/messages/channels/${chId}`);
        if (!res.ok) return;
        const updated = await res.json();
        const latestId = updated.length > 0 ? updated[updated.length-1]?.id : "empty";
        if (latestId !== lastMessageId) {
          lastMessageId = latestId;
          setMessages(updated);
          setChannels(prev => prev.map(c => c.id === chId ? { ...c, unread_count:0 } : c));
        }
      } catch { /* silent */ }
    };

    setLoadingMessages(true);
    poll().then(() => setLoadingMessages(false));
    intervalId = setInterval(poll, 5000);
    fetch(`/api/messages/channels/${chId}`, { method:"PATCH" });

    const onVisibility = () => { if (!document.hidden) poll(); };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [activeChannel?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !activeChannel || sending) return;
    const draft = text.trim();
    setText(""); setSending(true);
    try {
      await fetch("/api/messages/send", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ channel_id:activeChannel.id, text:draft }),
      });
    } finally { setSending(false); }
    inputRef.current?.focus();
  };

  const deleteMessage = async (messageId: string) => {
    await fetch("/api/messages/send", {
      method:"DELETE", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ message_id:messageId }),
    });
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const clearChat = async () => {
    if (!activeChannel) return;
    await fetch(`/api/messages/channels?channel_id=${activeChannel.id}&action=clear`, { method:"DELETE" });
    setMessages([]); setConfirmClear(false); setShowChannelMenu(false);
  };

  const deleteChannel = async () => {
    if (!activeChannel) return;
    await fetch(`/api/messages/channels?channel_id=${activeChannel.id}&action=delete`, { method:"DELETE" });
    setActiveChannel(null); setMessages([]); setConfirmDelete(false); setShowChannelMenu(false);
    await loadChannels();
  };

  const selectChannel = (ch: Channel) => {
    setActiveChannel(ch); setMessages([]);
    // Start polling for call signals on this channel
    subscribeToChannel(ch.id);
    if (window.innerWidth < 640) setShowSidebar(false);
  };

  const handleCreated = async (channelId: string) => {
    const res = await fetch("/api/messages/channels");
    if (res.ok) {
      const updated: Channel[] = await res.json();
      setChannels(updated);
      const newCh = updated.find(c => c.id === channelId);
      if (newCh) selectChannel(newCh);
    }
  };

  const totalUnread = channels.reduce((sum, c) => sum + (c.unread_count||0), 0);
  const dmAndGroup = channels.filter(c => !c.is_family_channel);
  const familyGroups = sharedFamilies.map(f => ({
    family: f,
    chs: channels.filter(c => c.is_family_channel && c.family_id === f.family_id),
  })).filter(g => g.chs.length > 0);

  return (
    <div style={{ display:"flex", height:"calc(100vh - var(--nav-height) - 64px)", overflow:"hidden", margin:"0 -16px" }}>

      {/* Sidebar */}
      {(showSidebar || !activeChannel) && (
        <div style={{ width: activeChannel ? 260 : "100%", flexShrink:0, borderRight:"1.5px solid var(--border)", display:"flex", flexDirection:"column", background:"var(--cream)" }}>
          <div style={{ padding:"16px 16px 12px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:600, color:"var(--ink)" }}>
                Messages {totalUnread > 0 && <span style={{ fontSize:12, background:accent, color:"#fff", borderRadius:20, padding:"2px 8px", marginLeft:6 }}>{totalUnread}</span>}
              </div>
              <button onClick={() => setShowNew(true)} style={{ width:32, height:32, borderRadius:10, background:accent, border:"none", cursor:"pointer", fontSize:18, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
            </div>
          </div>

          <div style={{ overflowY:"auto", flex:1 }}>
            {loadingChannels ? (
              <div style={{ padding:"32px 16px", textAlign:"center", color:"var(--ink-subtle)", fontSize:13 }}>Loading...</div>
            ) : channels.length === 0 ? (
              <div style={{ padding:"32px 16px", textAlign:"center" }}>
                <div style={{ fontSize:36, marginBottom:8 }}>💬</div>
                <div style={{ fontSize:13, color:"var(--ink-subtle)", marginBottom:12 }}>No conversations yet</div>
                <button onClick={() => setShowNew(true)} style={{ padding:"8px 16px", background:accent, color:"#fff", border:"none", borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Start one</button>
              </div>
            ) : (
              <>
                {dmAndGroup.length > 0 && (
                  <>
                    <div style={{ padding:"10px 16px 4px", fontSize:10, fontWeight:800, color:"var(--ink-subtle)", textTransform:"uppercase" as const, letterSpacing:1 }}>Direct & Groups</div>
                    {dmAndGroup.map(ch => <ChannelRow key={ch.id} ch={ch} isActive={activeChannel?.id===ch.id} onClick={() => selectChannel(ch)} accent={accent}/>)}
                  </>
                )}
                {familyGroups.map(g => (
                  <div key={g.family.family_id}>
                    <div style={{ padding:"10px 16px 4px", fontSize:10, fontWeight:800, color:"var(--ink-subtle)", textTransform:"uppercase" as const, letterSpacing:1 }}>
                      {(g.family.family as unknown as { name?: string }|null)?.name ?? "Family"}
                    </div>
                    {g.chs.map(ch => <ChannelRow key={ch.id} ch={ch} isActive={activeChannel?.id===ch.id} onClick={() => selectChannel(ch)} accent={accent}/>)}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Chat pane */}
      {activeChannel && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, background:"#fff" }}>
          {/* Chat header */}
          <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12, flexShrink:0, background:"rgba(253,248,244,0.95)" }}>
            {!showSidebar && <button onClick={() => setShowSidebar(true)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"var(--ink-subtle)", padding:0 }}>←</button>}
            <ChannelAvatar ch={activeChannel} accent={accent} size={36}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:800, color:"var(--ink)" }}>{getChannelDisplayName(activeChannel)}</div>
              {activeChannel.type !== "direct" && <div style={{ fontSize:11, color:"var(--ink-subtle)" }}>{activeChannel.member_count} people</div>}
            </div>
            {/* Call buttons */}
            <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
              <button
                onClick={() => startCall(activeChannel.id, "audio")}
                disabled={callState !== "idle"}
                title="Voice call"
                style={{ width:36, height:36, borderRadius:10, background:"rgba(168,197,160,0.2)", border:"1.5px solid #A8C5A040", cursor: callState !== "idle" ? "not-allowed" : "pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", opacity: callState !== "idle" ? 0.5 : 1 }}
              >📞</button>
              <button
                onClick={() => startCall(activeChannel.id, "video")}
                disabled={callState !== "idle"}
                title="Video call"
                style={{ width:36, height:36, borderRadius:10, background:"rgba(168,197,160,0.2)", border:"1.5px solid #A8C5A040", cursor: callState !== "idle" ? "not-allowed" : "pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", opacity: callState !== "idle" ? 0.5 : 1 }}
              >📹</button>
            </div>
            <div style={{ position:"relative" }}>
              <button onClick={() => { setShowChannelMenu(v => !v); setConfirmClear(false); setConfirmDelete(false); }} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"var(--ink-subtle)", padding:"4px 8px", borderRadius:8 }}>⋯</button>
              {showChannelMenu && (
                <div style={{ position:"absolute", right:0, top:"calc(100% + 4px)", background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:6, minWidth:180, boxShadow:"0 8px 24px rgba(100,60,60,0.12)", zIndex:300 }}>
                  {!confirmClear && !confirmDelete && (
                    <>
                      <button onClick={() => setConfirmClear(true)} style={{ width:"100%", padding:"10px 14px", background:"none", border:"none", textAlign:"left" as const, fontSize:13, fontWeight:600, color:"var(--ink)", cursor:"pointer", borderRadius:10, fontFamily:"inherit" }}>🧹 Clear chat history</button>
                      <button onClick={() => setConfirmDelete(true)} style={{ width:"100%", padding:"10px 14px", background:"none", border:"none", textAlign:"left" as const, fontSize:13, fontWeight:600, color:"#C97B7B", cursor:"pointer", borderRadius:10, fontFamily:"inherit" }}>🗑️ Delete channel</button>
                    </>
                  )}
                  {confirmClear && (
                    <div style={{ padding:"8px 10px" }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"var(--ink)", marginBottom:8 }}>Clear all messages?</div>
                      <div style={{ fontSize:11, color:"var(--ink-subtle)", marginBottom:10 }}>Cannot be undone.</div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => setConfirmClear(false)} style={{ flex:1, padding:"7px", background:"#fff", border:"1.5px solid var(--border)", borderRadius:8, fontSize:12, fontWeight:700, color:"var(--ink-subtle)", cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
                        <button onClick={clearChat} style={{ flex:1, padding:"7px", background:"#E8A5A5", border:"none", borderRadius:8, fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer", fontFamily:"inherit" }}>Clear</button>
                      </div>
                    </div>
                  )}
                  {confirmDelete && (
                    <div style={{ padding:"8px 10px" }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#C97B7B", marginBottom:8 }}>Delete this channel?</div>
                      <div style={{ fontSize:11, color:"var(--ink-subtle)", marginBottom:10 }}>All messages permanently removed.</div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => setConfirmDelete(false)} style={{ flex:1, padding:"7px", background:"#fff", border:"1.5px solid var(--border)", borderRadius:8, fontSize:12, fontWeight:700, color:"var(--ink-subtle)", cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
                        <button onClick={deleteChannel} style={{ flex:1, padding:"7px", background:"#C97B7B", border:"none", borderRadius:8, fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer", fontFamily:"inherit" }}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"16px" }}>
            {loadingMessages ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:"var(--ink-subtle)", fontSize:13 }}>Loading messages...</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0" }}>
                <div style={{ fontSize:36, marginBottom:12 }}>👋</div>
                <div style={{ fontSize:14, fontWeight:700, color:"var(--ink)", marginBottom:4 }}>Start the conversation</div>
                <div style={{ fontSize:13, color:"var(--ink-subtle)" }}>Be the first to say something!</div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => {
                  const prevMsg = messages[i-1];
                  const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
                  const showAvatar = !prevMsg || prevMsg.sender?.id !== msg.sender?.id;
                  const isMe = msg.sender?.email === me?.email;
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div style={{ textAlign:"center", margin:"16px 0 8px", fontSize:11, color:"var(--ink-subtle)", fontWeight:600 }}>
                          {new Date(msg.created_at).toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })}
                        </div>
                      )}
                      <div style={{ display:"flex", flexDirection: isMe ? "row-reverse" : "row", gap:8, marginBottom: showAvatar ? 12 : 4, alignItems:"flex-end" }}>
                        {!isMe && <div style={{ width:32, flexShrink:0 }}>{showAvatar && msg.sender && <Avatar sender={msg.sender} size={32}/>}</div>}
                        <div style={{ maxWidth:"72%", minWidth:0 }}>
                          {showAvatar && !isMe && msg.sender && (
                            <div style={{ fontSize:11, fontWeight:700, color:"var(--ink-subtle)", marginBottom:3, paddingLeft:4 }}>{msg.sender.first_name} {msg.sender.last_name}</div>
                          )}
                          <div style={{ padding:"8px 12px", borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px", background: isMe ? accent : "#F3EDE8", color: isMe ? "#fff" : "var(--ink)", fontSize:14, lineHeight:1.5 }}>
                            {msg.body}
                          </div>
                          <div style={{ fontSize:10, color:"var(--ink-subtle)", marginTop:3, textAlign: isMe ? "right" : "left", paddingLeft:4, paddingRight:4 }}>
                            {fmtTime(msg.created_at)}{msg.is_edited && " · edited"}
                            {isMe && <button onClick={() => deleteMessage(msg.id)} style={{ marginLeft:8, background:"none", border:"none", fontSize:10, color:"var(--ink-subtle)", cursor:"pointer", padding:0, fontFamily:"inherit" }}>delete</button>}
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
          <div style={{ padding:"12px 16px", borderTop:"1px solid var(--border)", flexShrink:0, background:"rgba(253,248,244,0.95)" }}>
            <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
              <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a message... (Enter to send)" rows={1}
                style={{ flex:1, padding:"10px 14px", border:"1.5px solid var(--border)", borderRadius:16, fontSize:14, color:"var(--ink)", background:"#fff", outline:"none", fontFamily:"inherit", resize:"none" as const, maxHeight:120, overflowY:"auto" as const }}
              />
              <button onClick={sendMessage} disabled={!text.trim()||sending} style={{ width:42, height:42, borderRadius:12, border:"none", background: text.trim() ? accent : "#EDE0D8", color:"#fff", cursor: text.trim() ? "pointer" : "not-allowed", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>↑</button>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <NewConversationModal contacts={contacts} onClose={() => setShowNew(false)} onCreate={handleCreated} accent={accent} myFamilies={sharedFamilies}/>
      )}
    </div>
  );
}
