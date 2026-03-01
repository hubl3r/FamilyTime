// src/app/api/finances/upcoming/route.ts
// Returns projected upcoming bills across all accounts
// Generates instances on the fly using frequency math

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabaseServer } from "@/lib/supabase";
import { getSessionMember } from "@/lib/permissions";

type BillFrequency =
  | "one_time" | "daily" | "weekly" | "biweekly"
  | "monthly" | "bimonthly" | "quarterly" | "semi_annual" | "annual";

function addInterval(date: Date, frequency: BillFrequency): Date {
  const d = new Date(date);
  switch (frequency) {
    case "daily":       d.setDate(d.getDate() + 1);        break;
    case "weekly":      d.setDate(d.getDate() + 7);        break;
    case "biweekly":    d.setDate(d.getDate() + 14);       break;
    case "monthly":     d.setMonth(d.getMonth() + 1);      break;
    case "bimonthly":   d.setMonth(d.getMonth() + 2);      break;
    case "quarterly":   d.setMonth(d.getMonth() + 3);      break;
    case "semi_annual": d.setMonth(d.getMonth() + 6);      break;
    case "annual":      d.setFullYear(d.getFullYear() + 1); break;
    default: break;
  }
  return d;
}

function getProjectedDates(
  startDate:   Date,
  frequency:   BillFrequency,
  dayOfMonth:  number | null,
  rangeStart:  Date,
  rangeEnd:    Date,
  maxCount:    number = 10
): Date[] {
  const dates: Date[] = [];
  let current = new Date(startDate);

  // Fast-forward to range start
  while (current < rangeStart) {
    current = addInterval(current, frequency);
  }

  while (current <= rangeEnd && dates.length < maxCount) {
    // Snap to day_of_month if monthly and specified
    if (frequency === "monthly" && dayOfMonth) {
      const snapped = new Date(current.getFullYear(), current.getMonth(), dayOfMonth);
      // Handle months shorter than day_of_month
      if (snapped.getMonth() !== current.getMonth()) {
        snapped.setDate(0); // last day of month
      }
      dates.push(snapped);
    } else {
      dates.push(new Date(current));
    }
    current = addInterval(current, frequency);
  }

  return dates;
}

// GET /api/finances/upcoming?days=30&count=10
export async function GET(req: NextRequest) {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days    = parseInt(searchParams.get("days") ?? "30");
  const count   = parseInt(searchParams.get("count") ?? "10");

  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(today);
  rangeEnd.setDate(rangeEnd.getDate() + days);

  // Fetch all active bills
  const { data: bills, error } = await supabaseServer
    .from("bills")
    .select(`
      id, name, category, frequency, anticipated_amount, budget_amount,
      day_of_month, start_date, end_date, is_autopay,
      instances:bill_instances(
        id, scheduled_date, due_date, status, actual_amount,
        remaining_balance, paid_date, paid_full,
        promise_to_pay_date, promise_to_pay_date_2
      )
    `)
    .eq("family_id", member.family_id)
    .eq("is_active", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch active credit cards
  const { data: cards } = await supabaseServer
    .from("credit_cards")
    .select(`
      id, name, issuer, current_balance, minimum_payment,
      anticipated_payment, due_day,
      instances:credit_card_instances(
        id, due_date, status, actual_payment, remaining_balance,
        paid_date, paid_full, promise_to_pay_date
      )
    `)
    .eq("family_id", member.family_id)
    .eq("is_active", true);

  const upcomingItems: object[] = [];

  // Project bill dates
  for (const bill of bills ?? []) {
    if (bill.frequency === "one_time") continue;

    const startDate = new Date(bill.start_date);
    const projected = getProjectedDates(
      startDate,
      bill.frequency as BillFrequency,
      bill.day_of_month,
      today,
      rangeEnd,
      count
    );

    for (const date of projected) {
      const dateStr = date.toISOString().split("T")[0];
      // Check if an instance already exists for this date
      const existing = (bill.instances ?? []).find(
        (i: { scheduled_date: string }) => i.scheduled_date === dateStr
      );

      upcomingItems.push({
        type:               "bill",
        id:                 existing?.id ?? null,
        bill_id:            bill.id,
        name:               bill.name,
        category:           bill.category,
        due_date:           existing?.due_date ?? dateStr,
        scheduled_date:     dateStr,
        anticipated_amount: bill.anticipated_amount,
        budget_amount:      bill.budget_amount,
        actual_amount:      existing?.actual_amount ?? null,
        remaining_balance:  existing?.remaining_balance ?? null,
        status:             existing?.status ?? "upcoming",
        paid_date:          existing?.paid_date ?? null,
        paid_full:          existing?.paid_full ?? false,
        promise_to_pay_date:   existing?.promise_to_pay_date ?? null,
        promise_to_pay_date_2: existing?.promise_to_pay_date_2 ?? null,
        is_autopay:         bill.is_autopay,
        frequency:          bill.frequency,
      });
    }
  }

  // Project credit card dates
  for (const card of cards ?? []) {
    if (!card.due_day) continue;

    // Generate monthly due dates
    let current = new Date(today.getFullYear(), today.getMonth(), card.due_day);
    if (current < today) current.setMonth(current.getMonth() + 1);

    let ccCount = 0;
    while (current <= rangeEnd && ccCount < count) {
      const dateStr = current.toISOString().split("T")[0];
      const existing = (card.instances ?? []).find(
        (i: { due_date: string }) => i.due_date === dateStr
      );

      upcomingItems.push({
        type:               "credit_card",
        id:                 existing?.id ?? null,
        card_id:            card.id,
        name:               card.name,
        issuer:             card.issuer,
        category:           "credit_cards",
        due_date:           dateStr,
        current_balance:    card.current_balance,
        minimum_payment:    card.minimum_payment,
        anticipated_amount: card.anticipated_payment,
        budget_amount:      card.anticipated_payment,
        actual_amount:      existing?.actual_payment ?? null,
        remaining_balance:  existing?.remaining_balance ?? null,
        status:             existing?.status ?? "upcoming",
        paid_date:          existing?.paid_date ?? null,
        paid_full:          existing?.paid_full ?? false,
        promise_to_pay_date: existing?.promise_to_pay_date ?? null,
        frequency:          "monthly",
      });

      current.setMonth(current.getMonth() + 1);
      ccCount++;
    }
  }

  // Sort by due date
  upcomingItems.sort((a: object, b: object) => {
    const aDate = (a as { due_date: string }).due_date;
    const bDate = (b as { due_date: string }).due_date;
    return aDate.localeCompare(bDate);
  });

  // Also get past due items
  const { data: pastDueInstances } = await supabaseServer
    .from("bill_instances")
    .select(`
      id, bill_id, due_date, status, anticipated_amount,
      actual_amount, remaining_balance, promise_to_pay_date,
      promise_to_pay_date_2, promise_notes,
      bill:bills(name, category, frequency, is_autopay)
    `)
    .eq("family_id", member.family_id)
    .in("status", ["past_due", "promise_to_pay", "paid_partial"])
    .order("due_date");

  return NextResponse.json({
    upcoming:  upcomingItems,
    past_due:  pastDueInstances ?? [],
    range_days: days,
    generated_at: new Date().toISOString(),
  });
}
