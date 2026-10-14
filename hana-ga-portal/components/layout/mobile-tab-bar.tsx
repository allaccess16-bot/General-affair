"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRequests } from "@/components/providers/requests-provider";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";

/** 모바일 하단 탭 — 4개 모듈 + 가운데 바로 신청 */
export function MobileTabBar() {
  const pathname = usePathname();
  const { openRequest } = useRequests();
  const [a, b, c, d] = MODULES;
  const item = (m: (typeof MODULES)[number]) => {
    const Icon = m.icon;
    const active = pathname.startsWith(m.href);
    return (
      <Link
        key={m.key}
        href={m.href}
        className={cn("flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold", active ? "text-brand-700" : "text-ink-3")}
      >
        <Icon className="size-5" />
        {m.shortName}
      </Link>
    );
  };
  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-40 flex items-center rounded-[22px] border border-line bg-white/90 px-1 shadow-[0_12px_40px_-12px_rgb(15_31_27/0.35)] backdrop-blur-xl md:hidden"
      aria-label="모바일 바로가기"
    >
      {item(a)}
      {item(b)}
      <button
        onClick={() => openRequest()}
        className="-mt-6 grid size-14 shrink-0 place-items-center rounded-full bg-brand-600 text-white shadow-[0_10px_24px_-8px_rgb(0_119_95/0.8)] ring-4 ring-white"
        aria-label="바로 신청"
      >
        <Plus className="size-6" />
      </button>
      {item(c)}
      {item(d)}
    </nav>
  );
}
