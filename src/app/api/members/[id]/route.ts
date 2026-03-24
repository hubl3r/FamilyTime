// src/app/api/members/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionMember } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";

const MEMBER_SELECT = `
  id, family_id, nextauth_user_id, email, first_name, last_name, initials, color, role,
  is_active, invite_status, invite_token,
  birthday, phone, blood_type, allergies, medications, medical_notes,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
  bio, nickname, created_at, joined_at
`;

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const sessionMember = await getSessionMember();
  if (!sessionMember) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSelf = sessionMember.id === id;
  const isPrivileged = sessionMember.role === "owner" || sessionMember.role === "admin";

  if (!isSelf && !isPrivileged) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: target, error: fetchErr } = await supabaseAdmin
    .from("family_members")
    .select("id, family_id, role, first_name, last_name")
    .eq("id", id)
    .eq("family_id", sessionMember.family_id)
    .single();

  if (fetchErr || !target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const body = await req.json();

  // Hard blocks — cannot be bypassed
  if (body.is_active === false) {
    if (target.role === "owner") {
      return NextResponse.json({ error: "The owner account cannot be deactivated" }, { status: 403 });
    }
    if (isSelf) {
      return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 403 });
    }
  }

  if (body.role === "owner" && sessionMember.role !== "owner") {
    return NextResponse.json({ error: "Only owners can assign the owner role" }, { status: 403 });
  }

  const allowedFields: Record<string, unknown> = {};

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

  if (isPrivileged) {
    if ("role" in body) allowedFields.role = body.role;
    if ("is_active" in body) allowedFields.is_active = body.is_active;
  }

  if (allowedFields.first_name || allowedFields.last_name) {
    const fn = (allowedFields.first_name as string) ?? target.first_name;
    const ln = (allowedFields.last_name as string) ?? target.last_name;
    allowedFields.initials = `${(fn[0] ?? "").toUpperCase()}${(ln[0] ?? "").toUpperCase()}`;
  }

  allowedFields.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabaseAdmin
    .from("family_members")
    .update(allowedFields)
    .eq("id", id)
    .select(MEMBER_SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(updated);
}
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const sessionMember = await getSessionMember();
  if (!sessionMember) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only owner can hard-delete
  if (sessionMember.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can permanently remove members" }, { status: 403 });
  }

  const { data: target, error: fetchErr } = await supabaseAdmin
    .from("family_members")
    .select("id, family_id, role, email")
    .eq("id", id)
    .eq("family_id", sessionMember.family_id)
    .single();

  if (fetchErr || !target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (target.role === "owner") return NextResponse.json({ error: "Cannot delete the owner" }, { status: 403 });
  if (target.id === sessionMember.id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 403 });

  const { error } = await supabaseAdmin
    .from("family_members")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Clean up any join requests so they can be re-invited in future
  await supabaseAdmin
    .from("join_requests")
    .delete()
    .eq("family_id", sessionMember.family_id)
    .eq("email", target.email);

  return NextResponse.json({ success: true });
}
