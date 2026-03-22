// src/app/api/family/invite/route.ts
// GET  — list all invites related to current user (sent by their family OR received by their email)
// POST — send an invite (owner/admin only) OR request to join a family
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";

async function getCurrentMember(email: string) {
  const { data } = await supabaseAdmin
    .from("family_members")
    .select("id, family_id, role")
    .eq("email", email)
    .eq("is_active", true)
    .single();
  return data;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = session.user.email.toLowerCase().trim();
  const member = await getCurrentMember(email);

  // Invites sent by their family
  const sentQuery = member
    ? supabaseAdmin
        .from("family_invites")
        .select("id, family_id, invited_email, invited_by_email, status, type, created_at, families(name)")
        .eq("family_id", member.family_id)
        .order("created_at", { ascending: false })
    : Promise.resolve({ data: [] });

  // Invites/requests addressed to this email
  const receivedQuery = supabaseAdmin
    .from("family_invites")
    .select("id, family_id, invited_email, invited_by_email, status, type, created_at, families(name)")
    .eq("invited_email", email)
    .order("created_at", { ascending: false });

  const [sentRes, receivedRes] = await Promise.all([sentQuery, receivedQuery]);

  return NextResponse.json({
    sent:     (sentRes as { data: unknown[] }).data ?? [],
    received: receivedRes.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = session.user.email.toLowerCase().trim();
  const body  = await req.json();

  // type: "invite" — owner/admin invites someone by email
  // type: "request" — user requests to join a family by family_id
  const { type, targetEmail, familyId } = body;

  if (type === "invite") {
    const member = await getCurrentMember(email);
    if (!member) return NextResponse.json({ error: "You are not in a family" }, { status: 403 });
    if (member.role !== "owner" && member.role !== "admin")
      return NextResponse.json({ error: "Only owners and admins can invite" }, { status: 403 });

    if (!targetEmail?.trim()) return NextResponse.json({ error: "Email required" }, { status: 400 });
    const invEmail = targetEmail.toLowerCase().trim();

    // Check already a member
    const { data: alreadyMember } = await supabaseAdmin
      .from("family_members")
      .select("id")
      .eq("email", invEmail)
      .eq("family_id", member.family_id)
      .eq("is_active", true)
      .single();

    if (alreadyMember) return NextResponse.json({ error: "Already a member of your family" }, { status: 400 });

    // Check pending invite
    const { data: pending } = await supabaseAdmin
      .from("family_invites")
      .select("id")
      .eq("invited_email", invEmail)
      .eq("family_id", member.family_id)
      .eq("status", "pending")
      .single();

    if (pending) return NextResponse.json({ error: "Invite already pending for this email" }, { status: 400 });

    const { data: invite, error } = await supabaseAdmin
      .from("family_invites")
      .insert({
        family_id: member.family_id,
        invited_email: invEmail,
        invited_by_email: email,
        type: "invite",
        status: "pending",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
    return NextResponse.json({ invite });

  } else if (type === "request") {
    if (!familyId) return NextResponse.json({ error: "familyId required" }, { status: 400 });

    const existing = await getCurrentMember(email);
    if (existing) return NextResponse.json({ error: "Already in a family" }, { status: 400 });

    // Check family exists
    const { data: family } = await supabaseAdmin.from("families").select("id, name").eq("id", familyId).single();
    if (!family) return NextResponse.json({ error: "Family not found" }, { status: 404 });

    // Check pending request
    const { data: pendingReq } = await supabaseAdmin
      .from("family_invites")
      .select("id")
      .eq("invited_email", email)
      .eq("family_id", familyId)
      .eq("status", "pending")
      .single();

    if (pendingReq) return NextResponse.json({ error: "Request already pending" }, { status: 400 });

    const { data: request, error } = await supabaseAdmin
      .from("family_invites")
      .insert({
        family_id: familyId,
        invited_email: email,
        invited_by_email: email,
        type: "request",
        status: "pending",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
    return NextResponse.json({ request });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}