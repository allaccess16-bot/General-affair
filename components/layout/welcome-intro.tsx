"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { INTRO_EXIT_EVENT, INTRO_SEEN_KEY } from "@/lib/intro";

/** 모바일은 두 줄(총무통합 / 지원센터), 넓은 화면은 한 줄 */
const TITLE_LINES = ["총무통합", "지원센터"];
const EASE = [0.22, 1, 0.36, 1] as const;
const WIPE = [0.76, 0, 0.24, 1] as const;
/** 인트로 유지 시간(ms) — 이후 화면이 위로 걷힘 */
const HOLD = 2700;

/** 홈 첫 방문 시 '총무통합지원센터' 웰컴 애니메이션 (클릭·Esc로 건너뛰기) */
export function WelcomeIntro() {
  const home = usePathname() === "/";
  const [show, setShow] = useState(true);
  const timer = useRef<number | undefined>(undefined);
  const exited = useRef(false);

  const finish = useCallback(() => {
    window.clearTimeout(timer.current);
    if (exited.current) return;
    exited.current = true;
    window.dispatchEvent(new Event(INTRO_EXIT_EVENT));
    setShow(false);
  }, []);

  useEffect(() => {
    if (document.documentElement.dataset.intro !== "play") {
      setShow(false);
      return;
    }
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {}
    timer.current = window.setTimeout(finish, HOLD);
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" || e.key === "Enter" || e.key === " ") && finish();
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer.current);
      window.removeEventListener("keydown", onKey);
    };
  }, [finish]);

  return (
    <AnimatePresence onExitComplete={() => (document.documentElement.dataset.intro = "done")}>
      {home && show && (
        <motion.div
          key="intro"
          className="hw-intro fixed inset-0 z-[100] grid h-dvh cursor-pointer place-items-center overflow-hidden bg-brand-950 text-white"
          onClick={finish}
          role="dialog"
          aria-label="총무통합지원센터 시작 화면"
          initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
          exit={{ clipPath: "inset(0% 0% 100% 0%)", transition: { duration: 0.95, ease: WIPE } }}
        >
          {/* 배경: 깊은 그린 + 은은한 빛 + 격자 */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_100%,#0b5a48_0%,#062520_55%,#031512_100%)]" />
            <motion.div
              className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-400/25 blur-[100px] sm:size-[680px] sm:blur-[140px]"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 2.2, ease: EASE }}
            />
            <div className="intro-grid absolute inset-0 opacity-25 [mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_65%)] sm:opacity-[0.35]" />
            {/* 은은한 입자: 위로 떠오르는 빛 점 */}
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute size-1 rounded-full bg-brand-200/60"
                style={{ left: `${(i * 37) % 100}%`, bottom: `${(i * 23) % 40}%` }}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 0.9, 0], y: -120 - (i % 4) * 40 }}
                transition={{ duration: 2.6 + (i % 3) * 0.6, delay: 0.2 + (i % 7) * 0.18, ease: "easeOut" }}
              />
            ))}
          </div>

          <motion.div
            className="relative flex flex-col items-center px-6 text-center"
            exit={{ y: -60, opacity: 0, transition: { duration: 0.6, ease: WIPE } }}
          >
            {/* 로고 심벌: 링이 그려진 뒤 H가 떠오름 */}
            <div className="relative grid size-[72px] place-items-center sm:size-[84px]">
              <svg viewBox="0 0 84 84" className="absolute inset-0" aria-hidden>
                <motion.circle
                  cx="42"
                  cy="42"
                  r="39"
                  fill="none"
                  stroke="url(#introRing)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, rotate: -90, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.1, ease: EASE, delay: 0.1 }}
                  style={{ originX: "50%", originY: "50%" }}
                />
                <defs>
                  <linearGradient id="introRing" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#b9f3df" />
                    <stop offset="100%" stopColor="#34aa87" />
                  </linearGradient>
                </defs>
              </svg>
              <motion.span
                className="grid size-[52px] place-items-center rounded-[18px] sm:size-[60px] sm:rounded-[20px] bg-gradient-to-br from-brand-300 to-brand-600 shadow-[0_20px_50px_-12px_rgb(52_170_135/0.7)]"
                initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 14, stiffness: 160, delay: 0.45 }}
              >
                <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
                  <path d="M7 24V8h4v6.2h10V8h4v16h-4v-6h-10v6z" fill="#fff" />
                  <circle cx="25" cy="7" r="3" fill="#b9f3df" />
                </svg>
              </motion.span>
            </div>

            <motion.p
              className="mt-7 text-[10px] font-semibold tracking-[0.42em] text-brand-200/80 sm:mt-8 sm:text-xs"
              initial={{ opacity: 0, letterSpacing: "0.8em" }}
              animate={{ opacity: 1, letterSpacing: "0.42em" }}
              transition={{ duration: 1.2, ease: EASE, delay: 0.55 }}
            >
              HANA LIFE · HANA WORKS
            </motion.p>

            {/* 타이틀: 한 글자씩 아래에서 떠오르며 선명해짐 (모바일 두 줄) */}
            <h1 className="mt-4 flex flex-col items-center text-[56px] font-extrabold leading-[1.02] tracking-[-0.045em] sm:flex-row sm:text-[68px] sm:leading-none md:text-[84px]">
              {TITLE_LINES.map((line, li) => (
                <span key={line} className="flex overflow-hidden pb-2">
                  {Array.from(line).map((ch, ci) => (
                    <motion.span
                      key={ci}
                      className="inline-block bg-gradient-to-b from-white to-brand-100 bg-clip-text text-transparent"
                      initial={{ y: "105%", opacity: 0, filter: "blur(10px)" }}
                      animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
                      transition={{ duration: 0.8, ease: EASE, delay: 0.75 + (li * 4 + ci) * 0.07 }}
                    >
                      {ch}
                    </motion.span>
                  ))}
                </span>
              ))}
            </h1>

            {/* 빛이 지나가는 라인 */}
            <div className="relative mt-5 h-px w-[min(420px,64vw)] overflow-hidden sm:mt-6">
              <motion.span
                className="absolute inset-0 origin-center bg-gradient-to-r from-transparent via-brand-300 to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, ease: EASE, delay: 1.35 }}
              />
              <motion.span
                className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white to-transparent"
                initial={{ x: "-120%" }}
                animate={{ x: "520%" }}
                transition={{ duration: 1.2, ease: "easeInOut", delay: 1.6 }}
              />
            </div>

            <motion.p
              className="mt-5 max-w-[16rem] text-[13px] font-medium leading-relaxed text-brand-100/80 sm:max-w-none sm:text-base"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 1.55 }}
            >
              업무 신청부터 예약·승인까지,<br className="sm:hidden" /> 하나의 플랫폼에서
            </motion.p>
          </motion.div>

          {/* 진행 바 + 건너뛰기 */}
          <motion.div
            className="absolute bottom-[max(2rem,env(safe-area-inset-bottom))] left-1/2 h-[2px] w-24 -translate-x-1/2 overflow-hidden rounded-full bg-white/10 sm:w-28"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.span
              className="block h-full origin-left bg-brand-300"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: HOLD / 1000, ease: "linear" }}
            />
          </motion.div>
          <motion.button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              finish();
            }}
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-white/70 transition hover:border-white/40 hover:text-white sm:bottom-6 sm:right-6 sm:top-auto sm:px-4 sm:py-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.8 }}
          >
            건너뛰기
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
