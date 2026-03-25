// src/app/api/messages/contacts/route.ts
// GET — returns all users you share any family with, deduplicated by user_id

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: currentUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", session.user.email.toLowerCase().trim())
    .maybeSingle();

  if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: myMemberships } = await supabaseAdmin
    .from("family_members")
    .select("family_id, id")
    .eq("nextauth_user_id", currentUser.id)
    .eq("is_active", true);

  const myFamilyIds = (myMemberships ?? []).map(m => m.family_id);
  if (myFamilyIds.length === 0) return NextResponse.json([]);

  const { data: allMembers } = await supabaseAdmin
    .from("family_members")
    .select(`
      id, first_name, last_name, initials, color, email,
      nextauth_user_id, family_id,
      families:family_id ( id, name, is_personal )
    `)
    .in("family_id", myFamilyIds)
    .neq("nextauth_user_id", currentUser.id)
    .eq("is_active", true)
    .not("nextauth_user_id", "is", null);

  const contactMap = new Map<string, {
    user_id: string;
    first_name: string;
    last_name: string;
    initials: string;
    color: string;
    email: string;
    member_id: string;
    shared_families: { id: string; name: string }[];
  }>();

  for (const m of allMembers ?? []) {
    const uid = m.nextauth_user_id as string;
    const family = m.families as unknown as { id: string; name: string; is_personal: boolean } | null;
    if (!uid || !family || family.is_personal) continue;

    if (contactMap.has(uid)) {
      contactMap.get(uid)!.shared_families.push({ id: family.id, name: family.name });
    } else {
      contactMap.set(uid, {
        user_id:         uid,
        first_name:      m.first_name,
        last_name:       m.last_name,
        initials:        m.initials,
        color:           m.color,
        email:           m.email,
        member_id:       m.id,
        shared_families: [{ id: family.id, name: family.name }],
      });
    }
  }

  return NextResponse.json(Array.from(contactMap.values()));
}
