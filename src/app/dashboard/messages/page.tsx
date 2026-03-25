// src/app/dashboard/messages/page.tsx
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/components/UserContext";
import { useTheme } from "@/components/ThemeContext";
// ── Types ─────────────────────────────────────────────────────
type Sender = { id: string; first_name: string; last_name: string; initials: string; color: string; email: string };
type Message = { id: string; body: string | null; type: string; parent_id: string | null; is_edited: boolean; is_deleted: boolean; created_at: string; sender: Sender };
type Channel = {
  id: string; name: string | null; type: string; description: string | null;
  icon: string | null; is_archived: boolean; created_at: string;
  last_read_at: string | null; is_muted: boolean;
  last_message: { body: string | null; created_at: string; sender: Sender } | null;
  unread_count: number;
};
type FamilyMember = { id: string; first_name: string; last_name: string; initials: string; color: string; email: string };

// ── Helpers ───────────────────────────────────────────────────
function fmtTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getChannelName(channel: Channel, members: FamilyMember[], myMemberId: string): string {
  if (channel.name) return channel.name;
  if (channel.type === "direct") {
    const other = members.find(m => m.id !== myMemberId);
    return other ? `${other.first_name} ${other.last_name}` : "Direct Message";
  }
  return "Unnamed Channel";
}

function getChannelIcon(channel: Channel) {
  if (channel.icon) return channel.icon;
  if (channel.type === "direct") return "💬";
  if (channel.type === "family") return "🏡";
  return "👥";
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ sender, size = 32 }: { sender: Sender; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.3),
      background: sender.color || "#E8A5A5",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.38), fontWeight: 800, color: "#fff",
      flexShrink: 0,
    }}>
      {sender.initials || sender.first_name?.[0] || "?"}
    </div>
  );
}

// ── New Channel Modal ─────────────────────────────────────────
function NewChannelModal({ members, myMemberId, familyId, onClose, onCreate, accent }: {
  members: FamilyMember[]; myMemberId: string; familyId: string;
  onClose: () => void; onCreate: (channelId: string) => void; accent: string;
}) {
  const [type, setType] = useState<"family" | "group" | "direct">("family");
  const [name, setName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const otherMembers = members.filter(m => m.id !== myMemberId);

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const submit = async () => {
    if (type !== "direct" && !name.trim()) { setError("Channel name is required"); return; }
    if (type === "direct" && selectedMembers.length !== 1) { setError("Select exactly one person for a direct message"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/messages/channels?family_id=${familyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name: name.trim() || null, member_ids: selectedMembers }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create"); setSaving(false); return; }
      onCreate(data.channel_id);
      onClose();
    } catch { setError("Something went wrong"); setSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(61,44,44,0.4)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", zIndex:500 }}>
      <div style={{ background:"#FDF8F4", borderRadius:"20px 20px 0 0", width:"100%", maxHeight:"85vh", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"20px 20px 0", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:600, color:"#3D2C2C" }}>New Conversation</div>
            <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#B8A8A8" }}>×</button>
          </div>
          {/* Type selector */}
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            {(["direct","family","group"] as const).map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                flex:1, padding:"8px 4px", borderRadius:10, border:"none",
                background: type === t ? accent + "20" : "#EDE0D8",
                color: type === t ? accent : "#8B7070",
                fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                outline: type === t ? `1.5px solid ${accent}` : "none",
              }}>
                {t === "direct" ? "💬 Direct" : t === "family" ? "🏡 Family" : "👥 Group"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowY:"auto", padding:"0 20px 40px", flex:1 }}>
          {error && <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#DC2626", marginBottom:12 }}>{error}</div>}

          {type !== "direct" && (
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1, color:"#B8A8A8", display:"block", marginBottom:6 }}>Channel Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={type === "family" ? "e.g. general" : "e.g. weekend-plans"}
                style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #EDE0D8", borderRadius:10, fontSize:14, color:"#3D2C2C", background:"#fff", outline:"none", fontFamily:"inherit", boxSizing:"border-box" as const }}
              />
            </div>
          )}

          {(type === "direct" || type === "group") && (
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1, color:"#B8A8A8", display:"block", marginBottom:8 }}>
                {type === "direct" ? "Select Person" : "Add Members"}
              </label>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {otherMembers.map(m => (
                  <button key={m.id} onClick={() => toggleMember(m.id)} style={{
                    display:"flex", alignItems:"center", gap:12, padding:"10px 12px",
                    background: selectedMembers.includes(m.id) ? accent + "15" : "#fff",
                    border: `1.5px solid ${selectedMembers.includes(m.id) ? accent : "#EDE0D8"}`,
                    borderRadius:12, cursor:"pointer", fontFamily:"inherit", textAlign:"left" as const,
                  }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:m.color||"#E8A5A5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#fff", flexShrink:0 }}>
                      {m.initials}
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#3D2C2C" }}>{m.first_name} {m.last_name}</div>
                      <div style={{ fontSize:12, color:"#B8A8A8" }}>{m.email}</div>
                    </div>
                    {selectedMembers.includes(m.id) && <span style={{ marginLeft:"auto", fontSize:16 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={submit} disabled={saving} style={{
            width:"100%", padding:13, marginTop:20,
            background: saving ? "#EDE0D8" : accent,
            color:"#fff", border:"none", borderRadius:12,
            fontSize:15, fontWeight:800, cursor: saving ? "not-allowed" : "pointer", fontFamily:"inherit",
          }}>
            {saving ? "Creating..." : type === "direct" ? "Open Chat" : "Create Channel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function MessagesPage() {
  const { me, currentContext } = useUser();
  const { theme } = useTheme();
  const accent = theme.accent;

  const [channels, setChannels]           = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [text, setText]                   = useState("");
  const [sending, setSending]             = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showChannelMenu, setShowChannelMenu] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteChannel, setConfirmDeleteChannel] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showSidebar, setShowSidebar]     = useState(true);

  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const inputRef         = useRef<HTMLTextAreaElement>(null);
  const activeChannelRef = useRef<Channel | null>(null);
  const currentContextRef = useRef<string>("");

  // Current member ID in this family
  const myMembership = me?.families.find(f => f.family_id === currentContext);
  const myMemberId   = myMembership?.member_id ?? "";
  const fp           = `family_id=${currentContext}`;

  // Keep refs fresh so realtime callbacks always have latest values
  useEffect(() => { activeChannelRef.current = activeChannel; }, [activeChannel]);
  useEffect(() => { currentContextRef.current = currentContext ?? ""; }, [currentContext]);

  // Load channels
  const loadChannels = useCallback(async () => {
    if (!currentContext || currentContext === "personal") return;
    setLoadingChannels(true);
    try {
      const res = await fetch(`/api/messages/channels?${fp}`);
      if (res.ok) setChannels(await res.json());
    } finally { setLoadingChannels(false); }
  }, [currentContext]);

  // Load family members for new channel modal
  const loadMembers = useCallback(async () => {
    if (!currentContext || currentContext === "personal") return;
    const res = await fetch(`/api/members?${fp}`);
    if (res.ok) setFamilyMembers(await res.json());
  }, [currentContext]);

  useEffect(() => { loadChannels(); loadMembers(); }, [loadChannels, loadMembers]);

  // Load messages for active channel
  const loadMessages = useCallback(async (channel: Channel) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages/channels/${channel.id}?${fp}`);
      if (res.ok) setMessages(await res.json());
    } finally { setLoadingMessages(false); }
    // Mark as read
    fetch(`/api/messages/channels/${channel.id}?${fp}`, { method: "PATCH" });
    // Update local unread count
    setChannels(prev => prev.map(c => c.id === channel.id ? { ...c, unread_count: 0 } : c));
  }, [fp]);

  useEffect(() => {
    if (activeChannel) loadMessages(activeChannel);
  }, [activeChannel]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages — pauses when tab is hidden to save DB queries
  useEffect(() => {
    if (!activeChannel || !currentContext) return;

    const chId  = activeChannel.id;
    const famId = currentContext;
    let lastMessageId = "";
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/messages/channels/${chId}?family_id=${famId}`);
        if (!res.ok) return;
        const updated = await res.json();
        const latestId = updated.length > 0 ? updated[updated.length - 1]?.id : "empty";
        if (latestId !== lastMessageId) {
          lastMessageId = latestId;
          setMessages(updated);
        }
      } catch { /* silent */ }
    };

    // Poll immediately, then every 5 seconds
    poll();
    intervalId = setInterval(poll, 5000);

    const onVisibility = () => { if (!document.hidden) poll(); };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [activeChannel?.id, currentContext]);

  // Send message
  const sendMessage = async () => {
    if (!text.trim() || !activeChannel || sending) return;
    const draft = text.trim();
    setText("");
    setSending(true);
    try {
      await fetch(`/api/messages/send?${fp}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: activeChannel.id, text: draft }),
      });
      // Message will appear via Realtime subscription
    } finally { setSending(false); }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const deleteMessage = async (messageId: string) => {
    await fetch(`/api/messages/send?${fp}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: messageId }),
    });
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true, body: null } : m));
  };

  const clearChat = async () => {
    if (!activeChannel) return;
    await fetch(`/api/messages/channels?${fp}&channel_id=${activeChannel.id}&action=clear`, { method: "DELETE" });
    setMessages([]); // Just empty — deleted messages are filtered server-side on next fetch
    setConfirmClear(false);
    setShowChannelMenu(false);
  };

  const deleteChannel = async () => {
    if (!activeChannel) return;
    await fetch(`/api/messages/channels?${fp}&channel_id=${activeChannel.id}&action=delete`, { method: "DELETE" });
    setActiveChannel(null);
    setMessages([]);
    setConfirmDeleteChannel(false);
    setShowChannelMenu(false);
    await loadChannels();
  };

  const selectChannel = (ch: Channel) => {
    setActiveChannel(ch);
    setMessages([]);
    if (window.innerWidth < 640) setShowSidebar(false);
  };

  const totalUnread = channels.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  if (!currentContext || currentContext === "personal") {
    return (
      <div style={{ padding:"60px 0", textAlign:"center", color:"var(--ink-subtle)" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>💬</div>
        <div style={{ fontSize:15, fontWeight:700, color:"var(--ink)", marginBottom:8 }}>Messages</div>
        <div style={{ fontSize:13 }}>Switch to a family hub to see messages</div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", height:"calc(100vh - var(--nav-height) - 64px)", overflow:"hidden", margin:"0 -16px" }}>

      {/* ── Sidebar ── */}
      {(showSidebar || !activeChannel) && (
        <div style={{
          width: activeChannel ? 260 : "100%", flexShrink:0,
          borderRight:"1.5px solid var(--border)",
          display:"flex", flexDirection:"column",
          background:"var(--cream)",
        }}>
          {/* Sidebar header */}
          <div style={{ padding:"16px 16px 12px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:600, color:"var(--ink)" }}>
                Messages {totalUnread > 0 && <span style={{ fontSize:12, background:accent, color:"#fff", borderRadius:20, padding:"2px 8px", marginLeft:6 }}>{totalUnread}</span>}
              </div>
              <button onClick={() => setShowNewChannel(true)} style={{ width:32, height:32, borderRadius:10, background:accent, border:"none", cursor:"pointer", fontSize:18, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
            </div>
          </div>

          {/* Channel list */}
          <div style={{ overflowY:"auto", flex:1 }}>
            {loadingChannels ? (
              <div style={{ padding:"32px 16px", textAlign:"center", color:"var(--ink-subtle)", fontSize:13 }}>Loading...</div>
            ) : channels.length === 0 ? (
              <div style={{ padding:"32px 16px", textAlign:"center" }}>
                <div style={{ fontSize:32, marginBottom:8 }}>💬</div>
                <div style={{ fontSize:13, color:"var(--ink-subtle)" }}>No conversations yet</div>
                <button onClick={() => setShowNewChannel(true)} style={{ marginTop:12, padding:"8px 16px", background:accent, color:"#fff", border:"none", borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  Start one
                </button>
              </div>
            ) : (
              channels.map(ch => {
                const isActive = activeChannel?.id === ch.id;
                const chName = getChannelName(ch, familyMembers, myMemberId);
                return (
                  <button
                    key={ch.id}
                    onClick={() => selectChannel(ch)}
                    style={{
                      width:"100%", display:"flex", alignItems:"center", gap:12,
                      padding:"12px 16px", border:"none", textAlign:"left" as const,
                      background: isActive ? accent + "18" : "transparent",
                      borderLeft: isActive ? `3px solid ${accent}` : "3px solid transparent",
                      cursor:"pointer", fontFamily:"inherit",
                    }}
                  >
                    <div style={{ width:40, height:40, borderRadius:12, background: isActive ? accent + "30" : "#EDE0D8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                      {getChannelIcon(ch)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div style={{ fontSize:14, fontWeight: ch.unread_count > 0 ? 800 : 600, color:"var(--ink)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
                          {chName}
                        </div>
                        {ch.last_message && <div style={{ fontSize:10, color:"var(--ink-subtle)", flexShrink:0, marginLeft:4 }}>{fmtTime(ch.last_message.created_at)}</div>}
                      </div>
                      <div style={{ fontSize:12, color:"var(--ink-subtle)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const, marginTop:2 }}>
                        {ch.last_message?.body ?? "No messages yet"}
                      </div>
                    </div>
                    {ch.unread_count > 0 && (
                      <div style={{ width:20, height:20, borderRadius:"50%", background:accent, color:"#fff", fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {ch.unread_count > 9 ? "9+" : ch.unread_count}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Chat pane ── */}
      {activeChannel && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, background:"#fff" }}>
          {/* Chat header */}
          <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12, flexShrink:0, background:"rgba(253,248,244,0.95)" }}>
            {!showSidebar && (
              <button onClick={() => setShowSidebar(true)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"var(--ink-subtle)", padding:0 }}>←</button>
            )}
            <div style={{ width:36, height:36, borderRadius:10, background:accent + "20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
              {getChannelIcon(activeChannel)}
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:"var(--ink)" }}>
                {getChannelName(activeChannel, familyMembers, myMemberId)}
              </div>
              {activeChannel.description && <div style={{ fontSize:11, color:"var(--ink-subtle)" }}>{activeChannel.description}</div>}
            </div>
            {/* Channel menu */}
            <div style={{ marginLeft:"auto", position:"relative" }}>
              <button
                onClick={() => { setShowChannelMenu(v => !v); setConfirmClear(false); setConfirmDeleteChannel(false); }}
                style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"var(--ink-subtle)", padding:"4px 8px", borderRadius:8 }}
              >⋯</button>
              {showChannelMenu && (
                <div style={{ position:"absolute", right:0, top:"calc(100% + 4px)", background:"#fff", border:"1.5px solid var(--border)", borderRadius:14, padding:6, minWidth:180, boxShadow:"0 8px 24px rgba(100,60,60,0.12)", zIndex:300 }}>
                  {!confirmClear && !confirmDeleteChannel && (
                    <>
                      <button onClick={() => setConfirmClear(true)} style={{ width:"100%", padding:"10px 14px", background:"none", border:"none", textAlign:"left", fontSize:13, fontWeight:600, color:"var(--ink)", cursor:"pointer", borderRadius:10, fontFamily:"inherit" }}>
                        🧹 Clear chat history
                      </button>
                      <button onClick={() => setConfirmDeleteChannel(true)} style={{ width:"100%", padding:"10px 14px", background:"none", border:"none", textAlign:"left", fontSize:13, fontWeight:600, color:"#C97B7B", cursor:"pointer", borderRadius:10, fontFamily:"inherit" }}>
                        🗑️ Delete channel
                      </button>
                    </>
                  )}
                  {confirmClear && (
                    <div style={{ padding:"8px 10px" }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"var(--ink)", marginBottom:8 }}>Clear all messages?</div>
                      <div style={{ fontSize:11, color:"var(--ink-subtle)", marginBottom:10 }}>This cannot be undone.</div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => setConfirmClear(false)} style={{ flex:1, padding:"7px", background:"#fff", border:"1.5px solid var(--border)", borderRadius:8, fontSize:12, fontWeight:700, color:"var(--ink-subtle)", cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
                        <button onClick={clearChat} style={{ flex:1, padding:"7px", background:"#E8A5A5", border:"none", borderRadius:8, fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer", fontFamily:"inherit" }}>Clear</button>
                      </div>
                    </div>
                  )}
                  {confirmDeleteChannel && (
                    <div style={{ padding:"8px 10px" }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#C97B7B", marginBottom:8 }}>Delete this channel?</div>
                      <div style={{ fontSize:11, color:"var(--ink-subtle)", marginBottom:10 }}>All messages will be permanently removed.</div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => setConfirmDeleteChannel(false)} style={{ flex:1, padding:"7px", background:"#fff", border:"1.5px solid var(--border)", borderRadius:8, fontSize:12, fontWeight:700, color:"var(--ink-subtle)", cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
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
                  const isMe = msg.sender?.id === myMemberId;
                  const prevMsg = messages[i - 1];
                  const showAvatar = !prevMsg || prevMsg.sender?.id !== msg.sender?.id;
                  const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div style={{ textAlign:"center", margin:"16px 0 8px", fontSize:11, color:"var(--ink-subtle)", fontWeight:600 }}>
                          {new Date(msg.created_at).toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })}
                        </div>
                      )}
                      <div style={{ display:"flex", flexDirection: isMe ? "row-reverse" : "row", gap:8, marginBottom: showAvatar ? 12 : 4, alignItems:"flex-end" }}>
                        {!isMe && (
                          <div style={{ width:32, flexShrink:0 }}>
                            {showAvatar && msg.sender && <Avatar sender={msg.sender} size={32} />}
                          </div>
                        )}
                        <div style={{ maxWidth:"72%", minWidth:0 }}>
                          {showAvatar && !isMe && msg.sender && (
                            <div style={{ fontSize:11, fontWeight:700, color:"var(--ink-subtle)", marginBottom:3, paddingLeft:4 }}>
                              {msg.sender.first_name} {msg.sender.last_name}
                            </div>
                          )}
                          <div
                            style={{
                              padding:"8px 12px", borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                              background: isMe ? accent : "#F3EDE8",
                              color: isMe ? "#fff" : "var(--ink)",
                              fontSize:14, lineHeight:1.5,
                              fontStyle: msg.is_deleted ? "italic" : "normal",
                              opacity: msg.is_deleted ? 0.6 : 1,
                              position:"relative" as const,
                            }}
                          >
                            {msg.is_deleted ? "This message was deleted" : msg.body}
                          </div>
                          <div style={{ fontSize:10, color:"var(--ink-subtle)", marginTop:3, textAlign: isMe ? "right" : "left", paddingLeft:4, paddingRight:4 }}>
                            {fmtTime(msg.created_at)}
                            {msg.is_edited && " · edited"}
                            {isMe && !msg.is_deleted && (
                              <button onClick={() => deleteMessage(msg.id)} style={{ marginLeft:8, background:"none", border:"none", fontSize:10, color:"var(--ink-subtle)", cursor:"pointer", padding:0, fontFamily:"inherit" }}>
                                delete
                              </button>
                            )}
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
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                rows={1}
                style={{
                  flex:1, padding:"10px 14px", border:"1.5px solid var(--border)",
                  borderRadius:16, fontSize:14, color:"var(--ink)", background:"#fff",
                  outline:"none", fontFamily:"inherit", resize:"none" as const,
                  maxHeight:120, overflowY:"auto" as const,
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!text.trim() || sending}
                style={{
                  width:42, height:42, borderRadius:12, border:"none",
                  background: text.trim() ? accent : "#EDE0D8",
                  color:"#fff", cursor: text.trim() ? "pointer" : "not-allowed",
                  fontSize:18, display:"flex", alignItems:"center", justifyContent:"center",
                  flexShrink:0, transition:"background 0.15s",
                }}
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New channel modal */}
      {showNewChannel && (
        <NewChannelModal
          members={familyMembers}
          myMemberId={myMemberId}
          familyId={currentContext}
          onClose={() => setShowNewChannel(false)}
          onCreate={async (channelId) => {
            await loadChannels();
            const ch = channels.find(c => c.id === channelId);
            if (ch) selectChannel(ch);
            else {
              // Reload and find the new channel
              const res = await fetch(`/api/messages/channels?${fp}`);
              if (res.ok) {
                const updated: Channel[] = await res.json();
                setChannels(updated);
                const newCh = updated.find(c => c.id === channelId);
                if (newCh) selectChannel(newCh);
              }
            }
          }}
          accent={accent}
        />
      )}
    </div>
  );
}
