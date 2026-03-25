// src/app/api/messages/channels/route.ts
// GET  — list all channels the current user is a member of
// POST — create a new channel (family, group, or direct)

import { NextRequest, NextResponse } from "next/server";
import { getSessionMemberForFamily } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptField } from "@/lib/crypto";

// GET /api/messages/channels?family_id=xxx
export async function GET(req: NextRequest) {
  const member = await getSessionMemberForFamily(req);
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all channels this member belongs to in this family
  const { data: channelMembers, error } = await supabaseAdmin
    .from("channel_members")
    .select(`
      channel_id, last_read_at, is_muted,
      channels:channel_id (
        id, name, type, description, icon, is_archived, created_at, created_by,
        family_id
      )
    `)
    .eq("member_id", member.id)
    .order("joined_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // For each channel, get the last message and unread count
  const channels = await Promise.all((channelMembers ?? []).map(async cm => {
    const channel = cm.channels as unknown as {
      id: string; name: string; type: string; description: string | null;
      icon: string | null; is_archived: boolean; created_at: string;
      created_by: string; family_id: string;
    } | null;

    if (!channel || channel.family_id !== member.family_id) return null;

    // Last message
    const { data: lastMsg } = await supabaseAdmin
      .from("messages")
      .select(`
        id, body, created_at,
        sender:sender_id ( first_name, last_name, initials, color )
      `)
      .eq("channel_id", channel.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Unread count
    const { count: unread } = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("channel_id", channel.id)
      .eq("is_deleted", false)
      .gt("created_at", cm.last_read_at ?? "1970-01-01");

    return {
      ...channel,
      last_read_at:  cm.last_read_at,
      is_muted:      cm.is_muted,
      last_message:  lastMsg ? { ...lastMsg, body: decryptField((lastMsg as { body?: string }).body) } : null,
      unread_count:  unread ?? 0,
    };
  }));

  return NextResponse.json(channels.filter(Boolean));
}

// POST /api/messages/channels
// Body: { type: "family"|"group"|"direct", name?, description?, icon?, member_ids?: string[] }
export async function POST(req: NextRequest) {
  const member = await getSessionMemberForFamily(req);
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, name, description, icon, member_ids = [] } = body;

  if (!type) return NextResponse.json({ error: "type is required" }, { status: 400 });

  // For direct messages, check if one already exists between these two members
  if (type === "direct") {
    const otherId = member_ids[0];
    if (!otherId) return NextResponse.json({ error: "member_ids required for direct channel" }, { status: 400 });

    // Find existing DM channel both members share
    const { data: existing } = await supabaseAdmin
      .from("channel_members")
      .select("channel_id, channels:channel_id(type)")
      .eq("member_id", member.id)
      .then(async ({ data }) => {
        const myChannels = (data ?? []).map(d => d.channel_id);
        return supabaseAdmin
          .from("channel_members")
          .select("channel_id, channels:channel_id(type)")
          .eq("member_id", otherId)
          .in("channel_id", myChannels);
      });

    const existingDm = (existing ?? []).find(
      d => (d.channels as unknown as { type: string } | null)?.type === "direct"
    );

    if (existingDm) {
      return NextResponse.json({ channel_id: existingDm.channel_id, exists: true });
    }
  }

  // Create the channel
  const { data: channel, error: channelErr } = await supabaseAdmin
    .from("channels")
    .insert({
      family_id:   member.family_id,
      name:        name?.trim() || null,
      type,
      description: description?.trim() || null,
      icon:        icon || null,
      created_by:  member.id,
      is_archived: false,
    })
    .select("id")
    .single();

  if (channelErr || !channel) {
    return NextResponse.json({ error: channelErr?.message ?? "Failed to create channel" }, { status: 500 });
  }

  // Add the creator as a member
  const allMemberIds = [...new Set([member.id, ...member_ids])];
  await supabaseAdmin
    .from("channel_members")
    .insert(allMemberIds.map(mid => ({
      channel_id: channel.id,
      member_id:  mid,
      can_post:   true,
      can_react:  true,
      can_delete: mid === member.id,
      joined_at:  new Date().toISOString(),
      last_read_at: new Date().toISOString(),
    })));

  return NextResponse.json({ channel_id: channel.id, exists: false }, { status: 201 });
}
