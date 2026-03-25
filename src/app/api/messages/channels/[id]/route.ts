// src/app/api/messages/channels/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptField } from "@/lib/crypto";

type Params = { params: Promise<{ id: string }> };

async function getCurrentUser(session: { user?: { email?: string | null } } | null) {
  if (!session?.user?.email) return null;
  const { data } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", session.user.email.toLowerCase().trim())
    .maybeSingle();
  return data;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id: channelId } = await params;
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify membership by user_id
  const { data: membership } = await supabaseAdmin
    .from("channel_members")
    .select("id")
    .eq("channel_id", channelId)
    .eq("user_id", user.id)
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
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("created_at", before);

  const { data: messages, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const decrypted = (messages ?? [])
    .reverse()
    .map(m => ({ ...m, body: decryptField(m.body) }));

  return NextResponse.json(decrypted);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: channelId } = await params;
  const session = await getServerSession(authOptions);
  const user = await getCurrentUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabaseAdmin
    .from("channel_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("channel_id", channelId)
    .eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
