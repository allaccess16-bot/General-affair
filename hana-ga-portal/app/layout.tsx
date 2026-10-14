import type { Metadata, Viewport } from "next";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { RequestsProvider } from "@/components/providers/requests-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "HANA WORKS · 총무 통합 업무 지원 시스템",
  description: "하나생명 경영지원부 총무 업무 지원, 법인차량, 회의실 예약, 인장 날인 관리를 하나로 제공하는 통합 업무 포털",
};

export const viewport: Viewport = {
  themeColor: "#00775f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-dvh overflow-x-hidden">
        <RequestsProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
          <MobileTabBar />
        </RequestsProvider>
      </body>
    </html>
  );
}
