// src/app/api/me/route.ts
// GET /api/me — returns the current user's profile + all family memberships

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);

  // Get user ID from JWT (set via session callback)
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId && !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Look up user record to get ID if not in JWT yet
  let resolvedUserId = userId;
  if (!resolvedUserId && session?.user?.email) {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", session.user.email.toLowerCase().trim())
      .maybeSingle();
    resolvedUserId = userRow?.id;
  }

  if (!resolvedUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all family memberships for this user by their user ID
  const { data: memberships, error } = await supabaseAdmin
    .from("family_members")
    .select(`
      id, family_id, email, first_name, last_name, initials, color, role,
      is_active, invite_status, bio, nickname, birthday, phone,
      blood_type, allergies, medications, medical_notes,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      created_at, joined_at,
      families:family_id (
        id, name, invite_code, is_searchable, is_personal, created_at
      )
    `)
    .eq("nextauth_user_id", resolvedUserId)
    .eq("is_active", true)
    .order("joined_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ error: "No family memberships found" }, { status: 404 });
  }

  // Build family list
  const families = memberships.map(m => ({
    member_id:  m.id,
    family_id:  m.family_id,
    family:     m.families,
    role:       m.role,
    joined_at:  m.joined_at,
  }));

  // Primary = personal family, else first joined
  const primary = memberships.find(m =>
    (m.families as unknown as { is_personal?: boolean } | null)?.is_personal
  ) ?? memberships[0];

  return NextResponse.json({
    email:        primary.email,
    first_name:   primary.first_name,
    last_name:    primary.last_name,
    initials:     primary.initials,
    color:        primary.color,
    bio:          primary.bio,
    nickname:     primary.nickname,
    birthday:     primary.birthday,
    phone:        primary.phone,
    blood_type:   primary.blood_type,
    allergies:    primary.allergies,
    medications:  primary.medications,
    medical_notes: primary.medical_notes,
    emergency_contact_name:     primary.emergency_contact_name,
    emergency_contact_phone:    primary.emergency_contact_phone,
    emergency_contact_relation: primary.emergency_contact_relation,
    families,
    primary_family_id: primary.family_id,
    primary_member_id: primary.id,
  });
}
