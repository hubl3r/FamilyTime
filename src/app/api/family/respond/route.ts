// src/app/api/family/invite/respond/route.ts
// POST — accept or decline an invite or join-request
// Body: { inviteId, action: "accept" | "decline", firstName?, lastName? }
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = session.user.email.toLowerCase().trim();
  const { inviteId, action, firstName, lastName } = await req.json();

  if (!inviteId || !action) return NextResponse.json({ error: "inviteId and action required" }, { status: 400 });
  if (action !== "accept" && action !== "decline") return NextResponse.json({ error: "action must be accept or decline" }, { status: 400 });

  const { data: invite } = await supabaseAdmin
    .from("family_invites")
    .select("id, family_id, invited_email, type, status")
    .eq("id", inviteId)
    .single();

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.status !== "pending") return NextResponse.json({ error: "Invite already resolved" }, { status: 400 });

  // Auth check:
  // - "invite" type: only the invited_email user can respond
  // - "request" type: only owner/admin of that family can respond
  if (invite.type === "invite") {
    if (invite.invited_email !== email) return NextResponse.json({ error: "Not your invite" }, { status: 403 });
  } else if (invite.type === "request") {
    const { data: me } = await supabaseAdmin
      .from("family_members")
      .select("role")
      .eq("email", email)
      .eq("family_id", invite.family_id)
      .eq("is_active", true)
      .single();
    if (!me || (me.role !== "owner" && me.role !== "admin"))
      return NextResponse.json({ error: "Only owner/admin can approve requests" }, { status: 403 });
  }

  if (action === "decline") {
    await supabaseAdmin.from("family_invites").update({ status: "declined" }).eq("id", inviteId);
    return NextResponse.json({ ok: true });
  }

  // Accept — create member record
  const targetEmail = invite.invited_email;
  const { data: user } = await supabaseAdmin.from("users").select("id, name").eq("email", targetEmail).single();
  const nameParts = (firstName || user?.name || targetEmail.split("@")[0]).trim().split(" ");
  const fn = firstName?.trim() || nameParts[0];
  const ln = lastName?.trim() || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "");

  // Check not already a member
  const { data: existing } = await supabaseAdmin
    .from("family_members")
    .select("id")
    .eq("email", targetEmail)
    .eq("family_id", invite.family_id)
    .eq("is_active", true)
    .single();

  if (existing) {
    await supabaseAdmin.from("family_invites").update({ status: "accepted" }).eq("id", inviteId);
    return NextResponse.json({ ok: true, alreadyMember: true });
  }

  const { error: memberErr } = await supabaseAdmin.from("family_members").insert({
    family_id: invite.family_id,
    user_id: user?.id ?? null,
    email: targetEmail,
    first_name: fn,
    last_name: ln,
    role: "member",
    is_active: true,
  });

  if (memberErr) return NextResponse.json({ error: "Failed to add member" }, { status: 500 });

  await supabaseAdmin.from("family_invites").update({ status: "accepted" }).eq("id", inviteId);
  return NextResponse.json({ ok: true });
}