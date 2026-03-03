// src/app/api/family/route.ts
// GET  — get this family's info (name, invite_code, is_searchable)
// PATCH — update name, toggle searchable, regenerate invite code

import { NextRequest, NextResponse } from "next/server";
import { getSessionMember } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

function generateInviteCode(familyName: string): string {
  // e.g. "SMITH-4F" — first word of name + 2 random hex chars
  const prefix = familyName
    .split(" ")[0]
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}

export async function GET() {
  const sessionMember = await getSessionMember();
  if (!sessionMember) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("families")
    .select("id, name, invite_code, is_searchable, created_at")
    .eq("id", sessionMember.family_id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Family not found" }, { status: 404 });

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const sessionMember = await getSessionMember();
  if (!sessionMember) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (sessionMember.role !== "owner" && sessionMember.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if ("name" in body) updates.name = body.name;
  if ("is_searchable" in body) updates.is_searchable = body.is_searchable;

  if (body.regenerate_code) {
    // Fetch current name to generate code
    const { data: fam } = await supabaseAdmin
      .from("families")
      .select("name")
      .eq("id", sessionMember.family_id)
      .single();
    updates.invite_code = generateInviteCode(fam?.name ?? "FAM");
  }

  const { data, error } = await supabaseAdmin
    .from("families")
    .update(updates)
    .eq("id", sessionMember.family_id)
    .select("id, name, invite_code, is_searchable")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}