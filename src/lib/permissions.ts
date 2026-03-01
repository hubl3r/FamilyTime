// src/lib/permissions.ts
// ─────────────────────────────────────────────────────────────
// Server-side permission checking middleware.
// Call checkPermission() in every API route before any data access.
// ─────────────────────────────────────────────────────────────

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin as supabaseServer } from "./supabase";

export type MemberRole = "owner" | "admin" | "member" | "child";
export type ResourceType =
  | "bill" | "credit_card" | "photo_album" | "photo"
  | "document" | "channel" | "vehicle" | "health_record"
  | "family_member" | "event" | "chore" | "form_template";

export interface SessionMember {
  id:        string;
  family_id: string;
  role:      MemberRole;
  email:     string;
  first_name: string;
}

/**
 * Get the authenticated family member from the NextAuth session.
 * Returns null if not authenticated or not in a family.
 */
export async function getSessionMember(): Promise<SessionMember | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const { data, error } = await supabaseServer
    .from("family_members")
    .select("id, family_id, role, email, first_name")
    .eq("email", session.user.email)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data as SessionMember;
}

/**
 * Check if a member can perform an action on a specific resource.
 *
 * Owners and admins always have full access (explicit permission records required for audit trail).
 * Members and children require an explicit permission record.
 */
export async function checkPermission(
  member:        SessionMember,
  resourceType:  ResourceType,
  resourceId:    string,
  action:        "can_view" | "can_edit" | "can_delete" | "can_share"
): Promise<boolean> {
  // Always check explicit permission record for full audit trail
  const { data } = await supabaseServer
    .from("permissions")
    .select("can_view, can_edit, can_delete, can_share, expires_at")
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId)
    .eq("granted_to", member.id)
    .single();

  if (!data) {
    // No permission record — owners and admins still get access
    return member.role === "owner" || member.role === "admin";
  }

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return false;
  }

  return data[action] === true;
}

/**
 * Grant a permission record (and auto-log via DB trigger).
 */
export async function grantPermission(params: {
  family_id:     string;
  resource_type: ResourceType;
  resource_id:   string;
  granted_to:    string;
  granted_by:    string;
  can_view?:     boolean;
  can_edit?:     boolean;
  can_delete?:   boolean;
  can_share?:    boolean;
  expires_at?:   string | null;
  notes?:        string;
}) {
  const { error } = await supabaseServer
    .from("permissions")
    .upsert({
      ...params,
      can_view:   params.can_view   ?? true,
      can_edit:   params.can_edit   ?? false,
      can_delete: params.can_delete ?? false,
      can_share:  params.can_share  ?? false,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "resource_type,resource_id,granted_to"
    });
  return error;
}

/**
 * Revoke a permission record (DB trigger auto-logs this).
 */
export async function revokePermission(
  resourceType: ResourceType,
  resourceId:   string,
  memberId:     string
) {
  const { error } = await supabaseServer
    .from("permissions")
    .delete()
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId)
    .eq("granted_to", memberId);
  return error;
}

/**
 * Get all members who have access to a resource.
 */
export async function getResourcePermissions(
  resourceType: ResourceType,
  resourceId:   string
) {
  const { data } = await supabaseServer
    .from("permissions")
    .select(`
      id, can_view, can_edit, can_delete, can_share, expires_at, notes, created_at,
      granted_to:family_members!permissions_granted_to_fkey(id, first_name, last_name, initials, color),
      granted_by:family_members!permissions_granted_by_fkey(id, first_name, last_name)
    `)
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId);
  return data ?? [];
}