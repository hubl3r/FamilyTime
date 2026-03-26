// src/app/api/calls/signal/route.ts
// POST — store a WebRTC signal in DB for polling
// GET  — fetch pending signals for current user

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

// GET /api/calls/signal?channel_id=xxx&after=<timestamp>
// Returns signals meant for current user since timestamp
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channelId = req.nextUrl.searchParams.get("channel_id");
  const after     = req.nextUrl.searchParams.get("after") ?? new Date(Date.now() - 30000).toISOString();

  if (!channelId) return NextResponse.json({ error: "channel_id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("webrtc_signals")
    .select("*")
    .eq("channel_id", channelId)
    .neq("from_user_id", user.id) // don't return own signals
    .or(`to_user_id.is.null,to_user_id.eq.${user.id}`) // broadcast or targeted
    .gt("created_at", after)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/calls/signal
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { channel_id, session_id, type, payload, to_user_id } = body;

  if (!type || !channel_id) return NextResponse.json({ error: "type and channel_id required" }, { status: 400 });

  // Get sender info
  const { data: member } = await supabaseAdmin
    .from("family_members")
    .select("first_name, last_name, initials, color")
    .eq("nextauth_user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from("webrtc_signals")
    .insert({
      channel_id,
      session_id:    session_id ?? null,
      from_user_id:  user.id,
      to_user_id:    to_user_id ?? null,
      type,
      payload:       payload ?? null,
      from_name:     member ? `${member.first_name} ${member.last_name}` : "Someone",
      from_initials: member?.initials ?? "?",
      from_color:    member?.color ?? "#E8A5A5",
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE /api/calls/signal?channel_id=xxx — cleanup old signals
export async function DELETE(req: NextRequest) {
  const channelId = req.nextUrl.searchParams.get("channel_id");
  if (!channelId) return NextResponse.json({ error: "channel_id required" }, { status: 400 });

  // Delete signals older than 60 seconds
  await supabaseAdmin
    .from("webrtc_signals")
    .delete()
    .eq("channel_id", channelId)
    .lt("created_at", new Date(Date.now() - 60000).toISOString());

  return NextResponse.json({ success: true });
}
