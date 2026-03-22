// src/app/api/members/join-requests/route.ts
// GET  — list pending join requests for this family
// PATCH — approve or deny a request

import { NextRequest, NextResponse } from "next/server";
import { getSessionMember } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

const AVATAR_COLORS = [
  "#E8A5A5", "#B5A8D4", "#A8C8E8", "#A8C5A0", "#F0C4A0",
  "#C8A8D4", "#A8D4C8", "#D4C8A8", "#D4A8B5", "#A8B5D4",
];

// ── GET /api/members/join-requests ────────────────────────────
export async function GET() {
  const sessionMember = await getSessionMember();
  if (!sessionMember) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (sessionMember.role !== "owner" && sessionMember.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("join_requests")
    .select("id, first_name, last_name, email, message, status, created_at")
    .eq("family_id", sessionMember.family_id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

// ── PATCH /api/members/join-requests ─────────────────────────
// Body: { request_id, action: "approve" | "deny", role?: MemberRole, color?: string }
export async function PATCH(req: NextRequest) {
  const sessionMember = await getSessionMember();
  if (!sessionMember) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (sessionMember.role !== "owner" && sessionMember.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { request_id, action, role = "member", color } = body;

  if (!request_id || !["approve", "deny"].includes(action)) {
    return NextResponse.json({ error: "request_id and action (approve|deny) are required" }, { status: 400 });
  }

  // Fetch the request
  const { data: joinReq } = await supabaseAdmin
    .from("join_requests")
    .select("*")
    .eq("id", request_id)
    .eq("family_id", sessionMember.family_id)
    .eq("status", "pending")
    .single();

  if (!joinReq) return NextResponse.json({ error: "Request not found or already handled" }, { status: 404 });

  if (action === "deny") {
    await supabaseAdmin
      .from("join_requests")
      .update({ status: "denied", reviewed_by: sessionMember.id, reviewed_at: new Date().toISOString() })
      .eq("id", request_id);

    // TODO: notify applicant via email
    console.log(`[JOIN REQUEST] Denied: ${joinReq.first_name} ${joinReq.last_name} <${joinReq.email}>`);
    return NextResponse.json({ success: true, action: "denied" });
  }

  // ── APPROVE ──────────────────────────────────────────────────
  // Prevent duplicates
  const { data: existingMember } = await supabaseAdmin
    .from("family_members")
    .select("id")
    .eq("family_id", sessionMember.family_id)
    .eq("email", joinReq.email)
    .single();

  if (existingMember) {
    await supabaseAdmin
      .from("join_requests")
      .update({ status: "approved", reviewed_by: sessionMember.id, reviewed_at: new Date().toISOString() })
      .eq("id", request_id);
    return NextResponse.json({ error: "Member with this email already exists" }, { status: 409 });
  }

  const initials = `${(joinReq.first_name[0] ?? "").toUpperCase()}${(joinReq.last_name[0] ?? "").toUpperCase()}`;
  const assignedColor = color || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const invite_token = crypto.randomBytes(32).toString("hex");

  // Create the family member record
  const { data: newMember, error: insertErr } = await supabaseAdmin
    .from("family_members")
    .insert({
      family_id:    sessionMember.family_id,
      email:        joinReq.email,
      first_name:   joinReq.first_name,
      last_name:    joinReq.last_name,
      initials,
      color:        assignedColor,
      role,
      is_active:    true,
      invite_status: "pending",
      invite_token,
    })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Mark request approved
  await supabaseAdmin
    .from("join_requests")
    .update({
      status:      "approved",
      reviewed_by: sessionMember.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", request_id);

  // Notify applicant
  try {
    const inviteUrl = `${process.env.NEXTAUTH_URL}/accept-invite?token=${invite_token}`;
    // TODO: send email to joinReq.email
    console.log(`[JOIN REQUEST] Approved: ${joinReq.first_name} ${joinReq.last_name} — invite: ${inviteUrl}`);
  } catch (emailErr) {
    console.error("[JOIN REQUEST] Approval email failed:", emailErr);
  }

  return NextResponse.json({ success: true, action: "approved", member: newMember });
}
