// src/app/api/members/join-requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionMember, getSessionMemberForFamily } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { sendJoinDeniedEmail } from "@/lib/email";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM    = process.env.RESEND_FROM ?? "Hubler@endurawill.com";
const APP_URL = process.env.NEXTAUTH_URL ?? "https://hubler.vercel.app";

// GET — list pending join requests for this family
export async function GET(req: NextRequest) {
  const sessionMember = await getSessionMemberForFamily(req);
  if (!sessionMember) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionMember.role !== "owner" && sessionMember.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const familyId = req.nextUrl.searchParams.get("family_id") ?? sessionMember.family_id;

  const { data, error } = await supabaseAdmin
    .from("join_requests")
    .select("id, first_name, last_name, email, message, status, created_at")
    .eq("family_id", familyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// PATCH — approve or deny a request
// Body: { request_id, action: "approve" | "deny", role?: string }
export async function PATCH(req: NextRequest) {
  const sessionMember = await getSessionMemberForFamily(req);
  if (!sessionMember) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sessionMember.role !== "owner" && sessionMember.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { request_id, action, role = "member" } = body;

  if (!request_id || !["approve", "deny"].includes(action)) {
    return NextResponse.json({ error: "request_id and action required" }, { status: 400 });
  }

  const { data: joinReq } = await supabaseAdmin
    .from("join_requests")
    .select("*")
    .eq("id", request_id)
    .eq("family_id", sessionMember.family_id)
    .eq("status", "pending")
    .single();

  if (!joinReq) return NextResponse.json({ error: "Request not found or already handled" }, { status: 404 });

  const { data: family } = await supabaseAdmin
    .from("families")
    .select("name")
    .eq("id", sessionMember.family_id)
    .single();

  const familyName = family?.name ?? "the family";

  // ── DENY ─────────────────────────────────────────────────────
  if (action === "deny") {
    await supabaseAdmin
      .from("join_requests")
      .update({ status: "denied", reviewed_by: sessionMember.id, reviewed_at: new Date().toISOString() })
      .eq("id", request_id);

    // Also deactivate the pending family_members row if one exists
    await supabaseAdmin
      .from("family_members")
      .update({ is_active: false, invite_status: "declined" })
      .eq("family_id", sessionMember.family_id)
      .eq("email", joinReq.email)
      .eq("invite_status", "pending");

    try {
      await sendJoinDeniedEmail({ to: joinReq.email, firstName: joinReq.first_name, familyName });
    } catch (e) { console.error("[JOIN DENY] Email failed:", e); }

    return NextResponse.json({ success: true, action: "denied" });
  }

  // ── APPROVE ───────────────────────────────────────────────────
  // Check if a pending family_members row already exists (created via accept-invite flow)
  const { data: pendingMember } = await supabaseAdmin
    .from("family_members")
    .select("id, nextauth_user_id, color")
    .eq("family_id", sessionMember.family_id)
    .eq("email", joinReq.email.toLowerCase().trim())
    .maybeSingle();

  if (pendingMember) {
    // Row already exists — mark accepted and link user account if not already linked
    const { data: approvedUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", joinReq.email.toLowerCase().trim())
      .maybeSingle();

    await supabaseAdmin
      .from("family_members")
      .update({
        invite_status:    "accepted",
        is_active:        true,
        role,
        invite_token:     null,
        joined_at:        new Date().toISOString(),
        updated_at:       new Date().toISOString(),
        // Link user account if not already linked
        ...(approvedUser && !pendingMember.nextauth_user_id
          ? { nextauth_user_id: approvedUser.id }
          : {}),
      })
      .eq("id", pendingMember.id);
  } else {
    // No row yet (request came from public /join page without account)
    // Create the family_members row — they'll link their account on first login
    const initials = `${(joinReq.first_name[0] ?? "").toUpperCase()}${(joinReq.last_name[0] ?? "").toUpperCase()}`;
    const COLORS = ["#E8A5A5","#B5A8D4","#A8C8E8","#A8C5A0","#F0C4A0","#C8A8D4","#A8D4C8","#D4C8A8"];
    const color  = COLORS[Math.floor(Math.random() * COLORS.length)];

    await supabaseAdmin
      .from("family_members")
      .insert({
        family_id:     sessionMember.family_id,
        email:         joinReq.email.toLowerCase().trim(),
        first_name:    joinReq.first_name,
        last_name:     joinReq.last_name,
        initials,
        color,
        role,
        is_active:     true,
        invite_status: "accepted",
        joined_at:     new Date().toISOString(),
      });
  }

  // Mark join request approved
  await supabaseAdmin
    .from("join_requests")
    .update({ status: "approved", reviewed_by: sessionMember.id, reviewed_at: new Date().toISOString() })
    .eq("id", request_id);

  // Send a simple "you've been approved" email — no invite token needed
  try {
    const dashboardUrl = `${APP_URL}/dashboard`;
    await resend.emails.send({
      from: FROM,
      to:   joinReq.email,
      subject: `You've been approved to join ${familyName} on FamilyTime`,
      html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#FDF8F4;margin:0;padding:40px 20px">
        <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(100,60,60,0.10)">
          <div style="background:linear-gradient(135deg,#E8A5A5,#B5A8D4);padding:28px 32px;text-align:center">
            <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700">🏡 FamilyTime</h1>
          </div>
          <div style="padding:28px 32px">
            <p style="font-size:15px;color:#3D2C2C;margin:0 0 12px">Hi ${joinReq.first_name},</p>
            <p style="font-size:15px;color:#3D2C2C;margin:0 0 24px">You've been approved to join <strong>${familyName}</strong>! Sign in to access your family hub.</p>
            <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#E8A5A5,#B5A8D4);color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700">Go to Dashboard →</a>
          </div>
        </div>
      </body></html>`,
    });
  } catch (e) { console.error("[JOIN APPROVE] Email failed:", e); }

  return NextResponse.json({ success: true, action: "approved" });
}
