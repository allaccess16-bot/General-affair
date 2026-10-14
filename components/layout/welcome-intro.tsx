"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { INTRO_EXIT_EVENT, INTRO_SEEN_KEY } from "@/lib/intro";

const EASE = [0.22, 1, 0.36, 1] as const;
const WIPE = [0.76, 0, 0.24, 1] as const;
/** 애니메이션 시작 후 유지 시간(ms) — 이후 화면이 위로 걷힘 */
const HOLD = 2500;
/** 글꼴을 기다리는 최대 시간(ms) — 느린 네트워크에서도 오래 멈춰 있지 않도록 */
const FONT_WAIT = 900;

/**
 * 홈 첫 방문 시 '총무통합지원센터' 웰컴 애니메이션 (클릭·Esc로 건너뛰기)
 * 모바일 품질을 위해: 글꼴 로딩 후 시작(글자 모양이 중간에 바뀌지 않음),
 * 블러 필터·글자별 그라데이션 대신 transform/opacity만 사용(GPU 합성, iOS 렌더링 깨짐 방지)
 */
export function WelcomeIntro() {
  const home = usePathname() === "/";
  const [show, setShow] = useState(true);
  const [ready, setReady] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const exited = useRef(false);
  const restoreTheme = useRef<() => void>(() => {});

  const finish = useCallback(() => {
    window.clearTimeout(timer.current);
    if (exited.current) return;
    exited.current = true;
    window.dispatchEvent(new Event(INTRO_EXIT_EVENT));
    restoreTheme.current();
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
    // 휴대폰 상단 상태표시줄 색을 인트로 배경에 맞춤 (종료 시 원래 색으로)
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const prevTheme = meta?.content;
    meta?.setAttribute("content", "#041a16");
    restoreTheme.current = () => prevTheme && meta?.setAttribute("content", prevTheme);
    let alive = true;
    const start = () => {
      if (!alive || exited.current) return;
      setReady(true);
      timer.current = window.setTimeout(finish, HOLD);
    };
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    Promise.race([fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, FONT_WAIT))]).then(start);
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" || e.key === "Enter" || e.key === " ") && finish();
    window.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      window.clearTimeout(timer.current);
      window.removeEventListener("keydown", onKey);
    };
  }, [finish]);

  return (
    <AnimatePresence onExitComplete={() => (document.documentElement.dataset.intro = "done")}>
      {home && show && (
        <motion.div
          key="intro"
          className="hw-intro fixed inset-0 z-[100] cursor-pointer overflow-hidden bg-[#041a16] text-white"
          onClick={finish}
          role="dialog"
          aria-label="총무통합지원센터 시작 화면"
          initial={{ y: 0 }}
          exit={{ y: "-100%", transition: { duration: 0.9, ease: WIPE } }}
          style={{ willChange: "transform" }}
        >
          {/* 배경: 필터 없이 그라데이션만 (모바일에서도 가볍게) */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(130%_80%_at_50%_110%,#0d6a55_0%,#063b31_42%,#041a16_78%)]" />
            <motion.div
              className="absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_42%,rgb(52_170_135/0.32),transparent_70%)]"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={ready ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 1.8, ease: EASE }}
            />
            <div className="intro-grid absolute inset-0 opacity-20 [mask-image:radial-gradient(70%_50%_at_50%_45%,black,transparent)] sm:opacity-30" />
          </div>

          {/* 화면 높이에 맞춘 중앙 정렬 (모바일 주소창 높이 변화 대응) */}
          <div className="relative grid h-[100svh] place-items-center px-6">
            <motion.div
              className="flex flex-col items-center text-center"
              exit={{ y: -40, opacity: 0, transition: { duration: 0.5, ease: WIPE } }}
            >
              {ready && (
                <>
                  {/* 로고 심벌: 링이 그려지고 심벌이 떠오름 */}
                  <div className="relative grid size-[68px] place-items-center sm:size-[84px]">
                    <svg viewBox="0 0 84 84" className="absolute inset-0 -rotate-90" aria-hidden>
                      <circle cx="42" cy="42" r="39" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="2" />
                      <motion.circle
                        cx="42"
                        cy="42"
                        r="39"
                        fill="none"
                        stroke="#7fdcbc"
                        strokeWidth="2"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1, ease: EASE }}
                      />
                    </svg>
                    <motion.span
                      className="grid size-[48px] place-items-center rounded-[16px] bg-gradient-to-br from-brand-300 to-brand-600 shadow-[0_16px_40px_-14px_rgb(52_170_135/0.9)] sm:size-[60px] sm:rounded-[20px]"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", damping: 16, stiffness: 200, delay: 0.25 }}
                    >
                      <svg viewBox="0 0 32 32" className="size-7 sm:size-8" aria-hidden>
                        <path d="M7 24V8h4v6.2h10V8h4v16h-4v-6h-10v6z" fill="#fff" />
                        <circle cx="25" cy="7" r="3" fill="#b9f3df" />
                      </svg>
                    </motion.span>
                  </div>

                  <motion.p
                    className="mt-7 pl-[0.35em] text-[10px] font-semibold tracking-[0.35em] text-brand-200/75 sm:mt-8 sm:text-xs sm:tracking-[0.42em]"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: EASE, delay: 0.35 }}
                  >
                    HANA LIFE · HANA WORKS
                  </motion.p>

                  {/* 타이틀: 줄 단위로 가림막 아래에서 올라옴 (모바일 두 줄 / PC 한 줄) */}
                  <h1 className="mt-3 flex flex-col items-center text-[clamp(44px,13.5vw,58px)] font-extrabold leading-[1.08] tracking-[-0.03em] sm:mt-4 sm:flex-row sm:text-[68px] sm:leading-[1.1] md:text-[84px]">
                    {[
                      { text: "총무통합", cls: "text-white" },
                      { text: "지원센터", cls: "text-[#a6ecd3]" },
                    ].map((l, i) => (
                      <span key={l.text} className="block overflow-hidden px-[0.04em] pb-[0.08em]">
                        <motion.span
                          className={`block ${l.cls}`}
                          initial={{ y: "110%" }}
                          animate={{ y: "0%" }}
                          transition={{ duration: 0.9, ease: EASE, delay: 0.45 + i * 0.14 }}
                        >
                          {l.text}
                        </motion.span>
                      </span>
                    ))}
                  </h1>

                  {/* 빛이 지나가는 라인 */}
                  <div className="relative mt-5 h-px w-[min(360px,58vw)] overflow-hidden sm:mt-6">
                    <motion.span
                      className="absolute inset-0 origin-center bg-gradient-to-r from-transparent via-brand-300/80 to-transparent"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.9, ease: EASE, delay: 0.9 }}
                    />
                    <motion.span
                      className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white to-transparent"
                      initial={{ x: "-150%" }}
                      animate={{ x: "600%" }}
                      transition={{ duration: 1.1, ease: "easeInOut", delay: 1.15 }}
                    />
                  </div>

                  <motion.p
                    className="mt-5 text-[13px] font-medium leading-relaxed text-brand-100/75 sm:text-base"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: EASE, delay: 1.05 }}
                  >
                    업무 신청부터 예약·승인까지
                    <br className="sm:hidden" />
                    <span className="hidden sm:inline">, </span>하나의 플랫폼에서
                  </motion.p>
                </>
              )}
            </motion.div>
          </div>

          {/* 진행 바 + 건너뛰기 */}
          {ready && (
            <>
              <motion.div
                className="absolute bottom-[max(1.75rem,calc(env(safe-area-inset-bottom)+1rem))] left-1/2 h-[2px] w-20 -translate-x-1/2 overflow-hidden rounded-full bg-white/10 sm:w-28"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
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
                className="absolute right-4 top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/70 transition hover:border-white/40 hover:text-white sm:bottom-6 sm:right-6 sm:top-auto sm:px-4 sm:py-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                건너뛰기
              </motion.button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
