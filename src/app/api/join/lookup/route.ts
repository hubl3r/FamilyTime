// src/app/api/join/lookup/route.ts
// GET /api/join/lookup?code=XXXXX
// Public — no auth required. Returns minimal family info if code matches.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase().trim();
  if (!code || code.length < 4) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("families")
    .select("id, name, invite_code, is_searchable")
    .eq("invite_code", code)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Invite code not found" }, { status: 404 });
  }

  // Count active members
  const { count } = await supabaseAdmin
    .from("family_members")
    .select("id", { count: "exact", head: true })
    .eq("family_id", data.id)
    .eq("is_active", true);

  return NextResponse.json({
    family_id:    data.id,
    family_name:  data.name,
    member_count: count ?? 0,
    invite_code:  data.invite_code,
  });
}
