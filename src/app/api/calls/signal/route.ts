// src/app/api/calls/signal/route.ts
// POST — send a WebRTC signal (offer, answer, ice-candidate, call-invite, call-end)
// Uses Supabase Realtime broadcast to relay signals between peers

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client for broadcast
const supabaseBroadcast = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getCurrentUser(session: { user?: { email?: string | null } } | null) {
  if (!session?.user?.email) return null;
  const { data } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("email", session.user.email.toLowerCase().trim())
    .maybeSingle();
  return data;
}

// POST /api/calls/signal
// Body: { session_id, channel_id, type, payload, to_user_id? }
// type: "call-invite" | "call-accepted" | "call-declined" | "call-ended"
//       "offer" | "answer" | "ice-candidate" | "peer-joined" | "peer-left"
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { session_id, channel_id, type, payload, to_user_id } = body;

  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

  // Get sender info for display
  const { data: senderMember } = await supabaseAdmin
    .from("family_members")
    .select("first_name, last_name, initials, color")
    .eq("nextauth_user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const signal = {
    type,
    from_user_id: user.id,
    from_name:    senderMember ? `${senderMember.first_name} ${senderMember.last_name}` : "Someone",
    from_initials: senderMember?.initials ?? "?",
    from_color:   senderMember?.color ?? "#E8A5A5",
    to_user_id:   to_user_id ?? null,
    session_id:   session_id ?? null,
    channel_id:   channel_id ?? null,
    payload:      payload ?? null,
    timestamp:    new Date().toISOString(),
  };

  // Broadcast on the channel's signaling room
  const roomId = channel_id ?? session_id;
  if (!roomId) return NextResponse.json({ error: "channel_id or session_id required" }, { status: 400 });

  await supabaseBroadcast
    .channel(`calls:${roomId}`)
    .send({
      type:    "broadcast",
      event:   "signal",
      payload: signal,
    });

  return NextResponse.json({ success: true });
}
