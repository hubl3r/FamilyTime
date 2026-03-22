// src/app/api/join/search/route.ts
// GET /api/join/search?q=Smith
// Public. Returns families that have opted in to being searchable.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("families")
    .select("id, name, invite_code")
    .eq("is_searchable", true)
    .ilike("name", `%${q}%`)
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach member counts
  const results = await Promise.all(
    (data ?? []).map(async fam => {
      const { count } = await supabaseAdmin
        .from("family_members")
        .select("id", { count: "exact", head: true })
        .eq("family_id", fam.id)
        .eq("is_active", true);
      return {
        family_id:    fam.id,
        family_name:  fam.name,
        member_count: count ?? 0,
        invite_code:  fam.invite_code,
      };
    })
  );

  return NextResponse.json(results);
}