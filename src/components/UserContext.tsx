// src/components/UserContext.tsx
"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type FamilyMembership = {
  member_id:  string;
  family_id:  string;
  role:       string;
  joined_at:  string | null;
  family:     { id: string; name: string; invite_code: string; created_at: string; is_personal?: boolean } | null;
};

export type MeData = {
  email:       string;
  first_name:  string;
  last_name:   string;
  initials:    string;
  color:       string;
  bio:         string | null;
  nickname:    string | null;
  birthday:    string | null;
  phone:       string | null;
  blood_type:  string | null;
  allergies:   string | null;
  medications: string | null;
  medical_notes: string | null;
  emergency_contact_name:     string | null;
  emergency_contact_phone:    string | null;
  emergency_contact_relation: string | null;
  families:          FamilyMembership[];
  primary_family_id: string;
  primary_member_id: string;
};

type ViewContext = "personal" | string; // "personal" or a family_id

type UserCtx = {
  me:            MeData | null;
  loading:       boolean;
  currentContext: ViewContext;
  currentFamily:  FamilyMembership | null;
  isPersonal:     boolean;
  switchContext:  (ctx: ViewContext) => void;
  reload:         () => void;
};

const UserContext = createContext<UserCtx>({
  me: null, loading: true,
  currentContext: "personal", currentFamily: null, isPersonal: true,
  switchContext: () => {}, reload: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [me, setMe]         = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentContext, setCurrentContext] = useState<ViewContext>("personal");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/me");
      if (res.ok) {
        const data: MeData = await res.json();
        setMe(data);
        // Default to personal family (My Space) on first load, keep current if already set
        setCurrentContext(prev => {
          if (prev !== "personal" && data.families.find(f => f.family_id === prev)) return prev;
          const personalFamily = data.families.find(f => (f.family as unknown as { is_personal?: boolean })?.is_personal);
          return personalFamily ? personalFamily.family_id : data.primary_family_id;
        });
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentFamily = me?.families.find(f => f.family_id === currentContext) ?? null;
  const isPersonal    = currentContext === "personal";

  return (
    <UserContext.Provider value={{
      me, loading, currentContext, currentFamily, isPersonal,
      switchContext: setCurrentContext,
      reload: load,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() { return useContext(UserContext); }
