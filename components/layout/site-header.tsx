"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { Bell, LayoutDashboard, Menu, Plus, Search, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDemo } from "@/components/providers/demo-store";
import { useRequests } from "@/components/providers/requests-provider";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NOTIFICATIONS } from "@/lib/data";
import { MODULES, MODULE_MAP } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

export const NAV = [
  { href: "/", label: "홈", icon: LayoutDashboard },
  ...MODULES.map((m) => ({ href: m.href, label: m.shortName, icon: m.icon })),
  { href: "/admin", label: "관리자센터", icon: ShieldCheck },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 32, mass: 0.4 });
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { openRequest } = useRequests();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 12));
  useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-line/80 bg-white/80 shadow-[0_8px_30px_-20px_rgb(15_31_27/0.25)] backdrop-blur-xl" : "bg-transparent",
      )}
    >
      {/* 스크롤 진행 표시 */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-brand-400 via-brand-500 to-[#3cc4a0]"
        style={{ scaleX: progress, opacity: scrolled ? 1 : 0 }}
      />
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center gap-4 px-4 md:px-8">
        <Logo />

        <nav className="ml-6 hidden items-center gap-1 xl:flex" aria-label="주 메뉴">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "relative rounded-full px-3.5 py-2 text-[15px] font-semibold transition-colors",
                isActive(n.href) ? "text-brand-700" : "text-ink-2 hover:text-ink",
              )}
            >
              {isActive(n.href) && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-brand-50 ring-1 ring-brand-100"
                  transition={{ type: "spring", damping: 30, stiffness: 380 }}
                />
              )}
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <GlobalSearch />
          <Notifications />
          <Button size="sm" className="hidden md:inline-flex" onClick={() => openRequest()}>
            <Plus className="size-4" /> 바로 신청
          </Button>
          <RoleSwitch />
          <div className="hidden items-center gap-2.5 rounded-full border border-line bg-white py-1 pl-1 pr-3 2xl:flex">
            <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-brand-300 to-brand-600 text-xs font-bold text-white">
              홍
            </span>
            <span className="text-left leading-tight">
              <span className="block text-[13px] font-bold">홍길동 과장</span>
              <span className="block text-[11px] text-ink-3">경영지원부</span>
            </span>
          </div>
          <button
            className="grid size-10 place-items-center rounded-full border border-line bg-white xl:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-line bg-white xl:hidden"
            aria-label="모바일 메뉴"
          >
            <div className="mx-auto grid max-w-[1320px] gap-1 px-4 py-4 sm:grid-cols-2 md:px-8">
              {NAV.map((n) => {
                const Icon = n.icon;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold",
                      isActive(n.href) ? "bg-brand-50 text-brand-700" : "text-ink-2 hover:bg-canvas",
                    )}
                  >
                    <Icon className="size-5" /> {n.label}
                  </Link>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

function Popover({ open, children, className }: { open: boolean; children: React.ReactNode; className?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "absolute right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-3xl border border-line bg-white shadow-[0_24px_60px_-20px_rgb(15_31_27/0.35)]",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Notifications() {
  const { open, setOpen, ref } = usePopover();
  const unread = NOTIFICATIONS.filter((n) => n.unread).length;
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid size-10 place-items-center rounded-full border border-line bg-white text-ink-2 transition hover:text-brand-700"
        aria-label={`알림 ${unread}건`}
        aria-expanded={open}
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid size-[18px] place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
            {unread}
          </span>
        )}
      </button>
      <Popover open={open} className="w-[min(360px,calc(100vw-32px))]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="font-bold">알림</p>
          <span className="text-xs font-semibold text-brand-600">읽지 않음 {unread}</span>
        </div>
        <ul className="max-h-80 divide-y divide-line overflow-auto">
          {NOTIFICATIONS.map((n) => {
            const m = MODULE_MAP[n.module];
            const Icon = m.icon;
            return (
              <li key={n.id} className={cn("flex gap-3 px-5 py-4", n.unread && "bg-brand-50/50")}>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-canvas" style={{ color: m.color }}>
                  <Icon className="size-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{n.text}</span>
                  <span className="mt-1 block text-xs text-ink-3">
                    {m.shortName} · {n.time}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Popover>
    </div>
  );
}

function GlobalSearch() {
  const { open, setOpen, ref } = usePopover();
  const [q, setQ] = useState("");
  const { requests } = useRequests();
  const results = useMemo(() => {
    const k = q.trim();
    if (!k) return requests.slice(0, 5);
    return requests.filter((r) => `${r.title} ${r.no} ${r.requester} ${r.dept}`.includes(k)).slice(0, 6);
  }, [q, requests]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-2 rounded-full border border-line bg-white px-3 text-sm text-ink-3 transition hover:border-brand-200 2xl:w-56 2xl:px-4"
        aria-label="통합 검색"
        aria-expanded={open}
      >
        <Search className="size-[18px]" />
        <span className="hidden 2xl:inline">신청번호, 제목, 신청자 검색</span>
      </button>
      <Popover open={open} className="fixed left-4 right-4 top-[80px] md:absolute md:left-auto md:right-0 md:top-[calc(100%+10px)] md:w-[440px]">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="size-[18px] text-ink-3" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="통합 검색"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none"
          />
        </div>
        <p className="px-5 pt-3 text-xs font-semibold text-ink-3">{q ? `검색 결과 ${results.length}건` : "최근 신청"}</p>
        <ul className="p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-3">일치하는 신청이 없습니다.</li>}
          {results.map((r) => {
            const m = MODULE_MAP[r.module];
            return (
              <li key={r.id}>
                <Link
                  href={m.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 hover:bg-canvas"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{r.title}</span>
                    <span className="block text-xs text-ink-3 tabular">
                      {m.shortName} · {r.no}
                    </span>
                  </span>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      </Popover>
    </div>
  );
}

/** 데모용 권한 전환 — 실서비스에서는 로그인 사용자 역할로 자동 결정 */
function RoleSwitch() {
  const { role, setRole, ready, live, loadError } = useDemo();
  if (!ready) return null;
  const admin = role === "admin";
  return (
    <>
    <span
      title={live ? (loadError ? `DB 연결 오류: ${loadError}` : "새 통합 DB(Supabase)에 연결됨") : "데모 모드 — 이 브라우저에만 저장"}
      className={cn(
        "hidden h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-bold lg:flex",
        !live ? "border-amber-200 bg-amber-50 text-amber-800" : loadError ? "border-rose-200 bg-rose-50 text-rose-700" : "border-brand-200 bg-brand-50 text-brand-700",
      )}
    >
      <i className={cn("size-2 rounded-full", !live ? "bg-amber-500" : loadError ? "bg-rose-500" : "bg-brand-500")} />
      {!live ? "데모" : loadError ? "DB 오류" : "DB 연결"}
    </span>
    <button
      onClick={() => setRole(admin ? "user" : "admin")}
      title="데모: 일반 직원 / 관리자 화면 전환"
      className={cn(
        "flex h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition",
        admin ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-2 hover:border-brand-200",
      )}
    >
      <ShieldCheck className="size-4" />
      <span className="hidden sm:inline">{admin ? "관리자" : "일반 직원"}</span>
    </button>
    </>
  );
}
