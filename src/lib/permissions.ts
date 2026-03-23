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
 * Get the session user's ID from the JWT.
 * This is the tenant identifier — one per email, globally unique.
 */
async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  // user.id is stored in the JWT via the session callback
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (userId) return userId;
  // Fallback: look up by email if id not yet in JWT (e.g. old sessions)
  if (!session?.user?.email) return null;
  const { data } = await supabaseServer
    .from("users")
    .select("id")
    .eq("email", session.user.email.toLowerCase().trim())
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Get the authenticated family member from the NextAuth session.
 * Looks up by nextauth_user_id (tenant ID), not email.
 * Returns the primary family membership (personal family preferred).
 */
export async function getSessionMember(): Promise<SessionMember | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  // Prefer personal family, fall back to first active membership
  const { data, error } = await supabaseServer
    .from("family_members")
    .select("id, family_id, role, email, first_name, families:family_id(is_personal)")
    .eq("nextauth_user_id", userId)
    .eq("is_active", true)
    .order("joined_at", { ascending: true });

  if (error || !data || data.length === 0) return null;

  // Pick personal family first, otherwise first membership
  const personal = data.find(m => (m.families as unknown as { is_personal?: boolean } | null)?.is_personal);
  const primary  = personal ?? data[0];

  return {
    id:         primary.id,
    family_id:  primary.family_id,
    role:       primary.role as MemberRole,
    email:      primary.email,
    first_name: primary.first_name,
  };
}

/**
 * Like getSessionMember(), but respects an optional ?family_id= query param.
 * Validates the user actually belongs to the requested family.
 * Use this in all family-scoped API routes to support multi-family context switching.
 */
export async function getSessionMemberForFamily(
  req: { url?: string; nextUrl?: { searchParams: URLSearchParams } }
): Promise<SessionMember | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  // Extract requested family_id from query params
  let requestedFamilyId: string | null = null;
  try {
    if (req.nextUrl?.searchParams) {
      requestedFamilyId = req.nextUrl.searchParams.get("family_id");
    } else if (req.url) {
      requestedFamilyId = new URL(req.url).searchParams.get("family_id");
    }
  } catch { /* ignore */ }

  let query = supabaseServer
    .from("family_members")
    .select("id, family_id, role, email, first_name")
    .eq("nextauth_user_id", userId)
    .eq("is_active", true);

  if (requestedFamilyId) {
    query = query.eq("family_id", requestedFamilyId);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data as SessionMember;
}

/**
 * Get the raw authenticated user email from the NextAuth session.
 * Useful for onboarding flows before a family_members row exists.
 */
export async function getSessionEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.email?.toLowerCase().trim() ?? null;
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