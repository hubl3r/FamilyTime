// src/app/api/join/request/route.ts
// POST /api/join/request
// Public. Stores a join_requests record and notifies family admins.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { family_id, first_name, last_name, email, message } = body;

  if (!family_id || !first_name?.trim() || !last_name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "family_id, first_name, last_name, and email are required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Verify family exists
  const { data: family } = await supabaseAdmin
    .from("families")
    .select("id, name")
    .eq("id", family_id)
    .single();

  if (!family) {
    return NextResponse.json({ error: "Family not found" }, { status: 404 });
  }

  // Prevent duplicate requests
  const { data: existing } = await supabaseAdmin
    .from("join_requests")
    .select("id, status")
    .eq("family_id", family_id)
    .eq("email", normalizedEmail)
    .in("status", ["pending", "approved"])
    .single();

  if (existing) {
    if (existing.status === "approved") {
      return NextResponse.json({ error: "You have already been approved for this family" }, { status: 409 });
    }
    return NextResponse.json({ error: "You already have a pending request for this family" }, { status: 409 });
  }

  // Also check if they're already a member
  const { data: alreadyMember } = await supabaseAdmin
    .from("family_members")
    .select("id")
    .eq("family_id", family_id)
    .eq("email", normalizedEmail)
    .single();

  if (alreadyMember) {
    return NextResponse.json({ error: "An account with this email already exists in this family" }, { status: 409 });
  }

  // Create the join request
  const { data: joinRequest, error } = await supabaseAdmin
    .from("join_requests")
    .insert({
      family_id,
      first_name: first_name.trim(),
      last_name:  last_name.trim(),
      email:      normalizedEmail,
      message:    message?.trim() || null,
      status:     "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify family owners/admins via email
  try {
    const { data: admins } = await supabaseAdmin
      .from("family_members")
      .select("email, first_name")
      .eq("family_id", family_id)
      .in("role", ["owner", "admin"])
      .eq("is_active", true);

    const reviewUrl = `${process.env.NEXTAUTH_URL}/dashboard/members?tab=requests`;

    for (const admin of admins ?? []) {
      // TODO: wire up your email provider here (Resend, SendGrid, etc.)
      console.log(
        `[JOIN REQUEST] Notify ${admin.first_name} <${admin.email}>: ` +
        `${first_name} ${last_name} wants to join ${family.name}. Review: ${reviewUrl}`
      );
    }
  } catch (emailErr) {
    console.error("[JOIN REQUEST] Notification failed:", emailErr);
  }

  return NextResponse.json(joinRequest, { status: 201 });
}
