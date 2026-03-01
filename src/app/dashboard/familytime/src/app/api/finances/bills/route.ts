// src/app/api/finances/bills/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabaseServer from "@/lib/supabase";
import { getSessionMember } from "@/lib/permissions";
import { encryptCredentials } from "@/lib/crypto";

// GET /api/finances/bills — list all bills for the family
export async function GET(req: NextRequest) {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search   = searchParams.get("search");

  let query = supabaseServer
    .from("bills")
    .select(`
      *,
      credentials:encrypted_credentials(website, phone, notes),
      instances:bill_instances(
        id, due_date, status, anticipated_amount, actual_amount,
        remaining_balance, paid_date, paid_full,
        promise_to_pay_date, promise_to_pay_date_2
      )
    `)
    .eq("family_id", member.family_id)
    .eq("is_active", true)
    .order("name");

  if (category) query = query.eq("category", category);
  if (search)   query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// POST /api/finances/bills — create a new bill
export async function POST(req: NextRequest) {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name, category, frequency, anticipated_amount, budget_amount,
    day_of_month, day_of_week, start_date, end_date, is_autopay,
    autopay_days_before, payee_name, phone, website, address, notes,
    // Credentials (will be encrypted)
    account_number, username, password, pin,
  } = body;

  // Insert the bill
  const { data: bill, error: billError } = await supabaseServer
    .from("bills")
    .insert({
      family_id: member.family_id,
      name, category, frequency,
      anticipated_amount, budget_amount,
      day_of_month, day_of_week,
      start_date, end_date,
      is_autopay: is_autopay ?? false,
      autopay_days_before: autopay_days_before ?? 0,
      payee_name, phone, website, address, notes,
      created_by: member.id,
    })
    .select()
    .single();

  if (billError) return NextResponse.json({ error: billError.message }, { status: 500 });

  // Store encrypted credentials if provided
  if (account_number || username || password || pin) {
    const encrypted = encryptCredentials({ account_number, username, password, pin });
    await supabaseServer.from("encrypted_credentials").insert({
      family_id:     member.family_id,
      resource_type: "bill",
      resource_id:   bill.id,
      ...encrypted,
      website, phone,
      created_by: member.id,
    });
  }

  // Auto-grant permission to creator
  await supabaseServer.from("permissions").insert({
    family_id:     member.family_id,
    resource_type: "bill",
    resource_id:   bill.id,
    granted_to:    member.id,
    granted_by:    member.id,
    can_view:      true,
    can_edit:      true,
    can_delete:    true,
    can_share:     true,
  });

  return NextResponse.json(bill, { status: 201 });
}
