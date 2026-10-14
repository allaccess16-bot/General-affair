"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Download, FileClock, Search, ShieldCheck, UserCog, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { MonthlyStacked } from "@/components/charts/monthly-stacked";
import { StatusDonut } from "@/components/charts/status-donut";
import { RequestTable } from "@/components/modules/request-table";
import { useRequests } from "@/components/providers/requests-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Reveal, Stagger, staggerItem } from "@/components/ui/reveal";
import { DEPARTMENTS, STATUSES, type WorkRequest } from "@/lib/data";
import { MODULES, MODULE_MAP } from "@/lib/modules";
import { cn } from "@/lib/utils";

const AUDIT = [
  { time: "10:42", actor: "김경영 부장", action: "승인", target: "SEAL-202610-0021 · 1차 결재", tone: "text-brand-700 bg-brand-50" },
  { time: "10:15", actor: "장민준 대리", action: "배정", target: "GA-202610-0142 · 담당자 지정", tone: "text-sky-700 bg-sky-50" },
  { time: "09:58", actor: "서지아 과장", action: "취소", target: "MR-202610-0377 · 예약 취소", tone: "text-zinc-600 bg-zinc-100" },
  { time: "09:31", actor: "시스템 관리자", action: "권한", target: "윤채원 · 차량 관리자 권한 부여", tone: "text-violet-700 bg-violet-50" },
  { time: "09:05", actor: "백승호 차장", action: "완료", target: "SEAL-202610-0020 · 날인 완료 등록", tone: "text-brand-700 bg-brand-50" },
];

const PERIODS = ["오늘", "이번 주", "이번 달", "최근 6개월"];

/** CSV(UTF-8 BOM) — Excel에서 한글이 깨지지 않고 바로 열림 */
function downloadCsv(rows: WorkRequest[]) {
  const head = ["신청번호", "업무", "신청 내용", "신청자", "부서", "신청일", "일정", "상태", "긴급"];
  const body = rows.map((r) => [r.no, MODULE_MAP[r.module].name, r.title, r.requester, r.dept, r.requestedAt, r.scheduledAt, r.status, r.urgent ? "Y" : ""]);
  const csv = [head, ...body].map((line) => line.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `업무신청현황_${new Date().toISOString().slice(0, 10)}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminCenter() {
  const params = useSearchParams();
  const { requests } = useRequests();
  const [period, setPeriod] = useState("이번 달");
  const [mod, setMod] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [dept, setDept] = useState(params.get("dept") ?? "");
  const [q, setQ] = useState("");

  const rows = useMemo(
    () =>
      requests.filter(
        (r) =>
          (!mod || r.module === mod) &&
          (!status || r.status === status) &&
          (!dept || r.dept === dept) &&
          (!q.trim() || `${r.title} ${r.no} ${r.requester}`.includes(q.trim())),
      ),
    [requests, mod, status, dept, q],
  );

  return (
    <div>
      <section className="relative -mt-[72px] overflow-hidden pt-[72px]">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950" aria-hidden />
        <div className="bg-grid absolute inset-0 -z-10 opacity-20" aria-hidden />
        <div className="absolute -right-20 top-0 -z-10 size-[420px] rounded-full bg-brand-400/30 blur-[120px]" aria-hidden />
        <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 pb-24 pt-10 text-white md:flex-row md:items-end md:justify-between md:px-8 md:pt-14">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-brand-100">
              <ShieldCheck className="size-3.5" /> 시스템 관리자 · 경영지원부
            </p>
            <h1 className="mt-5 text-[32px] font-extrabold tracking-tight md:text-[44px]">통합 관리자 센터</h1>
            <p className="mt-2 text-brand-100/80 md:text-lg">4개 업무 모듈의 처리 현황, 통계, 권한과 이력을 한 화면에서 관리합니다.</p>
          </motion.div>
          <div className="flex gap-1 self-start rounded-full bg-white/10 p-1 backdrop-blur md:self-auto" role="tablist" aria-label="기간">
            {PERIODS.map((p) => (
              <button
                key={p}
                role="tab"
                aria-selected={period === p}
                onClick={() => setPeriod(p)}
                className={cn("rounded-full px-4 py-2 text-sm font-semibold transition", period === p ? "bg-white text-brand-800" : "text-brand-100 hover:text-white")}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-16 max-w-[1320px] space-y-6 px-4 md:px-8">
        {/* 모듈별 처리 대기·진행 */}
        <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const list = requests.filter((r) => r.module === m.key);
            const waiting = list.filter((r) => r.status === "접수" || r.status === "승인대기").length;
            const doing = list.filter((r) => r.status === "진행중" || r.status === "승인완료").length;
            const done = list.filter((r) => r.status === "완료").length;
            return (
              <motion.div key={m.key} variants={staggerItem} whileHover={{ y: -4 }}>
                <Link href={m.href} className="group block rounded-3xl border border-line bg-white p-5 shadow-card transition-shadow hover:shadow-lift">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2.5">
                      <span className="grid size-10 place-items-center rounded-2xl text-white" style={{ background: m.color }}>
                        <Icon className="size-5" />
                      </span>
                      <span className="font-bold">{m.shortName}</span>
                    </span>
                    <ArrowUpRight className="size-4 text-ink-3 transition group-hover:text-brand-600" />
                  </div>
                  <div className="mt-5 grid grid-cols-3 divide-x divide-line text-center">
                    {[
                      ["대기", waiting, "text-amber-700"],
                      ["진행", doing, "text-sky-700"],
                      ["완료", done, "text-brand-700"],
                    ].map(([label, v, c]) => (
                      <div key={String(label)}>
                        <p className="text-xs font-semibold text-ink-3">{label}</p>
                        <p className={cn("mt-1 text-2xl font-extrabold", String(c))}>
                          <CountUp value={Number(v)} />
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-canvas">
                    {list.length > 0 && (
                      <>
                        <span className="bg-amber-400" style={{ width: `${(waiting / list.length) * 100}%` }} />
                        <span className="bg-sky-500" style={{ width: `${(doing / list.length) * 100}%` }} />
                        <span className="bg-brand-500" style={{ width: `${(done / list.length) * 100}%` }} />
                      </>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </Stagger>

        <div id="stats" className="grid scroll-mt-24 gap-5 lg:grid-cols-[1.6fr_1fr]">
          <Reveal>
            <Card className="h-full p-5 md:p-6">
              <CardHeader title="기간별 업무 처리 통계" description={`${period} 기준 · 모듈별 누적 (샘플)`} className="mb-4" />
              <MonthlyStacked height={280} />
            </Card>
          </Reveal>
          <Reveal delay={0.1}>
            <Card className="h-full p-5 md:p-6">
              <CardHeader title="전체 진행 상태" className="mb-5" />
              <StatusDonut />
            </Card>
          </Reveal>
        </div>

        <Reveal>
          <Card id="requests" className="scroll-mt-24 p-5 md:p-6">
            <CardHeader
              title="전체 업무 신청 현황"
              description={`조회 결과 ${rows.length}건`}
              action={
                <Button size="sm" variant="secondary" onClick={() => downloadCsv(rows)}>
                  <Download className="size-4" /> 엑셀 다운로드
                </Button>
              }
              className="mb-4"
            />
            <div className="mb-5 grid gap-2 md:grid-cols-[1fr_160px_160px_160px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="제목, 신청번호, 신청자 검색" className="input pl-10" />
              </label>
              <select value={mod} onChange={(e) => setMod(e.target.value)} className="input" aria-label="업무">
                <option value="">전체 업무</option>
                {MODULES.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.shortName}
                  </option>
                ))}
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input" aria-label="상태">
                <option value="">전체 상태</option>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select value={dept} onChange={(e) => setDept(e.target.value)} className="input" aria-label="부서">
                <option value="">전체 부서</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <RequestTable rows={rows} />
          </Card>
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <Card className="h-full p-5 md:p-6">
              <CardHeader title="사용자 · 권한 관리" description="직원·부서 정보와 역할 권한" className="mb-5" />
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Users, label: "등록 직원", value: 248 },
                  { icon: UserCog, label: "담당자", value: 14 },
                  { icon: ShieldCheck, label: "관리자", value: 4 },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="rounded-2xl bg-canvas p-4 text-center">
                      <Icon className="mx-auto size-5 text-brand-600" />
                      <p className="mt-2 text-2xl font-extrabold">
                        <CountUp value={s.value} />
                      </p>
                      <p className="text-xs text-ink-3">{s.label}</p>
                    </div>
                  );
                })}
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {["일반 직원 — 본인 신청·예약", "총무 담당자 — 배정 업무 처리", "인장 승인자 — 지정 인장 승인", "시스템 관리자 — 전체 관리"].map((r) => (
                  <li key={r} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-ink-2">
                    <span className="size-1.5 rounded-full bg-brand-500" /> {r}
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
          <Reveal delay={0.1}>
            <Card className="h-full p-5 md:p-6">
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <FileClock className="size-5 text-brand-600" /> 감사 로그
                  </span>
                }
                description="신청·변경·승인·취소·완료 이력 (변경 불가 기록)"
                className="mb-5"
              />
              <ol className="relative space-y-4 border-l-2 border-line pl-6">
                {AUDIT.map((a, i) => (
                  <motion.li
                    key={a.time}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="relative"
                  >
                    <span className="absolute -left-[31px] top-1 size-3 rounded-full border-2 border-white bg-brand-500 ring-2 ring-brand-100" />
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-bold tabular text-ink">{a.time}</span>
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", a.tone)}>{a.action}</span>
                      <span className="font-semibold text-ink-2">{a.actor}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-3">{a.target}</p>
                  </motion.li>
                ))}
              </ol>
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
