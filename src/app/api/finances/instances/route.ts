// src/app/api/finances/instances/route.ts
// Manage bill payment instances — log payments, add fees, promise-to-pay

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { getSessionMember, checkPermission } from "@/lib/permissions";

// POST /api/finances/instances — create or update a payment instance
export async function POST(req: NextRequest) {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    bill_id, scheduled_date, due_date, anticipated_amount,
    actual_amount, remaining_balance, status,
    promise_to_pay_date, promise_to_pay_date_2, promise_notes,
    paid_date, paid_full, notes,
    // Fee fields (optional)
    fee_type, fee_amount, fee_is_percentage, fee_description,
  } = body;

  // Verify member can edit this bill
  const canEdit = await checkPermission(member, "bill", bill_id, "can_edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Upsert the instance (one per bill per scheduled date)
  const { data: instance, error } = await supabaseServer
    .from("bill_instances")
    .upsert({
      family_id: member.family_id,
      bill_id, scheduled_date,
      due_date: due_date ?? scheduled_date,
      anticipated_amount, actual_amount, remaining_balance,
      status: status ?? "upcoming",
      promise_to_pay_date, promise_to_pay_date_2, promise_notes,
      paid_date, paid_full: paid_full ?? false,
      notes,
      updated_by: member.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "bill_id,scheduled_date" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add fee if provided
  if (fee_type && fee_amount) {
    await supabaseServer.from("bill_fees").insert({
      family_id:    member.family_id,
      instance_id:  instance.id,
      fee_type,
      amount:       fee_amount,
      is_percentage: fee_is_percentage ?? false,
      description:  fee_description,
      assessed_date: new Date().toISOString().split("T")[0],
      created_by:   member.id,
    });
  }

  return NextResponse.json(instance, { status: 201 });
}

// PATCH /api/finances/instances — update promise to pay or mark paid
export async function PATCH(req: NextRequest) {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { instance_id, ...updates } = body;

  // Get the instance to find bill_id for permission check
  const { data: instance } = await supabaseServer
    .from("bill_instances")
    .select("bill_id")
    .eq("id", instance_id)
    .single();

  if (!instance) return NextResponse.json({ error: "Instance not found" }, { status: 404 });

  const canEdit = await checkPermission(member, "bill", instance.bill_id, "can_edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabaseServer
    .from("bill_instances")
    .update({ ...updates, updated_by: member.id, updated_at: new Date().toISOString() })
    .eq("id", instance_id)
    .eq("family_id", member.family_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
