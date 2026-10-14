"use client";

import { Lock, ShieldCheck } from "lucide-react";
import { useDemo } from "@/components/providers/demo-store";
import { Button } from "@/components/ui/button";

/**
 * 관리자 전용 영역 — 기존 시스템의 비밀번호 로그인을 대신합니다.
 * 실서비스에서는 로그인 사용자의 역할(RBAC)과 DB RLS로 판단합니다.
 */
export function AdminGate({ children, title = "관리자 전용 화면입니다" }: { children: React.ReactNode; title?: string }) {
  const { role, setRole, ready } = useDemo();
  if (!ready) return <div className="h-64 animate-pulse rounded-3xl bg-white" />;
  if (role === "admin") return <>{children}</>;
  return (
    <div className="rounded-[28px] border border-line bg-white p-8 text-center shadow-card md:p-12">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Lock className="size-6" />
      </span>
      <h3 className="mt-5 text-xl font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-2">
        기존 시스템은 공용 관리자 비밀번호로 접속했지만, 통합 시스템에서는 <b>로그인한 사용자의 권한</b>으로 관리자 화면을 엽니다.
        지금은 데모이므로 아래 버튼으로 관리자 권한을 체험할 수 있습니다.
      </p>
      <Button className="mt-6" onClick={() => setRole("admin")}>
        <ShieldCheck className="size-4" /> 관리자 권한으로 보기 (데모)
      </Button>
    </div>
  );
}
