// src/lib/createPersonalFamily.ts
// Called whenever a new user account is created (registration or invite acceptance).
// Creates a private single-member family for the user so they have their own
// personal space separate from any shared family hubs they belong to.

import { supabaseAdmin } from "./supabase";
import crypto from "crypto";

export async function createPersonalFamily({
  userId,
  email,
  firstName,
  lastName,
  color,
}: {
  userId:    string;
  email:     string;
  firstName: string;
  lastName:  string;
  color?:    string;
}): Promise<string | null> {
  // Check if they already have a personal family (idempotent)
  const { data: existing } = await supabaseAdmin
    .from("families")
    .select("id")
    .eq("owner_email", email)
    .eq("is_personal", true)
    .maybeSingle();

  if (existing) return existing.id;

  const familyName  = `${firstName}'s Space`;
  const inviteCode  = crypto.randomBytes(3).toString("hex").toUpperCase();
  const initials    = `${(firstName[0] ?? "").toUpperCase()}${(lastName[0] ?? "").toUpperCase()}`;
  const memberColor = color ?? "#A8C8E8";

  // Create the personal family
  const { data: family, error: familyErr } = await supabaseAdmin
    .from("families")
    .insert({
      name:         familyName,
      slug:         `${firstName.toLowerCase()}-${lastName.toLowerCase()}-personal-${inviteCode.toLowerCase()}`,
      invite_code:  inviteCode,
      is_searchable: false,
      is_personal:  true,
      owner_email:  email,
    })
    .select("id")
    .single();

  if (familyErr || !family) {
    console.error("[PERSONAL FAMILY] Failed to create family:", familyErr?.message);
    return null;
  }

  // Add the user as owner member of their personal family
  const { error: memberErr } = await supabaseAdmin
    .from("family_members")
    .insert({
      family_id:        family.id,
      nextauth_user_id: userId,
      email:            email,
      first_name:       firstName,
      last_name:        lastName,
      initials:         initials,
      color:            memberColor,
      role:             "owner",
      is_active:        true,
      invite_status:    "accepted",
      joined_at:        new Date().toISOString(),
    });

  if (memberErr) {
    console.error("[PERSONAL FAMILY] Failed to create member:", memberErr.message);
    // Clean up the family if member creation failed
    await supabaseAdmin.from("families").delete().eq("id", family.id);
    return null;
  }

  return family.id;
}
