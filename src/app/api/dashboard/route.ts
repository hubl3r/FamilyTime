// src/app/api/dashboard/route.ts
// GET /api/dashboard?family_id=xxx — returns family summary for the dashboard home

import { NextRequest, NextResponse } from "next/server";
import { getSessionMember } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const sessionMember = await getSessionMember();
  if (!sessionMember) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Allow switching family context via query param (validated against membership)
  const requestedFamilyId = req.nextUrl.searchParams.get("family_id");
  let familyId = sessionMember.family_id;

  if (requestedFamilyId && requestedFamilyId !== familyId) {
    // Verify the user actually belongs to the requested family
    const { data: membership } = await supabaseAdmin
      .from("family_members")
      .select("id, family_id")
      .eq("email", sessionMember.email)
      .eq("family_id", requestedFamilyId)
      .eq("is_active", true)
      .maybeSingle();

    if (membership) familyId = requestedFamilyId;
  }

  // Fetch family info
  const { data: family } = await supabaseAdmin
    .from("families")
    .select("id, name, created_at")
    .eq("id", familyId)
    .single();

  // Fetch active members
  const { data: members } = await supabaseAdmin
    .from("family_members")
    .select("id, first_name, last_name, initials, color, role, is_active, invite_status")
    .eq("family_id", familyId)
    .eq("is_active", true)
    .order("joined_at", { ascending: true });

  // Fetch finances summary
  const { data: financeSummary } = await supabaseAdmin
    .from("bills")
    .select("id, amount, due_day, is_active")
    .eq("family_id", familyId)
    .eq("is_active", true);

  const monthlyTotal = (financeSummary ?? []).reduce((sum, b) => sum + (b.amount ?? 0), 0);

  // Founding year from created_at
  const foundedYear = family?.created_at
    ? new Date(family.created_at).getFullYear()
    : null;

  return NextResponse.json({
    family: {
      id:   family?.id,
      name: family?.name ?? "Your Family",
      founded_year: foundedYear,
    },
    members:       members ?? [],
    member_count:  (members ?? []).length,
    monthly_total: monthlyTotal,
  });
}
