"use client";

/**
 * 직원 로그인 상태
 *  - 실DB 모드: Supabase Auth 세션 + core.profiles(승인 상태·권한)
 *  - 데모 모드: 로그인 없이 헤더의 '일반 직원/관리자' 전환으로 체험
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as live from "@/lib/db/live";
import type { ModuleKey } from "@/lib/modules";

export type AuthStatus = "demo" | "loading" | "signedOut" | "pending" | "disabled" | "active";

type Ctx = {
  status: AuthStatus;
  profile: live.Profile | null;
  /** 해당 모듈 관리자 여부 (모듈 생략 시 최고관리자 여부) */
  isAdmin: (module?: ModuleKey) => boolean;
  /** 어느 모듈이든 관리자 권한이 하나라도 있는지 */
  anyAdmin: boolean;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (i: live.SignUpInput) => Promise<{ error: string | null; needsConfirm: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (name: string, department: string, contact: string) => Promise<string | null>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(live.LIVE ? "loading" : "demo");
  const [profile, setProfile] = useState<live.Profile | null>(null);

  const refresh = useCallback(async () => {
    if (!live.LIVE) return;
    try {
      const session = await live.authSession();
      if (!session) {
        setProfile(null);
        setStatus("signedOut");
        return;
      }
      const p = await live.myProfile();
      setProfile(p);
      setStatus(!p ? "pending" : p.status === "active" ? "active" : p.status === "disabled" ? "disabled" : "pending");
    } catch {
      setProfile(null);
      setStatus("signedOut");
    }
  }, []);

  useEffect(() => {
    if (!live.LIVE) return;
    refresh();
    return live.onAuthChange(() => refresh());
  }, [refresh]);

  const isAdmin = useCallback(
    (module?: ModuleKey) => {
      if (!profile || profile.status !== "active" || profile.role !== "admin") return false;
      if (profile.admin_modules.length === 0) return true;
      return Boolean(module && profile.admin_modules.includes(module));
    },
    [profile],
  );

  const value = useMemo<Ctx>(
    () => ({
      status,
      profile,
      isAdmin,
      anyAdmin: Boolean(profile && profile.status === "active" && profile.role === "admin"),
      refresh,
      signIn: async (email, password) => {
        try {
          await live.signIn(email, password);
          await refresh();
          return null;
        } catch (e) {
          return live.friendly(e);
        }
      },
      signUp: async (i) => {
        try {
          const signedIn = await live.signUp(i);
          await refresh();
          return { error: null, needsConfirm: !signedIn };
        } catch (e) {
          return { error: live.friendly(e), needsConfirm: false };
        }
      },
      signOut: async () => {
        await live.signOut();
        setProfile(null);
        setStatus("signedOut");
      },
      updateProfile: async (name, department, contact) => {
        try {
          await live.updateMyProfile(name, department, contact);
          await refresh();
          return null;
        } catch (e) {
          return live.friendly(e);
        }
      },
    }),
    [status, profile, isAdmin, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
