"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, CheckCheck, Hourglass, Megaphone, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRequests } from "@/components/providers/requests-provider";
import { CountUp } from "@/components/ui/count-up";
import { Stagger, staggerItem } from "@/components/ui/reveal";
import { NOTICES } from "@/lib/data";
import { MODULES } from "@/lib/modules";
import { addDays, todayStr } from "@/lib/shared";

type Tile = { label: string; value: number; desc: string; icon: LucideIcon; tone: string; progress: number };

const WAITING = ["접수", "승인대기"];
const DOING = ["진행중", "승인완료"];

/** 관리자용 정보 카드 — 다크 그린 배경으로 섹션 리듬에 변화 */
/** 관리자센터 전용 — 실제 신청 데이터로 오늘 처리할 업무 집계 */
export function AdminInsight() {
  const urgent = NOTICES.find((n) => n.tag === "긴급");
  const { requests } = useRequests();
  const waiting = requests.filter((r) => WAITING.includes(r.status));
  const doing = requests.filter((r) => DOING.includes(r.status));
  const stale = waiting.filter((r) => r.requestedAt <= addDays(todayStr(), -2));
  const open = Math.max(1, waiting.length + doing.length);
  const byModule = MODULES.map((m) => `${m.shortName.replace("업무", "").replace("날인", "")} ${waiting.filter((r) => r.module === m.key).length}`).join(" · ");
  const TILES: Tile[] = [
    { label: "처리 대기", value: waiting.length, desc: byModule, icon: Hourglass, tone: "#f5c66b", progress: waiting.length / open },
    { label: "진행 중", value: doing.length, desc: "담당자 배정·승인 완료 후 처리 중", icon: CheckCheck, tone: "#7ee0bd", progress: doing.length / open },
    { label: "장기 미처리", value: stale.length, desc: "접수 후 48시간 이상 경과", icon: AlertTriangle, tone: "#ff9aa9", progress: waiting.length ? stale.length / waiting.length : 0 },
  ];
  return (
    <section>
      <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 px-5 py-10 text-white md:px-10 md:py-14">
        <div className="absolute -right-24 -top-24 size-[380px] rounded-full bg-brand-400/25 blur-[100px]" aria-hidden />
        <div className="absolute -bottom-32 left-10 size-[300px] rounded-full bg-[#3cc4a0]/20 blur-[100px]" aria-hidden />
        <div className="bg-grid absolute inset-0 opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-brand-200">FOR MANAGERS</p>
            <h2 className="mt-3 text-[26px] font-extrabold leading-tight tracking-tight md:text-[34px]">오늘 처리해야 할 업무</h2>
            <p className="mt-2 text-brand-100/80">담당자·관리자 권한이 있는 업무만 집계됩니다.</p>
          </div>
          <Link
            href="#requests"
            className="inline-flex items-center gap-2 self-start rounded-full bg-white px-5 py-3 text-sm font-bold text-brand-800 transition hover:-translate-y-0.5 md:self-auto"
          >
            전체 신청 현황 보기 <ArrowUpRight className="size-4" />
          </Link>
        </div>

        <Stagger className="relative mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {TILES.map((t) => {
            const Icon = t.icon;
            return (
              <motion.div
                key={t.label}
                variants={staggerItem}
                whileHover={{ y: -4 }}
                className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-md transition-colors hover:bg-white/[0.11]"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-white/10" style={{ color: t.tone }}>
                    <Icon className="size-5" />
                  </span>
                  <svg viewBox="0 0 36 36" className="size-10 -rotate-90" aria-hidden>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="4" />
                    <motion.circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke={t.tone}
                      strokeWidth="4"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: t.progress }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                  </svg>
                </div>
                <p className="mt-5 text-sm font-semibold text-brand-100">{t.label}</p>
                <p className="mt-1 text-4xl font-extrabold tracking-tight">
                  <CountUp value={t.value} />
                  <span className="ml-1 text-base font-bold text-brand-200">건</span>
                </p>
                <p className="mt-2 text-xs text-brand-100/70">{t.desc}</p>
              </motion.div>
            );
          })}

          <motion.div
            variants={staggerItem}
            whileHover={{ y: -4 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 to-rose-700 p-5 shadow-[0_20px_40px_-20px_rgb(225_29_72/0.8)]"
          >
            <span className="absolute right-4 top-4 flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-70" />
              <span className="relative inline-flex size-3 rounded-full bg-white" />
            </span>
            <span className="grid size-11 place-items-center rounded-2xl bg-white/15">
              <Megaphone className="size-5" />
            </span>
            <p className="mt-5 text-sm font-semibold text-rose-100">긴급 공지</p>
            <p className="mt-1 font-bold leading-snug">{urgent?.title.replace("[긴급] ", "")}</p>
            <p className="mt-3 text-xs text-rose-100/80">{urgent?.date.replaceAll("-", ".")} 게시</p>
          </motion.div>
        </Stagger>
      </div>
    </section>
  );
}
