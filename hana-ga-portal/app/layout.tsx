import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'HANA WORKS | 하나생명 경영지원 통합 포털', description: '하나생명 경영지원부 통합 업무 지원 시스템 UI 프로토타입' };
export default function RootLayout({children}:{children: React.ReactNode}) { return <html lang="ko"><body>{children}</body></html>; }
