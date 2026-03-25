// src/app/api/messages/channels/[id]/route.ts
// GET   — fetch and decrypt messages for a channel
// PATCH — mark channel as read

import { NextRequest, NextResponse } from "next/server";
import { getSessionMemberForFamily } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptField } from "@/lib/crypto";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id: channelId } = await params;
  const member = await getSessionMemberForFamily(req);
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify membership
  const { data: membership } = await supabaseAdmin
    .from("channel_members")
    .select("id")
    .eq("channel_id", channelId)
    .eq("member_id", member.id)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });

  const before = req.nextUrl.searchParams.get("before");
  const limit  = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 100);

  let query = supabaseAdmin
    .from("messages")
    .select(`
      id, body, type, parent_id, is_edited, edited_at, is_deleted, created_at,
      sender:sender_id (
        id, first_name, last_name, initials, color, email
      )
    `)
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("created_at", before);

  const { data: messages, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Decrypt message bodies, return oldest first
  const decrypted = (messages ?? [])
    .reverse()
    .map(m => ({
      ...m,
      body: m.is_deleted ? null : decryptField(m.body),
    }));

  return NextResponse.json(decrypted);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: channelId } = await params;
  const member = await getSessionMemberForFamily(req);
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabaseAdmin
    .from("channel_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("channel_id", channelId)
    .eq("member_id", member.id);

  return NextResponse.json({ success: true });
}
