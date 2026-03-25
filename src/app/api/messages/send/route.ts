// src/app/api/messages/send/route.ts
// POST   — send an encrypted message to a channel
// DELETE — soft-delete a message

import { NextRequest, NextResponse } from "next/server";
import { getSessionMemberForFamily } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { encryptField, decryptField } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const member = await getSessionMemberForFamily(req);
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { channel_id, text, parent_id } = body;

  if (!channel_id || !text?.trim()) {
    return NextResponse.json({ error: "channel_id and text are required" }, { status: 400 });
  }

  // Verify membership + can_post
  const { data: cm } = await supabaseAdmin
    .from("channel_members")
    .select("can_post")
    .eq("channel_id", channel_id)
    .eq("member_id", member.id)
    .maybeSingle();

  if (!cm) return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
  if (cm.can_post === false) return NextResponse.json({ error: "You cannot post in this channel" }, { status: 403 });

  // Encrypt the message body before storing
  const encryptedBody = encryptField(text.trim());

  const { data: message, error } = await supabaseAdmin
    .from("messages")
    .insert({
      family_id:  member.family_id,
      channel_id,
      sender_id:  member.id,
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

  // Decrypt before returning to client
  const decrypted = { ...message, body: decryptField(message.body) };

  // Update last_read_at for the sender
  await supabaseAdmin
    .from("channel_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("channel_id", channel_id)
    .eq("member_id", member.id);

  return NextResponse.json(decrypted, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const member = await getSessionMemberForFamily(req);
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message_id } = await req.json();
  if (!message_id) return NextResponse.json({ error: "message_id required" }, { status: 400 });

  const { data: msg } = await supabaseAdmin
    .from("messages")
    .select("sender_id")
    .eq("id", message_id)
    .maybeSingle();

  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const isPrivileged = member.role === "owner" || member.role === "admin";
  if (msg.sender_id !== member.id && !isPrivileged) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabaseAdmin
    .from("messages")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", message_id);

  return NextResponse.json({ success: true });
}
