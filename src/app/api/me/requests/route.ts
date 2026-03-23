// src/app/api/me/requests/route.ts
// GET — returns all join requests submitted by the current user

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = session.user.email.toLowerCase().trim();

  const { data, error } = await supabaseAdmin
    .from("join_requests")
    .select(`
      id, status, message, created_at,
      families:family_id ( id, name )
    `)
    .eq("email", email)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
