"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CalendarPlus,
  CarFront,
  ChevronDown,
  FileDown,
  FileSignature,
  HelpCircle,
  Megaphone,
  Package,
  PlayCircle,
  Pin,
  Repeat,
  Search,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { NOTICES, type Notice } from "@/lib/data";
import { FAQ_CATEGORIES, FAQS, GUIDES, type FaqCategory, type Guide } from "@/lib/help";
import { GuideModal } from "./guide-modal";
import { cn } from "@/lib/utils";

const TAG_STYLE: Record<Notice["tag"], string> = {
  긴급: "bg-rose-50 text-rose-600",
  점검: "bg-amber-50 text-amber-700",
  공지: "bg-brand-50 text-brand-700",
  안내: "bg-sky-50 text-sky-700",
};

const SHORTCUTS: { label: string; href: string; icon: LucideIcon; color: string }[] = [
  { label: "회의실 예약", href: "/meeting", icon: CalendarPlus, color: "var(--color-mod-meeting)" },
  { label: "반복 예약", href: "/meeting", icon: Repeat, color: "var(--color-mod-meeting)" },
  { label: "차량 배차", href: "/vehicle", icon: CarFront, color: "var(--color-mod-vehicle)" },
  { label: "사무용품", href: "/ga", icon: Package, color: "var(--color-mod-ga)" },
  { label: "날인 신청", href: "/seal", icon: FileSignature, color: "var(--color-mod-seal)" },
  { label: "사용대장", href: "/seal", icon: FileDown, color: "var(--color-mod-seal)" },
];

export function InfoHub() {
  const [openFaq, setOpenFaq] = useState(0);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [cat, setCat] = useState<FaqCategory | "전체">("전체");
  const [fq, setFq] = useState("");
  const faqs = FAQS.filter((f) => (cat === "전체" || f.cat === cat) && (!fq.trim() || `${f.q} ${f.a}`.includes(fq.trim())));
  return (
    <section className="mx-auto max-w-[1320px] px-4 py-16 md:px-8 md:py-20">
      <SectionHeading eyebrow="HELP CENTER" title="공지사항과 이용 가이드" align="center" description="필요한 정보를 빠르게 찾고, 자주 쓰는 메뉴로 바로 이동하세요." />

      <div className="grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Card className="h-full p-5 md:p-6">
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Megaphone className="size-5 text-brand-600" /> 공지사항
                </span>
              }
              action={<button className="text-sm font-semibold text-ink-3 hover:text-brand-700">더보기</button>}
              className="mb-3"
            />
            <ul className="divide-y divide-line">
              {NOTICES.map((n) => (
                <li key={n.id}>
                  <button className="group flex w-full items-center gap-3 py-3.5 text-left">
                    <Badge className={cn("w-12 shrink-0 justify-center", TAG_STYLE[n.tag])}>{n.tag}</Badge>
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                      {n.pinned && <Pin className="size-3.5 shrink-0 text-brand-500" aria-label="상단 고정" />}
                      <span className="truncate text-[15px] font-medium text-ink transition group-hover:text-brand-700">{n.title}</span>
                    </span>
                    <span className="hidden shrink-0 text-sm text-ink-3 tabular sm:block">{n.date.replaceAll("-", ".")}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>

        <Reveal delay={0.1}>
          <Card className="h-full p-5 md:p-6">
            <CardHeader title="자주 찾는 메뉴" className="mb-4" />
            <div className="grid grid-cols-3 gap-2.5">
              {SHORTCUTS.map((s) => {
                const Icon = s.icon;
                return (
                  <Link
                    key={s.label}
                    href={s.href}
                    className="group flex flex-col items-center gap-2 rounded-2xl bg-canvas px-2 py-4 text-center transition hover:-translate-y-1 hover:bg-white hover:shadow-card"
                  >
                    <span
                      className="grid size-11 place-items-center rounded-2xl bg-white transition group-hover:scale-110"
                      style={{ color: s.color }}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="text-xs font-semibold text-ink-2">{s.label}</span>
                  </Link>
                );
              })}
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white shadow-card">
            <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/15 blur-2xl" aria-hidden />
            <BookOpen className="size-8 text-brand-100" />
            <h3 className="mt-4 text-xl font-bold">시스템 이용 가이드</h3>
            <p className="mt-1 text-sm text-brand-50/85">처음이어도 5분이면 충분합니다.</p>
            <ul className="mt-6 space-y-2">
              {GUIDES.map((g) => (
                <li key={g.title}>
                  <motion.button
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setGuide(g)}
                    className="group flex w-full items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-left transition-colors hover:bg-white/20"
                  >
                    <PlayCircle className="size-5 shrink-0 text-brand-100" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{g.title}</span>
                      <span className="block text-xs text-brand-100/80">{g.meta}</span>
                    </span>
                    <span className="text-xs font-bold text-white/70 transition group-hover:text-white">보기</span>
                  </motion.button>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-2" delay={0.1}>
          <Card className="h-full p-5 md:p-6">
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <HelpCircle className="size-5 text-brand-600" /> 자주 묻는 질문
                </span>
              }
              className="mb-3"
            />
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-1 overflow-x-auto scrollbar-none">
                {(["전체", ...FAQ_CATEGORIES] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => (setCat(c), setOpenFaq(-1))}
                    className={cn("relative shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors", cat === c ? "text-white" : "text-ink-2 hover:bg-canvas")}
                  >
                    {cat === c && <motion.span layoutId="faq-cat" className="absolute inset-0 rounded-full bg-brand-600" transition={{ type: "spring", damping: 30, stiffness: 400 }} />}
                    <span className="relative">{c}</span>
                  </button>
                ))}
              </div>
              <label className="relative block sm:w-56">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
                <input className="input h-9 pl-9 text-sm" placeholder="궁금한 내용 검색" value={fq} onChange={(e) => (setFq(e.target.value), setOpenFaq(-1))} />
              </label>
            </div>
            {faqs.length === 0 && <p className="rounded-2xl bg-canvas px-4 py-8 text-center text-sm text-ink-3">검색 결과가 없습니다. 경영지원부로 문의해주세요.</p>}
            <motion.ul layout className="space-y-2">
              {faqs.map((f, i) => {
                const open = openFaq === i;
                return (
                  <motion.li layout key={f.q} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.03 }} className={cn("rounded-2xl border transition-colors", open ? "border-brand-200 bg-brand-50/50" : "border-line")}>
                    <button
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                      aria-expanded={open}
                      onClick={() => setOpenFaq(open ? -1 : i)}
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">Q</span>
                      <span className="flex-1 text-[15px] font-semibold">{f.q}</span>
                      <span className="hidden shrink-0 rounded-full bg-canvas px-2 py-0.5 text-[11px] font-bold text-ink-3 sm:inline">{f.cat}</span>
                      <ChevronDown className={cn("size-4 text-ink-3 transition-transform", open && "rotate-180")} />
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                          <motion.p initial={{ y: -6 }} animate={{ y: 0 }} className="flex gap-3 px-4 pb-4 text-sm leading-relaxed text-ink-2">
                            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-brand-700 ring-1 ring-brand-200">A</span>
                            <span>{f.a}</span>
                          </motion.p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </motion.ul>
          </Card>
        </Reveal>
      </div>
      <GuideModal guide={guide} onClose={() => setGuide(null)} />
    </section>
  );
}
