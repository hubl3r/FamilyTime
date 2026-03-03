// src/app/api/members/[id]/resend-invite/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionMember } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionMember = await getSessionMember();
  if (!sessionMember) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (sessionMember.role !== "owner" && sessionMember.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: target } = await supabaseAdmin
    .from("family_members")
    .select("id, email, first_name, invite_status, family_id")
    .eq("id", params.id)
    .eq("family_id", sessionMember.family_id)
    .single();

  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (target.invite_status !== "pending") {
    return NextResponse.json({ error: "Invite is not in pending status" }, { status: 400 });
  }

  // Refresh the invite token
  const new_token = crypto.randomBytes(32).toString("hex");
  await supabaseAdmin
    .from("family_members")
    .update({ invite_token: new_token, updated_at: new Date().toISOString() })
    .eq("id", target.id);

  const inviteUrl = `${process.env.NEXTAUTH_URL}/accept-invite?token=${new_token}`;

  // TODO: Send email here
  console.log(`[RESEND INVITE] ${target.first_name} <${target.email}> — ${inviteUrl}`);

  return NextResponse.json({ success: true });
}