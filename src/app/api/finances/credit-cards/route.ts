// src/app/api/finances/credit-cards/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabaseServer from "@/lib/supabase";
import { getSessionMember } from "@/lib/permissions";
import { encryptCredentials } from "@/lib/crypto";

export async function GET(_req: NextRequest) {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseServer
    .from("credit_cards")
    .select(`
      *,
      instances:credit_card_instances(
        id, due_date, status, statement_balance, minimum_payment,
        anticipated_payment, actual_payment, remaining_balance,
        paid_date, paid_full, promise_to_pay_date, promise_to_pay_date_2
      )
    `)
    .eq("family_id", member.family_id)
    .eq("is_active", true)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name, issuer, credit_limit, minimum_payment, anticipated_payment,
    budget_amount, apr, statement_day, due_day, card_type, last_four,
    expiry_month, expiry_year, phone, website, rewards_program,
    rewards_unit, is_autopay, autopay_type, autopay_amount, notes,
    account_number, username, password, pin,
  } = body;

  const { data: card, error } = await supabaseServer
    .from("credit_cards")
    .insert({
      family_id: member.family_id,
      name, issuer, current_balance: 0, credit_limit, minimum_payment,
      anticipated_payment, budget_amount, apr, statement_day, due_day,
      card_type, last_four, expiry_month, expiry_year, phone, website,
      rewards_program, rewards_unit: rewards_unit ?? "points",
      is_autopay: is_autopay ?? false, autopay_type, autopay_amount, notes,
      created_by: member.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (account_number || username || password || pin) {
    const encrypted = encryptCredentials({ account_number, username, password, pin });
    await supabaseServer.from("encrypted_credentials").insert({
      family_id:     member.family_id,
      resource_type: "credit_card",
      resource_id:   card.id,
      ...encrypted,
      website, phone,
      created_by: member.id,
    });
  }

  await supabaseServer.from("permissions").insert({
    family_id:     member.family_id,
    resource_type: "credit_card",
    resource_id:   card.id,
    granted_to:    member.id,
    granted_by:    member.id,
    can_view: true, can_edit: true, can_delete: true, can_share: true,
  });

  return NextResponse.json(card, { status: 201 });
}
