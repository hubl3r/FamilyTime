// src/app/dashboard/members/page.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/components/ThemeContext";

// ── Types ─────────────────────────────────────────────────────
type MemberRole = "owner" | "admin" | "member" | "child";
type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "";

type FamilyMember = {
  id: string;
  family_id: string;
  nextauth_user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  initials: string;
  color: string;
  role: MemberRole;
  is_active: boolean;
  invite_status: "pending" | "accepted" | "declined" | null;
  invite_token: string | null;
  // Profile fields
  birthday: string | null;
  phone: string | null;
  blood_type: BloodType | null;
  allergies: string | null;
  medications: string | null;
  medical_notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  bio: string | null;
  nickname: string | null;
  // Timestamps
  created_at: string;
  joined_at: string | null;
};

// ── Constants ─────────────────────────────────────────────────
const ROLE_CONFIG: Record<MemberRole, { label: string; icon: string; color: string; bg: string; desc: string }> = {
  owner:  { label: "Owner",  icon: "👑", color: "#C97B7B", bg: "#F7E6E6", desc: "Full access to everything" },
  admin:  { label: "Admin",  icon: "🛡️", color: "#8B7BB8", bg: "#EDE9F7", desc: "Manage members & settings" },
  member: { label: "Member", icon: "👤", color: "#6A9FC4", bg: "#E3EFF8", desc: "Standard family access" },
  child:  { label: "Child",  icon: "⭐", color: "#A8977A", bg: "#FBF0E6", desc: "Limited, age-appropriate access" },
};

const AVATAR_COLORS = [
  "#E8A5A5", "#B5A8D4", "#A8C8E8", "#A8C5A0", "#F0C4A0",
  "#C8A8D4", "#A8D4C8", "#D4C8A8", "#D4A8B5", "#A8B5D4",
];

const BLOOD_TYPES: BloodType[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""];

// ── Helpers ───────────────────────────────────────────────────
function getInitials(first: string, last: string): string {
  return `${(first[0] ?? "").toUpperCase()}${(last[0] ?? "").toUpperCase()}`;
}

function calcAge(dob: string | null): string {
  if (!dob) return "";
  const birth = new Date(dob + "T00:00:00");
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? `${age} yrs` : "";
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Sub-components ────────────────────────────────────────────
function Avatar({ member, size = 44 }: { member: Pick<FamilyMember, "initials" | "color" | "is_active">; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.3),
      background: member.color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.35), fontWeight: 800, color: "#fff",
      opacity: member.is_active ? 1 : 0.45,
      flexShrink: 0,
      boxShadow: "0 2px 8px rgba(100,60,60,0.14)",
      letterSpacing: 0.5,
    }}>
      {member.initials}
    </div>
  );
}

function RoleBadge({ role }: { role: MemberRole }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}40`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function InviteBadge({ status }: { status: FamilyMember["invite_status"] }) {
  if (!status || status === "accepted") return null;
  const map = {
    pending:  { label: "Invite Pending", color: "#A8977A", bg: "#FBF0E6" },
    declined: { label: "Invite Declined", color: "#C97B7B", bg: "#F7E6E6" },
  };
  const s = map[status];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function FormInput({ label, value, onChange, type = "text", placeholder = "", required = false }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#B8A8A8", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#E8A5A5" }}> *</span>}
      </div>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #EDE0D8", borderRadius: 10, fontSize: 14, color: "#3D2C2C", background: "#fff", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#B8A8A8", marginBottom: 6 }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #EDE0D8", borderRadius: 10, fontSize: 14, color: "#3D2C2C", background: "#fff", outline: "none", fontFamily: "inherit" }}>
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );
}

function FormTextarea({ label, value, onChange, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#B8A8A8", marginBottom: 6 }}>{label}</div>
      <textarea
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
        style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #EDE0D8", borderRadius: 10, fontSize: 14, color: "#3D2C2C", background: "#fff", outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #EDE0D8" }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#B8A8A8", flexShrink: 0, marginRight: 16 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#3D2C2C", fontWeight: 600, textAlign: "right" }}>{value}</div>
    </div>
  );
}

// ── Color Picker ──────────────────────────────────────────────
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#B8A8A8", marginBottom: 8 }}>Avatar Color</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {AVATAR_COLORS.map(c => (
          <button key={c} onClick={() => onChange(c)} style={{
            width: 30, height: 30, borderRadius: 8, background: c, border: "none", cursor: "pointer",
            outline: value === c ? "3px solid #3D2C2C" : "none",
            outlineOffset: 2, transition: "transform 0.1s",
            transform: value === c ? "scale(1.15)" : "scale(1)",
          }}/>
        ))}
      </div>
    </div>
  );
}

// ── Add/Edit Member Modal ─────────────────────────────────────
function MemberFormModal({ member, onClose, onSave, saving, accent }: {
  member?: FamilyMember | null;
  onClose: () => void;
  onSave: (data: Record<string, string>) => void;
  saving: boolean;
  accent: string;
}) {
  const isEdit = !!member;
  const [tab, setTab] = useState<"basic" | "medical" | "emergency">("basic");

  const blank: Record<string, string> = {
    first_name: "", last_name: "", email: "", role: "member",
    color: AVATAR_COLORS[0], nickname: "", bio: "",
    birthday: "", phone: "",
    blood_type: "", allergies: "", medications: "", medical_notes: "",
    emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relation: "",
  };

  const [form, setForm] = useState<Record<string, string>>(() => {
    if (!member) return blank;
    return {
      first_name: member.first_name ?? "",
      last_name: member.last_name ?? "",
      email: member.email ?? "",
      role: member.role ?? "member",
      color: member.color ?? AVATAR_COLORS[0],
      nickname: member.nickname ?? "",
      bio: member.bio ?? "",
      birthday: member.birthday ?? "",
      phone: member.phone ?? "",
      blood_type: member.blood_type ?? "",
      allergies: member.allergies ?? "",
      medications: member.medications ?? "",
      medical_notes: member.medical_notes ?? "",
      emergency_contact_name: member.emergency_contact_name ?? "",
      emergency_contact_phone: member.emergency_contact_phone ?? "",
      emergency_contact_relation: member.emergency_contact_relation ?? "",
    };
  });

  const f = (k: string) => form[k] ?? "";
  const sf = (k: string) => (v: string) => setForm(prev => ({ ...prev, [k]: v }));

  // Auto-update initials preview
  const previewInitials = getInitials(f("first_name") || "?", f("last_name") || "?");

  const canSave = f("first_name").trim() && f("last_name").trim() && (isEdit || f("email").trim());

  const TABS = [
    { id: "basic", label: "Profile" },
    { id: "medical", label: "Medical" },
    { id: "emergency", label: "Emergency" },
  ] as const;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(61,44,44,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: "#FDF8F4", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: f("color"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff", boxShadow: "0 2px 8px rgba(100,60,60,0.14)" }}>
                {previewInitials}
              </div>
              <div>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 600, color: "#3D2C2C" }}>
                  {isEdit ? `Edit ${member!.first_name}` : "Add Member"}
                </div>
                <div style={{ fontSize: 12, color: "#B8A8A8" }}>
                  {isEdit ? "Update profile details" : "They'll receive an email invite"}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#B8A8A8" }}>×</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: 3, marginBottom: 4 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: "7px 4px", borderRadius: 8, border: "none",
                background: tab === t.id ? "#fff" : "transparent",
                fontSize: 11, fontWeight: 700,
                color: tab === t.id ? "#3D2C2C" : "#B8A8A8",
                cursor: "pointer",
                boxShadow: tab === t.id ? "0 1px 4px rgba(61,44,44,0.1)" : "none",
                fontFamily: "inherit",
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", padding: "16px 20px 40px", flex: 1 }}>
          {tab === "basic" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FormInput label="First Name" value={f("first_name")} onChange={sf("first_name")} placeholder="Jane" required/>
                <FormInput label="Last Name" value={f("last_name")} onChange={sf("last_name")} placeholder="Smith" required/>
              </div>
              {!isEdit && (
                <FormInput label="Email Address" value={f("email")} onChange={sf("email")} type="email" placeholder="jane@example.com" required/>
              )}
              <FormInput label="Nickname" value={f("nickname")} onChange={sf("nickname")} placeholder="e.g. Mom, J-Bird"/>
              <FormSelect label="Role" value={f("role")} onChange={sf("role")} options={
                Object.entries(ROLE_CONFIG).map(([id, cfg]) => ({ id, label: `${cfg.icon} ${cfg.label} — ${cfg.desc}` }))
              }/>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FormInput label="Date of Birth" value={f("birthday")} onChange={sf("birthday")} type="date"/>
                <FormInput label="Phone" value={f("phone")} onChange={sf("phone")} type="tel" placeholder="555-000-0000"/>
              </div>
              <ColorPicker value={f("color")} onChange={sf("color")}/>
              <FormTextarea label="Bio / About" value={f("bio")} onChange={sf("bio")} placeholder="A little about this family member..."/>
            </>
          )}

          {tab === "medical" && (
            <>
              <div style={{ background: "rgba(168,197,160,0.12)", border: "1px solid #A8C5A040", borderRadius: 12, padding: "10px 14px", marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#6A7A62", fontWeight: 600 }}>🔒 Medical info is private to owners & admins by default</div>
              </div>
              <FormSelect label="Blood Type" value={f("blood_type")} onChange={sf("blood_type")} options={BLOOD_TYPES.map(b => ({ id: b, label: b || "Unknown" }))}/>
              <FormTextarea label="Allergies" value={f("allergies")} onChange={sf("allergies")} placeholder="Food, medication, environmental allergies..."/>
              <FormTextarea label="Current Medications" value={f("medications")} onChange={sf("medications")} placeholder="Medications, dosages, frequency..."/>
              <FormTextarea label="Medical Notes" value={f("medical_notes")} onChange={sf("medical_notes")} placeholder="Conditions, doctor info, health history..."/>
            </>
          )}

          {tab === "emergency" && (
            <>
              <div style={{ background: "rgba(232,165,165,0.12)", border: "1px solid #E8A5A540", borderRadius: 12, padding: "10px 14px", marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#8B4040", fontWeight: 600 }}>🆘 Used in case of emergency — keep this up to date</div>
              </div>
              <FormInput label="Contact Name" value={f("emergency_contact_name")} onChange={sf("emergency_contact_name")} placeholder="Full name"/>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FormInput label="Phone" value={f("emergency_contact_phone")} onChange={sf("emergency_contact_phone")} type="tel" placeholder="555-000-0000"/>
                <FormInput label="Relationship" value={f("emergency_contact_relation")} onChange={sf("emergency_contact_relation")} placeholder="e.g. Spouse, Parent"/>
              </div>
            </>
          )}

          <button
            onClick={() => onSave(form)}
            disabled={saving || !canSave}
            style={{
              width: "100%", padding: 14,
              background: saving ? "#EDE0D8" : !canSave ? "#EDE0D8" : accent,
              color: "#fff", border: "none", borderRadius: 12, fontSize: 14,
              fontWeight: 800, cursor: saving || !canSave ? "not-allowed" : "pointer",
              marginTop: 8, fontFamily: "inherit", transition: "background 0.2s",
            }}
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add & Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Member Detail Drawer ──────────────────────────────────────
function MemberDetailDrawer({ member, onClose, onEdit, onDeactivate, onResendInvite, accent, currentUser }: {
  member: FamilyMember;
  onClose: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onResendInvite: () => void;
  accent: string;
  currentUser: FamilyMember | null;
}) {
  const [tab, setTab] = useState<"profile" | "medical" | "emergency">("profile");
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const roleCfg = ROLE_CONFIG[member.role];
  const age = calcAge(member.birthday);

  // Block deactivation if: member is owner, or member is the current user
  const isOwner = member.role === "owner";
  const isSelf  = currentUser?.id === member.id;
  const canDeactivate = !isOwner && !isSelf;

  const TABS = [
    { id: "profile", label: "Profile" },
    { id: "medical", label: "Medical" },
    { id: "emergency", label: "Emergency" },
  ] as const;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(61,44,44,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: "#FDF8F4", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar member={member} size={56}/>
              <div>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 600, color: "#3D2C2C", marginBottom: 3 }}>
                  {member.first_name} {member.last_name}
                  {member.nickname && <span style={{ fontSize: 14, color: "#B8A8A8", fontWeight: 400 }}> "{member.nickname}"</span>}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <RoleBadge role={member.role}/>
                  <InviteBadge status={member.invite_status}/>
                  {!member.is_active && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "#EDE0D8", color: "#8B7070" }}>Inactive</span>
                  )}
                </div>
                {age && <div style={{ fontSize: 12, color: "#B8A8A8", marginTop: 4 }}>{age} · {fmtDate(member.birthday)}</div>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#B8A8A8" }}>×</button>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={onEdit} style={{ flex: 1, padding: "9px 8px", background: accent + "15", border: `1.5px solid ${accent}40`, borderRadius: 10, fontSize: 12, fontWeight: 700, color: accent, cursor: "pointer", fontFamily: "inherit" }}>
              ✏️ Edit
            </button>
            {member.invite_status === "pending" && (
              <button onClick={onResendInvite} style={{ flex: 1, padding: "9px 8px", background: "#FBF0E6", border: "1.5px solid #F0C4A060", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#A8977A", cursor: "pointer", fontFamily: "inherit" }}>
                📧 Resend
              </button>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: 3 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: "7px 4px", borderRadius: 8, border: "none",
                background: tab === t.id ? "#fff" : "transparent",
                fontSize: 11, fontWeight: 700,
                color: tab === t.id ? "#3D2C2C" : "#B8A8A8",
                cursor: "pointer",
                boxShadow: tab === t.id ? "0 1px 4px rgba(61,44,44,0.1)" : "none",
                fontFamily: "inherit",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", padding: "16px 20px 40px", flex: 1 }}>
          {tab === "profile" && (
            <>
              {member.bio && (
                <div style={{ background: "rgba(255,255,255,0.7)", border: "1px solid #EDE0D8", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#3D2C2C", lineHeight: 1.6 }}>
                  {member.bio}
                </div>
              )}
              <DetailRow label="Email" value={member.email}/>
              <DetailRow label="Phone" value={member.phone}/>
              <DetailRow label="Date of Birth" value={fmtDate(member.birthday)}/>
              <DetailRow label="Role" value={`${roleCfg.icon} ${roleCfg.label}`}/>
              <DetailRow label="Joined" value={fmtDate(member.joined_at ?? member.created_at)}/>
              {member.invite_status && member.invite_status !== "accepted" && (
                <DetailRow label="Invite Status" value={member.invite_status.charAt(0).toUpperCase() + member.invite_status.slice(1)}/>
              )}
              {!member.nextauth_user_id && (
                <div style={{ background: "#FBF0E6", border: "1px solid #F0C4A050", borderRadius: 12, padding: "10px 14px", marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: "#A8977A", fontWeight: 600 }}>
                    🔗 This member hasn't created their own account yet. Once they accept the invite, their profile will be linked.
                  </div>
                </div>
              )}

              {/* Deactivate — hidden for owner and self */}
              {canDeactivate && (
              <div style={{ marginTop: 24 }}>
                {!confirmDeactivate ? (
                  <button onClick={() => setConfirmDeactivate(true)} style={{ width: "100%", padding: 12, background: "#FFF0F0", border: "1.5px solid #E8A5A560", borderRadius: 12, fontSize: 13, fontWeight: 700, color: "#C97B7B", cursor: "pointer", fontFamily: "inherit" }}>
                    {member.is_active ? "🚫 Deactivate Member" : "✅ Reactivate Member"}
                  </button>
                ) : (
                  <div style={{ background: "#FFF0F0", border: "1.5px solid #E8A5A5", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#C97B7B", marginBottom: 12, textAlign: "center" }}>
                      {member.is_active ? "Deactivate this member?" : "Reactivate this member?"}
                    </div>
                    <div style={{ fontSize: 12, color: "#8B7070", textAlign: "center", marginBottom: 14 }}>
                      {member.is_active ? "They will lose access to the family hub." : "They will regain access to the family hub."}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setConfirmDeactivate(false)} style={{ flex: 1, padding: 10, background: "#fff", border: "1.5px solid #EDE0D8", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#8B7070", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                      <button onClick={onDeactivate} style={{ flex: 1, padding: 10, background: "#E8A5A5", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Confirm</button>
                    </div>
                  </div>
                )}
              </div>
              )}
            </>
          )}

          {tab === "medical" && (
            <>
              <div style={{ background: "rgba(168,197,160,0.12)", border: "1px solid #A8C5A040", borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "#6A7A62", fontWeight: 600 }}>🔒 Visible to owners and admins only</div>
              </div>
              <DetailRow label="Blood Type" value={member.blood_type || null}/>
              <DetailRow label="Allergies" value={member.allergies}/>
              <DetailRow label="Medications" value={member.medications}/>
              <DetailRow label="Medical Notes" value={member.medical_notes}/>
              {!member.blood_type && !member.allergies && !member.medications && !member.medical_notes && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#B8A8A8" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🏥</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>No medical info on file</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Tap Edit to add it</div>
                </div>
              )}
            </>
          )}

          {tab === "emergency" && (
            <>
              <div style={{ background: "rgba(232,165,165,0.12)", border: "1px solid #E8A5A540", borderRadius: 12, padding: "10px 14px", marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "#8B4040", fontWeight: 600 }}>🆘 Emergency contact information</div>
              </div>
              <DetailRow label="Contact Name" value={member.emergency_contact_name}/>
              <DetailRow label="Phone" value={member.emergency_contact_phone}/>
              <DetailRow label="Relationship" value={member.emergency_contact_relation}/>
              {!member.emergency_contact_name && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#B8A8A8" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🆘</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>No emergency contact on file</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Tap Edit to add one</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Types (extended) ─────────────────────────────────────────
type JoinRequest = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  message: string | null;
  status: "pending" | "approved" | "denied";
  created_at: string;
};

type FamilyInfo = {
  id: string;
  name: string;
  invite_code: string;
  is_searchable: boolean;
};

// ── Join Request Card ─────────────────────────────────────────
function JoinRequestCard({ request, accent, onAction }: {
  request: JoinRequest;
  accent: string;
  onAction: (id: string, action: "approve" | "deny", role?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [role, setRole] = useState("member");
  const [busy, setBusy] = useState(false);

  const initials = `${(request.first_name[0] ?? "").toUpperCase()}${(request.last_name[0] ?? "").toUpperCase()}`;
  const daysAgo = Math.floor((Date.now() - new Date(request.created_at).getTime()) / 86400000);

  return (
    <div style={{ background: "rgba(255,255,255,0.85)", border: "1.5px solid #EDE0D8", borderRadius: 16, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#E8A5A5,#B5A8D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#3D2C2C" }}>{request.first_name} {request.last_name}</div>
          <div style={{ fontSize: 12, color: "#B8A8A8" }}>{request.email} · {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}</div>
        </div>
        <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", fontSize: 18, color: "#D4C4B4", cursor: "pointer", padding: "0 4px" }}>
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {request.message && (
        <div style={{ marginTop: 10, background: "rgba(181,168,212,0.1)", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#8B7070", fontStyle: "italic", lineHeight: 1.5 }}>
          "{request.message}"
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #EDE0D8" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#B8A8A8", marginBottom: 8 }}>Assign Role</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {(["member", "admin", "child"] as const).map(r => {
              const cfg = ROLE_CONFIG[r];
              return (
                <button key={r} onClick={() => setRole(r)} style={{
                  padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  border: `1.5px solid ${role === r ? accent : "#EDE0D8"}`,
                  background: role === r ? accent + "20" : "#fff",
                  color: role === r ? accent : "#8B7070",
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  {cfg.icon} {cfg.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={async () => { setBusy(true); await onAction(request.id, "deny"); setBusy(false); }}
              disabled={busy}
              style={{ flex: 1, padding: "10px 8px", background: "#FFF0F0", border: "1.5px solid #E8A5A560", borderRadius: 10, fontSize: 12, fontWeight: 800, color: "#C97B7B", cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit" }}
            >
              ✕ Decline
            </button>
            <button
              onClick={async () => { setBusy(true); await onAction(request.id, "approve", role); setBusy(false); }}
              disabled={busy}
              style={{ flex: 2, padding: "10px 8px", background: busy ? "#EDE0D8" : accent, border: "none", borderRadius: 10, fontSize: 12, fontWeight: 800, color: "#fff", cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit" }}
            >
              {busy ? "Processing..." : "✓ Approve & Invite"}
            </button>
          </div>
        </div>
      )}

      {!expanded && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={() => onAction(request.id, "deny")}
            style={{ flex: 1, padding: "8px", background: "#FFF0F0", border: "1.5px solid #E8A5A560", borderRadius: 10, fontSize: 11, fontWeight: 800, color: "#C97B7B", cursor: "pointer", fontFamily: "inherit" }}
          >
            Decline
          </button>
          <button
            onClick={() => setExpanded(true)}
            style={{ flex: 2, padding: "8px", background: accent + "15", border: `1.5px solid ${accent}40`, borderRadius: 10, fontSize: 11, fontWeight: 800, color: accent, cursor: "pointer", fontFamily: "inherit" }}
          >
            Review & Approve
          </button>
        </div>
      )}
    </div>
  );
}

// ── Invite Code Panel ─────────────────────────────────────────
function InviteCodePanel({ family, isPrivileged, accent, onRegenerate, onToggleSearchable }: {
  family: FamilyInfo;
  isPrivileged: boolean;
  accent: string;
  onRegenerate: () => void;
  onToggleSearchable: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/join`;

  const copyCode = () => {
    navigator.clipboard.writeText(family.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ background: "rgba(181,168,212,0.1)", border: "1.5px solid #B5A8D440", borderRadius: 16, padding: "16px", marginTop: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#3D2C2C", marginBottom: 12 }}>🔑 Family Invite Code</div>

      {/* Code display */}
      <div style={{ background: "#fff", border: "1.5px solid #EDE0D8", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, fontSize: 24, fontWeight: 900, color: "#3D2C2C", letterSpacing: 4, fontFamily: "monospace" }}>
          {family.invite_code}
        </div>
        <button onClick={copyCode} style={{ padding: "8px 14px", background: accent + "15", border: `1.5px solid ${accent}40`, borderRadius: 10, fontSize: 12, fontWeight: 800, color: accent, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>

      <div style={{ fontSize: 12, color: "#8B7070", lineHeight: 1.6, marginBottom: 12 }}>
        Share this code with family members. They go to <span style={{ fontWeight: 700, color: accent }}>{shareUrl}</span> and enter the code to request to join.
      </div>

      {isPrivileged && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Searchable toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.7)", borderRadius: 10, padding: "10px 14px", border: "1px solid #EDE0D8" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#3D2C2C" }}>🔍 Allow search discovery</div>
              <div style={{ fontSize: 11, color: "#B8A8A8" }}>Let others find this family by name</div>
            </div>
            <button
              onClick={onToggleSearchable}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: family.is_searchable ? accent : "#D4C4B4",
                border: "none", cursor: "pointer", position: "relative",
                transition: "background 0.2s", flexShrink: 0,
              }}
            >
              <div style={{
                position: "absolute", top: 3,
                left: family.is_searchable ? 23 : 3,
                width: 18, height: 18, borderRadius: "50%",
                background: "#fff", transition: "left 0.2s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              }}/>
            </button>
          </div>

          {/* Regenerate */}
          <button
            onClick={onRegenerate}
            style={{ padding: "9px 14px", background: "#fff", border: "1.5px solid #EDE0D8", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#8B7070", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
          >
            🔄 Regenerate code — invalidates the current one
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function MembersPage() {
  const { theme } = useTheme();
  const accent = theme.accent;

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [currentUser, setCurrentUser] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [family, setFamily] = useState<FamilyInfo | null>(null);

  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [editingMember, setEditingMember] = useState<FamilyMember | null | undefined>(undefined); // undefined = closed, null = new
  const [saving, setSaving] = useState(false);

  const [mainTab, setMainTab] = useState<"members" | "requests">("members");
  const [filter, setFilter] = useState<"all" | "active" | "pending">("active");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadMembers = useCallback(async () => {
    try {
      const [membersRes, familyRes, meRes] = await Promise.all([
        fetch("/api/members"),
        fetch("/api/family"),
        fetch("/api/me"),
      ]);
      if (!membersRes.ok) throw new Error("Failed to load members");
      const membersData: FamilyMember[] = await membersRes.json();
      setMembers(membersData);
      if (familyRes.ok) setFamily(await familyRes.json());
      // Use /api/me to reliably identify the current user by member_id
      if (meRes.ok) {
        const meData = await meRes.json();
        const primaryMemberId = meData.primary_member_id;
        // Find them in the current family's member list by email (most reliable cross-family)
        const me = membersData.find(m => m.email.toLowerCase() === meData.email?.toLowerCase()) ?? null;
        setCurrentUser(me);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadJoinRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/members/join-requests");
      if (res.ok) setJoinRequests(await res.json());
    } catch { /* not privileged */ }
  }, []);

  useEffect(() => { loadMembers(); loadJoinRequests(); }, [loadMembers, loadJoinRequests]);

  const handleSave = async (data: Record<string, string>) => {
    setSaving(true);
    try {
      const isEdit = !!editingMember;
      const res = await fetch(isEdit ? `/api/members/${editingMember!.id}` : "/api/members", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Save failed");
      }
      setEditingMember(undefined);
      setSelectedMember(null);
      await loadMembers();
      showToast(isEdit ? `${data.first_name} updated!` : `Invite sent to ${data.email}!`);
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (member: FamilyMember) => {
    try {
      await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !member.is_active }),
      });
      setSelectedMember(null);
      await loadMembers();
      showToast(member.is_active ? `${member.first_name} deactivated` : `${member.first_name} reactivated`);
    } catch {
      showToast("Something went wrong");
    }
  };

  const handleResendInvite = async (member: FamilyMember) => {
    try {
      await fetch(`/api/members/${member.id}/resend-invite`, { method: "POST" });
      showToast(`Invite resent to ${member.email}`);
    } catch {
      showToast("Failed to resend invite");
    }
  };

  const handleJoinRequestAction = async (requestId: string, action: "approve" | "deny", role = "member") => {
    try {
      const res = await fetch("/api/members/join-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, action, role }),
      });
      if (!res.ok) { const err = await res.json(); showToast(err.error ?? "Action failed"); return; }
      await Promise.all([loadJoinRequests(), loadMembers()]);
      showToast(action === "approve" ? "Member approved & invite sent!" : "Request declined");
    } catch { showToast("Something went wrong"); }
  };

  const handleRegenCode = async () => {
    try {
      const res = await fetch("/api/family", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ regenerate_code: true }) });
      if (res.ok) setFamily(await res.json());
      showToast("Invite code regenerated");
    } catch { showToast("Failed to regenerate code"); }
  };

  const handleToggleSearchable = async () => {
    if (!family) return;
    try {
      const res = await fetch("/api/family", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_searchable: !family.is_searchable }) });
      if (res.ok) setFamily(await res.json());
    } catch { showToast("Failed to update setting"); }
  };

  // Determine if current user is privileged (owner/admin)
  // Determine current user's role from the matched session member
  const currentUserRole: MemberRole = currentUser?.role ?? "member";
  const isPrivileged = currentUserRole === "owner" || currentUserRole === "admin";

  const activeCount = members.filter(m => m.is_active).length;
  const pendingCount = members.filter(m => m.invite_status === "pending").length;

  const filteredMembers = members.filter(m => {
    if (filter === "active") return m.is_active;
    if (filter === "pending") return m.invite_status === "pending";
    return true;
  });

  return (
    <div style={{ padding: "0 0 80px" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "#3D2C2C", color: "#fff", padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(61,44,44,0.3)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 12px" }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 500, color: "#3D2C2C", marginBottom: 2 }}>Members</h1>
          <div style={{ fontSize: 12, color: "#B8A8A8" }}>
            {activeCount} active{pendingCount > 0 ? ` · ${pendingCount} pending` : ""}{joinRequests.length > 0 ? ` · ${joinRequests.length} requests` : ""}
          </div>
        </div>
        <button
          onClick={() => setEditingMember(null)}
          style={{ width: 38, height: 38, borderRadius: 12, background: accent + "20", border: `1.5px solid ${accent}40`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: accent }}
        >
          +
        </button>
      </div>

      {/* Main tabs */}
      <div style={{ display: "flex", background: "rgba(255,255,255,0.6)", borderRadius: 14, padding: 4, marginBottom: 16, border: "1px solid #EDE0D8" }}>
        {([
          { id: "members", label: "👨‍👩‍👧‍👦 Members" },
          { id: "requests", label: `🙋 Requests${joinRequests.length > 0 ? ` (${joinRequests.length})` : ""}` },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setMainTab(tab.id)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 10, border: "none",
            background: mainTab === tab.id ? "#fff" : "transparent",
            fontSize: 13, fontWeight: 700,
            color: mainTab === tab.id ? "#3D2C2C" : "#B8A8A8",
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: mainTab === tab.id ? "0 2px 8px rgba(61,44,44,0.08)" : "none",
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requests Tab */}
      {mainTab === "requests" && (
        <div>
          {joinRequests.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#B8A8A8" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🙋</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>No pending join requests</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Share your invite code so people can request to join</div>
            </div>
          ) : joinRequests.map(req => (
            <JoinRequestCard key={req.id} request={req} accent={accent} onAction={handleJoinRequestAction}/>
          ))}
          {family && (
            <InviteCodePanel
              family={family} isPrivileged={isPrivileged} accent={accent}
              onRegenerate={handleRegenCode} onToggleSearchable={handleToggleSearchable}
            />
          )}
        </div>
      )}

      {/* Members Tab */}
      {mainTab === "members" && (
      <div>
      {/* Avatar stack summary */}
      {members.filter(m => m.is_active).length > 0 && (
        <div style={{ background: "linear-gradient(135deg, rgba(232,165,165,0.15), rgba(181,168,212,0.15))", border: "1.5px solid #EDE0D8", borderRadius: 18, padding: "16px 18px", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 10 }}>
            {members.filter(m => m.is_active).slice(0, 6).map((m, i) => (
              <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }}>
                <Avatar member={m} size={40}/>
              </div>
            ))}
            {members.filter(m => m.is_active).length > 6 && (
              <div style={{ marginLeft: -10, width: 40, height: 40, borderRadius: 12, background: "#EDE0D8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#8B7070" }}>
                +{members.filter(m => m.is_active).length - 6}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {(Object.entries(ROLE_CONFIG) as [MemberRole, typeof ROLE_CONFIG[MemberRole]][]).map(([role, cfg]) => {
              const count = members.filter(m => m.role === role && m.is_active).length;
              if (!count) return null;
              return (
                <div key={role} style={{ fontSize: 12, color: "#8B7070" }}>
                  <span style={{ fontWeight: 700 }}>{count}</span> {cfg.label}{count !== 1 ? "s" : ""}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {([
          { id: "active", label: `Active (${activeCount})` },
          { id: "pending", label: `Pending (${pendingCount})` },
          { id: "all", label: `All (${members.length})` },
        ] as const).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
            border: `1.5px solid ${filter === f.id ? accent : "#EDE0D8"}`,
            background: filter === f.id ? accent + "20" : "#fff",
            color: filter === f.id ? accent : "#8B7070",
            cursor: "pointer",
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Members list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#B8A8A8" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👨‍👩‍👧‍👦</div>
          <div style={{ fontSize: 14 }}>Loading members...</div>
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: 40, color: "#C97B7B" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{error}</div>
          <button onClick={loadMembers} style={{ marginTop: 12, padding: "8px 16px", background: accent, color: "#fff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Retry</button>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#B8A8A8" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👨‍👩‍👧‍👦</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {filter === "pending" ? "No pending invites" : "No members yet"}
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            {filter !== "pending" && "Tap + to invite your first family member"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredMembers.map(member => {
            const roleCfg = ROLE_CONFIG[member.role];
            const age = calcAge(member.birthday);
            return (
              <div
                key={member.id}
                onClick={() => setSelectedMember(member)}
                style={{
                  background: "rgba(255,255,255,0.85)", border: "1.5px solid #EDE0D8",
                  borderRadius: 16, padding: "14px 16px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 14,
                  opacity: member.is_active ? 1 : 0.6,
                  transition: "transform 0.1s",
                }}
              >
                <Avatar member={member} size={48}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#3D2C2C" }}>
                      {member.first_name} {member.last_name}
                    </div>
                    {member.nickname && <span style={{ fontSize: 12, color: "#B8A8A8" }}>"{member.nickname}"</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <RoleBadge role={member.role}/>
                    <InviteBadge status={member.invite_status}/>
                    {!member.is_active && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "#EDE0D8", color: "#8B7070" }}>Inactive</span>
                    )}
                  </div>
                  {(age || member.email) && (
                    <div style={{ fontSize: 11, color: "#B8A8A8", marginTop: 4 }}>
                      {[age, member.email].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 16, color: "#D4C4B4" }}>›</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permissions info card */}
      <div style={{ background: "rgba(181,168,212,0.1)", border: "1.5px solid #B5A8D440", borderRadius: 16, padding: "14px 16px", marginTop: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#3D2C2C", marginBottom: 8 }}>🔗 How accounts link</div>
        <div style={{ fontSize: 12, color: "#8B7070", lineHeight: 1.6 }}>
          When you invite a member, they'll receive an email to create or link their own FamilyTime account. Once linked, their profile is connected across all devices. Owners and admins can manage access permissions for each module.
        </div>
      </div>

      {family && (
        <InviteCodePanel
          family={family} isPrivileged={isPrivileged} accent={accent}
          onRegenerate={handleRegenCode} onToggleSearchable={handleToggleSearchable}
        />
      )}
      </div>)} {/* end Members tab */}

      {/* Modals */}
      {/* Detail drawer: show when a member is selected AND we're not in edit mode */}
      {selectedMember && editingMember === undefined && (
        <MemberDetailDrawer
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onEdit={() => setEditingMember(selectedMember)}
          onDeactivate={() => handleDeactivate(selectedMember)}
          onResendInvite={() => handleResendInvite(selectedMember)}
          accent={accent}
          currentUser={currentUser}
        />
      )}
      {/* Form modal: show when editing (null = new member, FamilyMember = editing existing) */}
      {editingMember !== undefined && (
        <MemberFormModal
          member={editingMember}
          onClose={() => { setEditingMember(undefined); }}
          onSave={handleSave}
          saving={saving}
          accent={accent}
        />
      )}
    </div>
  );
}