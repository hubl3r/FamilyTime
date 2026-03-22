// src/app/api/family/search/route.ts
// GET ?q=name or ?code=ABC123 — search for families to join
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q    = searchParams.get("q")?.trim();
  const code = searchParams.get("code")?.trim().toUpperCase();

  if (!q && !code) return NextResponse.json({ error: "Provide q or code" }, { status: 400 });

  let query = supabaseAdmin.from("families").select("id, name, code");

  if (code) {
    query = query.eq("code", code);
  } else if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error } = await query.limit(10);
  if (error) return NextResponse.json({ error: "Search failed" }, { status: 500 });

  // Mask the code for name searches — only show full code when exact code match
  const results = (data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    code: code ? f.code : f.code.substring(0, 2) + "****",
  }));

  return NextResponse.json({ results });
}