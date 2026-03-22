// src/app/api/family/setup/route.ts
// POST: Create a new family (caller becomes owner)
// GET:  Return the current user's family + member record
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = session.user.email.toLowerCase().trim();

  // Find member record for this user
  const { data: member } = await supabaseAdmin
    .from("family_members")
    .select("id, family_id, role, first_name, last_name, email, is_active")
    .eq("email", email)
    .eq("is_active", true)
    .single();

  if (!member) return NextResponse.json({ family: null, member: null });

  const { data: family } = await supabaseAdmin
    .from("families")
    .select("id, name, code, created_at")
    .eq("id", member.family_id)
    .single();

  // Get all active members of this family
  const { data: members } = await supabaseAdmin
    .from("family_members")
    .select("id, first_name, last_name, email, role, is_active, avatar_color")
    .eq("family_id", member.family_id)
    .eq("is_active", true);

  return NextResponse.json({ family, member, members: members ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = session.user.email.toLowerCase().trim();
  const { familyName, firstName, lastName } = await req.json();

  if (!familyName?.trim()) return NextResponse.json({ error: "Family name is required" }, { status: 400 });

  // Check if already in a family
  const { data: existing } = await supabaseAdmin
    .from("family_members")
    .select("id")
    .eq("email", email)
    .eq("is_active", true)
    .single();

  if (existing) return NextResponse.json({ error: "Already in a family" }, { status: 400 });

  // Create family with unique code
  let code = randomCode();
  // Ensure uniqueness
  let tries = 0;
  while (tries < 5) {
    const { data: clash } = await supabaseAdmin.from("families").select("id").eq("code", code).single();
    if (!clash) break;
    code = randomCode();
    tries++;
  }

  const { data: family, error: familyErr } = await supabaseAdmin
    .from("families")
    .insert({ name: familyName.trim(), code })
    .select()
    .single();

  if (familyErr || !family) return NextResponse.json({ error: "Failed to create family" }, { status: 500 });

  // Look up user id
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, name")
    .eq("email", email)
    .single();

  const nameParts = (firstName || user?.name || email.split("@")[0]).trim().split(" ");
  const fn = firstName?.trim() || nameParts[0];
  const ln = lastName?.trim() || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "");

  // Add caller as owner
  const { data: member, error: memberErr } = await supabaseAdmin
    .from("family_members")
    .insert({
      family_id: family.id,
      user_id: user?.id ?? null,
      email,
      first_name: fn,
      last_name: ln,
      role: "owner",
      is_active: true,
    })
    .select()
    .single();

  if (memberErr || !member) {
    // Rollback family
    await supabaseAdmin.from("families").delete().eq("id", family.id);
    return NextResponse.json({ error: "Failed to create member record" }, { status: 500 });
  }

  return NextResponse.json({ family, member });
}