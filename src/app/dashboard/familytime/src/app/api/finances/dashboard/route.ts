// src/app/api/finances/dashboard/route.ts
// Financial dashboard summary — budget vs actual, totals, alerts

import { NextResponse } from "next/server";
import supabaseServer from "@/lib/supabase";
import { getSessionMember } from "@/lib/permissions";

export async function GET() {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];
  const todayStr   = today.toISOString().split("T")[0];

  // Bills summary
  const { data: bills } = await supabaseServer
    .from("bills")
    .select("id, name, category, anticipated_amount, budget_amount, frequency")
    .eq("family_id", member.family_id)
    .eq("is_active", true);

  // This month's instances
  const { data: monthInstances } = await supabaseServer
    .from("bill_instances")
    .select("bill_id, status, anticipated_amount, actual_amount, remaining_balance, due_date, paid_full")
    .eq("family_id", member.family_id)
    .gte("due_date", monthStart)
    .lte("due_date", monthEnd);

  // Past due instances
  const { data: pastDue } = await supabaseServer
    .from("bill_instances")
    .select("id, bill_id, due_date, status, anticipated_amount, remaining_balance")
    .eq("family_id", member.family_id)
    .in("status", ["past_due", "promise_to_pay", "paid_partial"])
    .order("due_date");

  // Credit cards
  const { data: cards } = await supabaseServer
    .from("credit_cards")
    .select("id, name, current_balance, credit_limit, minimum_payment, anticipated_payment, due_day")
    .eq("family_id", member.family_id)
    .eq("is_active", true);

  // This month's CC instances
  const { data: ccInstances } = await supabaseServer
    .from("credit_card_instances")
    .select("card_id, status, statement_balance, actual_payment, remaining_balance, due_date, paid_full")
    .eq("family_id", member.family_id)
    .gte("due_date", monthStart)
    .lte("due_date", monthEnd);

  // Due in next 7 days
  const next7 = new Date(today);
  next7.setDate(next7.getDate() + 7);
  const next7Str = next7.toISOString().split("T")[0];

  const { data: dueSoon } = await supabaseServer
    .from("bill_instances")
    .select(`
      id, due_date, status, anticipated_amount,
      bill:bills(name, category)
    `)
    .eq("family_id", member.family_id)
    .in("status", ["upcoming", "due_today"])
    .gte("due_date", todayStr)
    .lte("due_date", next7Str)
    .order("due_date");

  // Calculate totals
  const totalBudget     = (bills ?? []).reduce((s, b) => s + (b.budget_amount ?? b.anticipated_amount ?? 0), 0);
  const totalPaidMonth  = (monthInstances ?? []).reduce((s, i) => s + (i.actual_amount ?? 0), 0);
  const totalDueMonth   = (monthInstances ?? []).reduce((s, i) => s + (i.anticipated_amount ?? 0), 0);
  const totalPastDue    = (pastDue ?? []).reduce((s, i) => s + (i.remaining_balance ?? i.anticipated_amount ?? 0), 0);
  const totalCCBalance  = (cards ?? []).reduce((s, c) => s + (c.current_balance ?? 0), 0);
  const totalCCLimit    = (cards ?? []).reduce((s, c) => s + (c.credit_limit ?? 0), 0);

  // Category breakdown
  const categoryTotals: Record<string, { budget: number; actual: number; count: number }> = {};
  for (const bill of bills ?? []) {
    const cat = bill.category;
    if (!categoryTotals[cat]) categoryTotals[cat] = { budget: 0, actual: 0, count: 0 };
    categoryTotals[cat].budget += bill.budget_amount ?? bill.anticipated_amount ?? 0;
    categoryTotals[cat].count++;
  }
  for (const inst of monthInstances ?? []) {
    const bill = (bills ?? []).find(b => b.id === inst.bill_id);
    if (bill) {
      categoryTotals[bill.category].actual += inst.actual_amount ?? 0;
    }
  }

  return NextResponse.json({
    summary: {
      total_budget_monthly:  totalBudget,
      total_paid_this_month: totalPaidMonth,
      total_due_this_month:  totalDueMonth,
      total_past_due:        totalPastDue,
      bills_count:           (bills ?? []).length,
      cards_count:           (cards ?? []).length,
      past_due_count:        (pastDue ?? []).length,
      due_soon_count:        (dueSoon ?? []).length,
    },
    credit_cards: {
      total_balance:     totalCCBalance,
      total_limit:       totalCCLimit,
      utilization_pct:   totalCCLimit > 0 ? Math.round((totalCCBalance / totalCCLimit) * 100) : 0,
      cards:             cards ?? [],
    },
    category_breakdown: categoryTotals,
    due_soon:           dueSoon ?? [],
    past_due:           pastDue ?? [],
    month: {
      start: monthStart,
      end:   monthEnd,
      instances: monthInstances ?? [],
      cc_instances: ccInstances ?? [],
    },
  });
}
