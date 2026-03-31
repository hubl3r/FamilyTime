// src/app/api/calls/session/history/route.ts
// GET — call history for current user

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", session.user.email.toLowerCase().trim())
    .maybeSingle();

  if (!user) return NextResponse.json([]);

  // Get sessions where user participated
  const { data: participations } = await supabaseAdmin
    .from("webrtc_participants")
    .select("session_id")
    .eq("user_id", user.id);

  const sessionIds = (participations ?? []).map(p => p.session_id);
  if (sessionIds.length === 0) return NextResponse.json([]);

  const { data: sessions } = await supabaseAdmin
    .from("webrtc_sessions")
    .select("id, type, status, started_at, ended_at, duration_sec, initiated_by_user_id, channel_id")
    .in("id", sessionIds)
    .order("started_at", { ascending: false })
    .limit(50);

  return NextResponse.json(sessions ?? []);
}
