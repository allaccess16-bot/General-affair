"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CarFront, Clock3, Inbox, LogOut, Presentation, RefreshCw, ShieldCheck, ShieldOff, Stamp } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { DEPARTMENTS, validContact, validFullName } from "@/lib/shared";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/** 실DB 모드에서 승인된 직원만 업무 화면에 들어오도록 막는 관문 (데모 모드는 그대로 통과) */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === "demo" || status === "active") return <>{children}</>;
  if (status === "loading")
    return (
      <div className="grid min-h-dvh place-items-center">
        <span className="size-10 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600" aria-label="로그인 확인 중" />
      </div>
    );
  return <AuthShell>{status === "signedOut" ? <LoginCard /> : <StatusCard kind={status} />}</AuthShell>;
}

/* ------------------------------ 공통 틀 ------------------------------ */
function AuthShell({ children }: { children: React.ReactNode }) {
  const features = [
    { icon: Inbox, label: "총무 업무 요청" },
    { icon: CarFront, label: "법인차량 배차" },
    { icon: Presentation, label: "회의실 예약" },
    { icon: Stamp, label: "인장 날인 신청" },
  ];
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* 브랜드 패널 */}
      <div className="relative hidden overflow-hidden bg-brand-950 text-white lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_100%,#0b5a48_0%,#062520_55%,#031512_100%)]" aria-hidden />
        <div className="intro-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_30%_60%,black_20%,transparent_70%)]" aria-hidden />
        <motion.div
          className="absolute -left-32 bottom-0 size-[560px] rounded-full bg-brand-400/25 blur-[140px]"
          animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-300 to-brand-600 shadow-[0_12px_30px_-10px_rgb(52_170_135/0.8)]">
              <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
                <path d="M7 24V8h4v6.2h10V8h4v16h-4v-6h-10v6z" fill="#fff" />
                <circle cx="25" cy="7" r="3" fill="#b9f3df" />
              </svg>
            </span>
            <span className="leading-tight">
              <b className="block text-lg font-extrabold tracking-tight">HANA WORKS</b>
              <span className="text-xs text-brand-200/80">하나생명 경영지원부</span>
            </span>
          </div>
          <div>
            <motion.p
              className="text-xs font-semibold tracking-[0.4em] text-brand-200/80"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE }}
            >
              GENERAL AFFAIRS CENTER
            </motion.p>
            <h1 className="mt-4 text-[52px] font-extrabold leading-[1.08] tracking-[-0.04em] xl:text-[64px]">
              {["총무통합", "지원센터"].map((line, i) => (
                <span key={line} className="block overflow-hidden pb-1">
                  <motion.span
                    className="block bg-gradient-to-b from-white to-brand-100 bg-clip-text text-transparent"
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 1, ease: EASE, delay: 0.1 + i * 0.12 }}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-brand-100/80">
              업무 신청부터 예약·승인까지, 하나생명 임직원 계정으로 로그인해 한 곳에서 처리하세요.
            </p>
            <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
              {features.map((f, i) => (
                <motion.div
                  key={f.label}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.45 + i * 0.08 }}
                >
                  <f.icon className="size-5 text-brand-200" />
                  <span className="text-sm font-semibold">{f.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <p className="text-xs text-brand-200/60">가입 후 경영지원부 관리자의 승인을 받으면 이용할 수 있습니다.</p>
        </div>
      </div>

      {/* 입력 패널 */}
      <div className="relative flex items-center justify-center bg-canvas px-4 py-10 sm:px-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-50 to-canvas lg:hidden" aria-hidden />
        <motion.div
          className="relative w-full max-w-[440px]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
        >
          <div className="mb-6 text-center lg:hidden">
            <p className="text-[11px] font-semibold tracking-[0.35em] text-brand-600">HANA WORKS</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">총무통합지원센터</h1>
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}

/* ------------------------------ 로그인 / 가입 ------------------------------ */
function LoginCard() {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [f, setF] = useState({ email: "", password: "", password2: "", name: "", department: "", contact: "" });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const signupProblem =
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())
      ? "이메일을 정확히 입력해주세요."
      : f.password.length < 8
        ? "비밀번호는 8자 이상으로 입력해주세요."
        : f.password !== f.password2
          ? "비밀번호 확인이 일치하지 않습니다."
          : !validFullName(f.name)
            ? "이름을 정확히 입력해주세요."
            : !f.department
              ? "부서를 선택해주세요."
              : !validContact(f.contact)
                ? "연락처 또는 내선번호를 입력해주세요."
                : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (tab === "login") {
      if (!f.email.trim() || !f.password) return setError("이메일과 비밀번호를 입력해주세요.");
      setBusy(true);
      const err = await signIn(f.email, f.password);
      setBusy(false);
      if (err) setError(err);
      return;
    }
    if (signupProblem) return setError(signupProblem);
    setBusy(true);
    const r = await signUp({ email: f.email, password: f.password, name: f.name, department: f.department, contact: f.contact });
    setBusy(false);
    if (r.error) return setError(r.error);
    if (r.needsConfirm) {
      setInfo("가입 신청이 접수되었습니다. 받은 메일의 인증 링크를 누른 뒤 로그인해주세요.");
      setTab("login");
    }
  };

  return (
    <div className="rounded-[28px] border border-line bg-white p-6 shadow-[0_30px_80px_-40px_rgb(0_95_77/0.45)] sm:p-8">
      <div className="relative grid grid-cols-2 rounded-full bg-canvas p-1" role="tablist">
        {(["login", "signup"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              setError(null);
            }}
            className={cn("relative z-10 h-10 rounded-full text-sm font-bold transition-colors", tab === t ? "text-white" : "text-ink-2")}
          >
            {tab === t && <motion.span layoutId="auth-tab" className="absolute inset-0 -z-10 rounded-full bg-brand-600" transition={{ type: "spring", damping: 30, stiffness: 380 }} />}
            {t === "login" ? "로그인" : "가입 신청"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-3.5" noValidate>
        <AuthField label="회사 이메일">
          <input className="input" type="email" autoComplete="email" placeholder="name@hanafn.com" value={f.email} onChange={(e) => set("email", e.target.value)} />
        </AuthField>
        <AuthField label="비밀번호">
          <input
            className="input"
            type="password"
            autoComplete={tab === "login" ? "current-password" : "new-password"}
            placeholder={tab === "login" ? "비밀번호" : "8자 이상"}
            value={f.password}
            onChange={(e) => set("password", e.target.value)}
          />
        </AuthField>
        <AnimatePresence initial={false}>
          {tab === "signup" && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="space-y-3.5 overflow-hidden"
            >
              <AuthField label="비밀번호 확인">
                <input className="input" type="password" autoComplete="new-password" value={f.password2} onChange={(e) => set("password2", e.target.value)} />
              </AuthField>
              <div className="grid grid-cols-2 gap-3">
                <AuthField label="이름">
                  <input className="input" autoComplete="name" placeholder="홍길동" value={f.name} onChange={(e) => set("name", e.target.value)} />
                </AuthField>
                <AuthField label="연락처/내선">
                  <input className="input" placeholder="7320" value={f.contact} onChange={(e) => set("contact", e.target.value)} />
                </AuthField>
              </div>
              <AuthField label="부서">
                <select className="input" value={f.department} onChange={(e) => set("department", e.target.value)}>
                  <option value="">부서 선택</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </AuthField>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" role="alert">{error}</p>}
        {info && <p className="rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">{info}</p>}

        <Button type="submit" size="lg" className="btn-sheen group mt-2 w-full" disabled={busy}>
          {busy ? "확인 중…" : tab === "login" ? "로그인" : "가입 신청"}
          {!busy && <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />}
        </Button>
      </form>
      <p className="mt-5 text-center text-xs leading-relaxed text-ink-3">
        {tab === "login" ? (
          <>처음이신가요? <b className="text-ink-2">가입 신청</b> 후 관리자 승인을 받으면 이용할 수 있습니다.</>
        ) : (
          <>입력한 이름·부서·연락처는 신청서에 자동으로 채워집니다.</>
        )}
      </p>
    </div>
  );
}

function AuthField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-bold text-ink-2">{label}</span>
      {children}
    </label>
  );
}

/* ------------------------------ 승인대기 / 이용중지 ------------------------------ */
function StatusCard({ kind }: { kind: "pending" | "disabled" }) {
  const { profile, refresh, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const pending = kind === "pending";
  const Icon = pending ? Clock3 : ShieldOff;
  return (
    <div className="rounded-[28px] border border-line bg-white p-8 text-center shadow-[0_30px_80px_-40px_rgb(0_95_77/0.45)]">
      <motion.span
        className={cn("mx-auto grid size-16 place-items-center rounded-3xl", pending ? "bg-amber-50 text-amber-600" : "bg-zinc-100 text-zinc-500")}
        animate={pending ? { rotate: [0, -8, 8, 0] } : undefined}
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }}
      >
        <Icon className="size-7" />
      </motion.span>
      <h2 className="mt-5 text-xl font-extrabold tracking-tight">{pending ? "관리자 승인을 기다리고 있습니다" : "이용이 중지된 계정입니다"}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        {pending
          ? "가입 신청이 접수되었습니다. 경영지원부 관리자가 승인하면 바로 이용할 수 있습니다."
          : "계정 이용이 중지되었습니다. 필요하면 경영지원부에 문의해주세요."}
      </p>
      {profile && (
        <dl className="mx-auto mt-6 grid max-w-xs grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-2xl bg-canvas px-5 py-4 text-left text-sm">
          <dt className="text-ink-3">이름</dt>
          <dd className="font-semibold">{profile.name}</dd>
          <dt className="text-ink-3">부서</dt>
          <dd className="font-semibold">{profile.department}</dd>
          <dt className="text-ink-3">이메일</dt>
          <dd className="truncate font-semibold">{profile.email}</dd>
        </dl>
      )}
      <div className="mt-6 flex justify-center gap-2">
        {pending && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await refresh();
              setBusy(false);
            }}
          >
            <RefreshCw className={cn("size-4", busy && "animate-spin")} /> 승인 여부 다시 확인
          </Button>
        )}
        <Button variant="ghost" onClick={signOut}>
          <LogOut className="size-4" /> 로그아웃
        </Button>
      </div>
      <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-ink-3">
        <ShieldCheck className="size-3.5" /> 승인된 임직원만 업무 데이터를 볼 수 있습니다.
      </p>
    </div>
  );
}
