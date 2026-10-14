import Link from "next/link";
import { ResetDemoButton } from "./reset-demo-button";
import { MODULES } from "@/lib/modules";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-white pb-28 md:pb-0">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-8">
        <div>
          <Logo />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-3">
            신청·예약·승인·관리를 하나로. 경영지원부가 만드는 더 스마트한 일하는 방식.
          </p>
        </div>
        <FooterCol title="업무 서비스" links={MODULES.map((m) => ({ href: m.href, label: m.name }))} />
        <FooterCol
          title="관리"
          links={[
            { href: "/admin", label: "통합 관리자 센터" },
            { href: "/admin#stats", label: "업무별 통계" },
            { href: "/admin#requests", label: "전체 신청 현황" },
          ]}
        />
        <div>
          <p className="text-sm font-bold text-ink">경영지원부 문의</p>
          <p className="mt-4 text-2xl font-extrabold tracking-tight text-brand-700 tabular">내선 1234</p>
          <p className="mt-1 text-sm text-ink-3">평일 09:00 – 18:00</p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-2 px-4 py-6 text-xs text-ink-3 md:flex-row md:justify-between md:px-8">
          <p>© 2026 하나생명 경영지원부 · 디자인 프로토타입 (샘플 데이터)</p>
          <p className="flex items-center gap-3">개인정보 처리방침 · 이용 가이드 · 시스템 문의 <ResetDemoButton /></p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-sm font-bold text-ink">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-ink-3 transition hover:text-brand-700">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
