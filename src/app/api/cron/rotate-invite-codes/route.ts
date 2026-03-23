// src/app/api/cron/rotate-invite-codes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

function generateCode(familyName: string): string {
  const prefix = familyName.split(" ")[0].toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rotate all invite codes
  const { data: families } = await supabaseAdmin.from("families").select("id, name");
  let rotated = 0;
  for (const family of families ?? []) {
    await supabaseAdmin
      .from("families")
      .update({ invite_code: generateCode(family.name) })
      .eq("id", family.id);
    rotated++;
  }

  // Expire overdue invite tokens
  const { data: expired } = await supabaseAdmin
    .from("family_members")
    .update({ invite_token: null })
    .eq("invite_status", "pending")
    .not("invite_token", "is", null)
    .lt("invite_expires_at", new Date().toISOString())
    .select("id");

  return NextResponse.json({
    success: true,
    codes_rotated: rotated,
    tokens_expired: expired?.length ?? 0,
    timestamp: new Date().toISOString(),
  });
}
