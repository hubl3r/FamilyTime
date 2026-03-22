// src/app/api/members/[id]/resend-invite/route.ts
// POST — resend the invite email to a pending member
import { NextRequest, NextResponse } from "next/server";
import { getSessionMember } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";
import { sendResendInviteEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const sessionMember = await getSessionMember();
  if (!sessionMember) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (sessionMember.role !== "owner" && sessionMember.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: target, error: fetchErr } = await supabaseAdmin
    .from("family_members")
    .select("id, family_id, email, first_name, invite_status, is_active")
    .eq("id", id)
    .eq("family_id", sessionMember.family_id)
    .single();

  if (fetchErr || !target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (!target.is_active) return NextResponse.json({ error: "Member is inactive" }, { status: 400 });
  if (target.invite_status === "accepted") return NextResponse.json({ error: "Member already accepted invite" }, { status: 400 });

  // Rotate token so stale links cannot be reused
  const new_token = crypto.randomBytes(32).toString("hex");
  await supabaseAdmin
    .from("family_members")
    .update({ invite_token: new_token, invite_status: "pending", updated_at: new Date().toISOString() })
    .eq("id", id);

  try {
    const { data: family } = await supabaseAdmin.from("families").select("name").eq("id", sessionMember.family_id).single();
    await sendResendInviteEmail({
      to: target.email,
      firstName: target.first_name,
      inviteToken: new_token,
      familyName: family?.name ?? "the family",
    });
  } catch (emailErr) {
    console.error("[RESEND INVITE] Email failed:", emailErr);
  }

  return NextResponse.json({ success: true });
}
