// src/app/api/members/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionMember } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";

const MEMBER_SELECT = `
  id, family_id, nextauth_user_id, email, first_name, last_name, initials, color, role,
  is_active, invite_status, invite_token,
  birthday, phone, blood_type, allergies, medications, medical_notes,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
  bio, nickname, created_at, joined_at, last_seen_at
`;

// ── PATCH /api/members/[id] ───────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionMember = await getSessionMember();
  if (!sessionMember) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const targetId = params.id;
  const isSelf = sessionMember.id === targetId;
  const isPrivileged = sessionMember.role === "owner" || sessionMember.role === "admin";

  // Only self or owner/admin can edit
  if (!isSelf && !isPrivileged) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify target is in same family
  const { data: target, error: fetchErr } = await supabaseAdmin
    .from("family_members")
    .select("id, family_id, role, first_name, last_name")
    .eq("id", targetId)
    .eq("family_id", sessionMember.family_id)
    .single();

  if (fetchErr || !target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  // Prevent non-owners from changing role to owner
  const body = await req.json();
  if (body.role === "owner" && sessionMember.role !== "owner") {
    return NextResponse.json({ error: "Only owners can assign the owner role" }, { status: 403 });
  }

  // Build allowed update fields
  const allowedFields: Record<string, unknown> = {};

  // Profile fields — self or privileged
  const profileFields = [
    "first_name", "last_name", "nickname", "bio",
    "birthday", "phone", "color",
    "blood_type", "allergies", "medications", "medical_notes",
    "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation",
  ];

  for (const field of profileFields) {
    if (field in body) {
      allowedFields[field] = body[field] === "" ? null : body[field];
    }
  }

  // Privileged-only fields
  if (isPrivileged) {
    if ("role" in body) allowedFields.role = body.role;
    if ("is_active" in body) allowedFields.is_active = body.is_active;
  }

  // Auto-update initials if name changed
  if (allowedFields.first_name || allowedFields.last_name) {
    const fn = (allowedFields.first_name as string) ?? target.first_name;
    const ln = (allowedFields.last_name as string) ?? target.last_name;
    allowedFields.initials = `${(fn[0] ?? "").toUpperCase()}${(ln[0] ?? "").toUpperCase()}`;
  }

  allowedFields.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabaseAdmin
    .from("family_members")
    .update(allowedFields)
    .eq("id", targetId)
    .select(MEMBER_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(updated);
}