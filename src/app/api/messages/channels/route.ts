// src/app/api/messages/channels/route.ts
// GET  — all channels for current user (family channels + cross-family DMs/groups)
// POST — create channel
// DELETE — clear or delete a channel

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptField } from "@/lib/crypto";

async function getCurrentUser(session: { user?: { email?: string | null } } | null) {
  if (!session?.user?.email) return null;
  const { data } = await supabaseAdmin
    .from("users")
    .select("id, email, name")
    .eq("email", session.user.email.toLowerCase().trim())
    .maybeSingle();
  return data;
}

async function enrichChannel(channelId: string, userId: string, lastReadAt: string | null, isMuted: boolean) {
  const { data: channel } = await supabaseAdmin
    .from("channels")
    .select("id, name, type, description, icon, is_archived, created_at, created_by, family_id, is_family_channel")
    .eq("id", channelId)
    .maybeSingle();

  if (!channel) return null;

  const { data: members } = await supabaseAdmin
    .from("channel_members")
    .select("user_id, member_id")
    .eq("channel_id", channelId);

  const { data: lastMsg } = await supabaseAdmin
    .from("messages")
    .select("id, body, created_at, sender_id")
    .eq("channel_id", channelId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: unread } = await supabaseAdmin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("channel_id", channelId)
    .eq("is_deleted", false)
    .gt("created_at", lastReadAt ?? "1970-01-01");

  // For DMs, get the other person's info
  let dmContact = null;
  if (channel.type === "direct") {
    const otherUserId = (members ?? []).find(m => m.user_id !== userId)?.user_id;
    if (otherUserId) {
      const { data: fm } = await supabaseAdmin
        .from("family_members")
        .select("first_name, last_name, initials, color, email")
        .eq("nextauth_user_id", otherUserId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      dmContact = fm;
    }
  }

  // For group chats, get participant names
  let groupParticipants: { first_name: string; initials: string; color: string }[] = [];
  if (channel.type === "group") {
    for (const m of (members ?? [])) {
      if (m.user_id === userId) continue;
      const { data: fm } = await supabaseAdmin
        .from("family_members")
        .select("first_name, initials, color")
        .eq("nextauth_user_id", m.user_id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (fm) groupParticipants.push(fm);
    }
  }

  return {
    ...channel,
    last_read_at:       lastReadAt,
    is_muted:           isMuted,
    dm_contact:         dmContact,
    group_participants: groupParticipants,
    member_count:       (members ?? []).length,
    last_message:       lastMsg ? { ...lastMsg, body: decryptField((lastMsg as { body?: string }).body) } : null,
    unread_count:       unread ?? 0,
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: memberships, error } = await supabaseAdmin
    .from("channel_members")
    .select("channel_id, last_read_at, is_muted, user_id")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all(
    (memberships ?? []).map(cm =>
      enrichChannel(cm.channel_id, user.id, cm.last_read_at, cm.is_muted ?? false)
    )
  );

  const channels = (enriched.filter(Boolean) as NonNullable<typeof enriched[0]>[])
    .sort((a, b) => {
      const aTime = a!.last_message?.created_at ?? a!.created_at;
      const bTime = b!.last_message?.created_at ?? b!.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

  return NextResponse.json(channels);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, name, description, icon, user_ids = [], family_id } = body;

  if (!type) return NextResponse.json({ error: "type is required" }, { status: 400 });

  const isFamilyChannel = type === "family";
  const allUserIds = [...new Set([user.id, ...user_ids])];

  // For DMs — check if one already exists
  if (type === "direct") {
    const otherId = user_ids[0];
    if (!otherId) return NextResponse.json({ error: "user_ids required for direct channel" }, { status: 400 });

    const { data: myChannels } = await supabaseAdmin
      .from("channel_members")
      .select("channel_id")
      .eq("user_id", user.id);

    const myChannelIds = (myChannels ?? []).map(c => c.channel_id);

    if (myChannelIds.length > 0) {
      const { data: shared } = await supabaseAdmin
        .from("channel_members")
        .select("channel_id, channels:channel_id(type)")
        .eq("user_id", otherId)
        .in("channel_id", myChannelIds);

      const existingDm = (shared ?? []).find(
        s => (s.channels as unknown as { type: string } | null)?.type === "direct"
      );
      if (existingDm) return NextResponse.json({ channel_id: existingDm.channel_id, exists: true });
    }
  }

  // Determine family_id for the channel record
  let channelFamilyId = family_id ?? null;
  if (!channelFamilyId) {
    const { data: fm } = await supabaseAdmin
      .from("family_members")
      .select("family_id")
      .eq("nextauth_user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    channelFamilyId = fm?.family_id ?? null;
  }

  if (!channelFamilyId) return NextResponse.json({ error: "Could not determine family_id" }, { status: 400 });

  // Get creator's member_id
  const { data: creatorMember } = await supabaseAdmin
    .from("family_members")
    .select("id")
    .eq("nextauth_user_id", user.id)
    .eq("family_id", channelFamilyId)
    .eq("is_active", true)
    .maybeSingle();

  const { data: channel, error: channelErr } = await supabaseAdmin
    .from("channels")
    .insert({
      family_id:         channelFamilyId,
      name:              name?.trim() || null,
      type,
      description:       description?.trim() || null,
      icon:              icon || null,
      created_by:        creatorMember?.id ?? null,
      is_archived:       false,
      is_family_channel: isFamilyChannel,
    })
    .select("id")
    .single();

  if (channelErr || !channel) {
    return NextResponse.json({ error: channelErr?.message ?? "Failed to create channel" }, { status: 500 });
  }

  // Add all participants using user_id
  for (const uid of allUserIds) {
    const { data: fm } = await supabaseAdmin
      .from("family_members")
      .select("id")
      .eq("nextauth_user_id", uid)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    await supabaseAdmin
      .from("channel_members")
      .insert({
        channel_id:   channel.id,
        member_id:    fm?.id ?? creatorMember?.id,
        user_id:      uid,
        can_post:     true,
        can_react:    true,
        can_delete:   uid === user.id,
        joined_at:    new Date().toISOString(),
        last_read_at: new Date().toISOString(),
      });
  }

  return NextResponse.json({ channel_id: channel.id, exists: false }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channelId = req.nextUrl.searchParams.get("channel_id");
  const action    = req.nextUrl.searchParams.get("action") ?? "clear";
  if (!channelId) return NextResponse.json({ error: "channel_id required" }, { status: 400 });

  const { data: cm } = await supabaseAdmin
    .from("channel_members")
    .select("id")
    .eq("channel_id", channelId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!cm) return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });

  if (action === "clear") {
    await supabaseAdmin
      .from("messages")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("channel_id", channelId);
    return NextResponse.json({ success: true, action: "cleared" });
  }

  if (action === "delete") {
    await supabaseAdmin.from("messages").delete().eq("channel_id", channelId);
    await supabaseAdmin.from("channel_members").delete().eq("channel_id", channelId);
    await supabaseAdmin.from("channels").delete().eq("id", channelId);
    return NextResponse.json({ success: true, action: "deleted" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
