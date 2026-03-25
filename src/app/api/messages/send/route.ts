// src/app/api/messages/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";
import { encryptField, decryptField } from "@/lib/crypto";

async function getCurrentUser(session: { user?: { email?: string | null } } | null) {
  if (!session?.user?.email) return null;
  const { data } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", session.user.email.toLowerCase().trim())
    .maybeSingle();
  return data;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { channel_id, text, parent_id } = body;
  if (!channel_id || !text?.trim()) {
    return NextResponse.json({ error: "channel_id and text are required" }, { status: 400 });
  }

  // Verify membership by user_id
  const { data: cm } = await supabaseAdmin
    .from("channel_members")
    .select("can_post, member_id")
    .eq("channel_id", channel_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!cm) return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
  if (cm.can_post === false) return NextResponse.json({ error: "You cannot post in this channel" }, { status: 403 });

  // Get family_id from channel for the message record
  const { data: channel } = await supabaseAdmin
    .from("channels")
    .select("family_id")
    .eq("id", channel_id)
    .maybeSingle();

  const encryptedBody = encryptField(text.trim());

  const { data: message, error } = await supabaseAdmin
    .from("messages")
    .insert({
      family_id:  channel?.family_id,
      channel_id,
      sender_id:  cm.member_id, // still store member_id for display
      body:       encryptedBody,
      type:       "text",
      parent_id:  parent_id ?? null,
      is_edited:  false,
      is_deleted: false,
    })
    .select(`
      id, body, type, parent_id, is_edited, created_at,
      sender:sender_id (
        id, first_name, last_name, initials, color, email
      )
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark as read for sender
  await supabaseAdmin
    .from("channel_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("channel_id", channel_id)
    .eq("user_id", user.id);

  return NextResponse.json({ ...message, body: decryptField(message.body) }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message_id } = await req.json();
  if (!message_id) return NextResponse.json({ error: "message_id required" }, { status: 400 });

  // Get message and verify sender via member lookup
  const { data: msg } = await supabaseAdmin
    .from("messages")
    .select("sender_id, channel_id")
    .eq("id", message_id)
    .maybeSingle();

  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  // Check if user owns this message (via family_member record)
  const { data: senderMember } = await supabaseAdmin
    .from("family_members")
    .select("nextauth_user_id")
    .eq("id", msg.sender_id)
    .maybeSingle();

  const isOwner = senderMember?.nextauth_user_id === user.id;

  // Also check if admin/owner in the family
  const { data: channel } = await supabaseAdmin
    .from("channels")
    .select("family_id")
    .eq("id", msg.channel_id)
    .maybeSingle();

  let isPrivileged = false;
  if (channel?.family_id) {
    const { data: fm } = await supabaseAdmin
      .from("family_members")
      .select("role")
      .eq("nextauth_user_id", user.id)
      .eq("family_id", channel.family_id)
      .maybeSingle();
    isPrivileged = fm?.role === "owner" || fm?.role === "admin";
  }

  if (!isOwner && !isPrivileged) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabaseAdmin
    .from("messages")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", message_id);

  return NextResponse.json({ success: true });
}
