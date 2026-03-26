// src/app/api/calls/session/route.ts
// POST — create a new call session
// PATCH — update session status (end call, update participant)
// GET — get active session for a channel

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";

async function getCurrentUser(session: { user?: { email?: string | null } } | null) {
  if (!session?.user?.email) return null;
  const { data } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("email", session.user.email.toLowerCase().trim())
    .maybeSingle();
  return data;
}

// GET /api/calls/session?channel_id=xxx
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channelId = req.nextUrl.searchParams.get("channel_id");
  if (!channelId) return NextResponse.json({ error: "channel_id required" }, { status: 400 });

  const { data } = await supabaseAdmin
    .from("webrtc_sessions")
    .select(`
      id, type, status, started_at, channel_id,
      initiated_by_user_id,
      participants:webrtc_participants(
        id, user_id, status, joined_at
      )
    `)
    .eq("channel_id", channelId)
    .eq("status", "active")
    .maybeSingle();

  return NextResponse.json(data ?? null);
}

// POST /api/calls/session
// Body: { channel_id, type: "video"|"audio", family_id }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { channel_id, type = "video", family_id } = body;
  if (!channel_id) return NextResponse.json({ error: "channel_id required" }, { status: 400 });

  // Get family_id from channel if not provided
  let famId = family_id;
  if (!famId) {
    const { data: ch } = await supabaseAdmin
      .from("channels")
      .select("family_id")
      .eq("id", channel_id)
      .maybeSingle();
    famId = ch?.family_id;
  }

  // Get member_id for this user
  const { data: member } = await supabaseAdmin
    .from("family_members")
    .select("id")
    .eq("nextauth_user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  // Create session
  const { data: callSession, error } = await supabaseAdmin
    .from("webrtc_sessions")
    .insert({
      family_id:            famId,
      channel_id,
      type,
      status:               "active",
      started_at:           new Date().toISOString(),
      initiated_by:         member?.id,
      initiated_by_user_id: user.id,
    })
    .select("id")
    .single();

  if (error || !callSession) {
    return NextResponse.json({ error: error?.message ?? "Failed to create session" }, { status: 500 });
  }

  // Add initiator as first participant
  await supabaseAdmin
    .from("webrtc_participants")
    .insert({
      session_id: callSession.id,
      member_id:  member?.id,
      user_id:    user.id,
      status:     "connected",
      joined_at:  new Date().toISOString(),
    });

  return NextResponse.json({ session_id: callSession.id }, { status: 201 });
}

// PATCH /api/calls/session
// Body: { session_id, action: "join"|"leave"|"end" }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { session_id, action } = body;
  if (!session_id || !action) return NextResponse.json({ error: "session_id and action required" }, { status: 400 });

  const { data: member } = await supabaseAdmin
    .from("family_members")
    .select("id")
    .eq("nextauth_user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (action === "join") {
    // Check participant count
    const { count } = await supabaseAdmin
      .from("webrtc_participants")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session_id)
      .eq("status", "connected");

    if ((count ?? 0) >= 4) {
      return NextResponse.json({ error: "Call is full (max 4 participants)" }, { status: 409 });
    }

    // Upsert participant
    await supabaseAdmin
      .from("webrtc_participants")
      .upsert({
        session_id,
        member_id: member?.id,
        user_id:   user.id,
        status:    "connected",
        joined_at: new Date().toISOString(),
        left_at:   null,
      }, { onConflict: "session_id,user_id" });

    return NextResponse.json({ success: true, action: "joined" });
  }

  if (action === "leave") {
    await supabaseAdmin
      .from("webrtc_participants")
      .update({ status: "disconnected", left_at: new Date().toISOString() })
      .eq("session_id", session_id)
      .eq("user_id", user.id);

    // Check if anyone is still connected
    const { count } = await supabaseAdmin
      .from("webrtc_participants")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session_id)
      .eq("status", "connected");

    // End session if empty
    if ((count ?? 0) === 0) {
      const started = await supabaseAdmin
        .from("webrtc_sessions")
        .select("started_at")
        .eq("id", session_id)
        .maybeSingle();

      const durationSec = started.data?.started_at
        ? Math.round((Date.now() - new Date(started.data.started_at).getTime()) / 1000)
        : 0;

      await supabaseAdmin
        .from("webrtc_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString(), duration_sec: durationSec })
        .eq("id", session_id);
    }

    return NextResponse.json({ success: true, action: "left" });
  }

  if (action === "end") {
    await supabaseAdmin
      .from("webrtc_participants")
      .update({ status: "disconnected", left_at: new Date().toISOString() })
      .eq("session_id", session_id);

    await supabaseAdmin
      .from("webrtc_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", session_id);

    return NextResponse.json({ success: true, action: "ended" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
