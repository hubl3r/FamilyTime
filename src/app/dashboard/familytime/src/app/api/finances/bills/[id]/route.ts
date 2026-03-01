// src/app/api/finances/bills/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import supabaseServer from "@/lib/supabase";
import { getSessionMember, checkPermission } from "@/lib/permissions";
import { encryptCredentials, decryptCredentials } from "@/lib/crypto";

type Params = { params: { id: string } };

// GET /api/finances/bills/[id] — get single bill with credentials
export async function GET(_req: NextRequest, { params }: Params) {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canView = await checkPermission(member, "bill", params.id, "can_view");
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: bill, error } = await supabaseServer
    .from("bills")
    .select(`
      *,
      instances:bill_instances(
        id, scheduled_date, due_date, status,
        anticipated_amount, actual_amount, remaining_balance,
        paid_date, paid_full, promise_to_pay_date, promise_to_pay_date_2,
        promise_notes, notes,
        fees:bill_fees(id, fee_type, amount, is_percentage, description, assessed_date, waived)
      )
    `)
    .eq("id", params.id)
    .eq("family_id", member.family_id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch and decrypt credentials
  const { data: creds } = await supabaseServer
    .from("encrypted_credentials")
    .select("account_number, username, password, pin, website, phone, notes")
    .eq("resource_type", "bill")
    .eq("resource_id", params.id)
    .single();

  const decrypted = creds ? decryptCredentials(creds) : null;

  return NextResponse.json({
    ...bill,
    credentials: creds ? {
      ...decrypted,
      website: creds.website,
      phone:   creds.phone,
      notes:   creds.notes,
    } : null,
  });
}

// PATCH /api/finances/bills/[id] — update a bill
export async function PATCH(req: NextRequest, { params }: Params) {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canEdit = await checkPermission(member, "bill", params.id, "can_edit");
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { account_number, username, password, pin, website, phone, ...billFields } = body;

  const { data, error } = await supabaseServer
    .from("bills")
    .update({ ...billFields, updated_by: member.id, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("family_id", member.family_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update credentials if any were provided
  if (account_number !== undefined || username !== undefined || password !== undefined || pin !== undefined) {
    const encrypted = encryptCredentials({ account_number, username, password, pin });
    await supabaseServer
      .from("encrypted_credentials")
      .upsert({
        family_id:     member.family_id,
        resource_type: "bill",
        resource_id:   params.id,
        ...encrypted,
        website, phone,
        updated_by: member.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "resource_type,resource_id" });
  }

  return NextResponse.json(data);
}

// DELETE /api/finances/bills/[id] — soft delete (set is_active = false)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const member = await getSessionMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canDelete = await checkPermission(member, "bill", params.id, "can_delete");
  if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabaseServer
    .from("bills")
    .update({ is_active: false, updated_by: member.id, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("family_id", member.family_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
