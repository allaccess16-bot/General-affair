/**
 * 그린 톤 오피스 타워 일러스트 (외부 이미지 없이 SVG로 구성 — 배포 시 라이선스·용량 부담 없음)
 */
export function Skyline({ className }: { className?: string }) {
  const towers = [
    { x: 20, w: 70, h: 210, c: "url(#tw-a)" },
    { x: 100, w: 92, h: 320, c: "url(#tw-b)" },
    { x: 205, w: 64, h: 250, c: "url(#tw-a)" },
    { x: 280, w: 110, h: 380, c: "url(#tw-c)" },
    { x: 402, w: 78, h: 290, c: "url(#tw-b)" },
    { x: 492, w: 60, h: 220, c: "url(#tw-a)" },
    { x: 562, w: 96, h: 340, c: "url(#tw-c)" },
  ];
  const base = 460;
  return (
    <svg viewBox="0 0 680 520" className={className} aria-hidden preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9f8f2" />
          <stop offset="0.55" stopColor="#c7ecdf" />
          <stop offset="1" stopColor="#8fd6bd" />
        </linearGradient>
        <linearGradient id="tw-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4fbf9b" />
          <stop offset="1" stopColor="#0a6b56" />
        </linearGradient>
        <linearGradient id="tw-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2fa883" />
          <stop offset="1" stopColor="#064d3f" />
        </linearGradient>
        <linearGradient id="tw-c" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6fd2b0" />
          <stop offset="0.5" stopColor="#14876b" />
          <stop offset="1" stopColor="#053d33" />
        </linearGradient>
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d7a62" stopOpacity="0.55" />
          <stop offset="1" stopColor="#e9f8f2" stopOpacity="0" />
        </linearGradient>
        <pattern id="win" width="12" height="16" patternUnits="userSpaceOnUse">
          <rect x="2" y="3" width="7" height="9" rx="1" fill="#e6fff6" fillOpacity="0.28" />
        </pattern>
      </defs>
      <rect width="680" height="520" fill="url(#sky)" />
      <circle cx="540" cy="110" r="70" fill="#fff" fillOpacity="0.55" />
      <circle cx="540" cy="110" r="120" fill="#fff" fillOpacity="0.18" />
      {/* 뒤 열 */}
      {[60, 180, 330, 470, 610].map((x, i) => (
        <rect key={x} x={x} y={base - 160 - i * 18} width={50} height={160 + i * 18} rx="4" fill="#9fdcc6" opacity="0.7" />
      ))}
      {towers.map((t) => (
        <g key={t.x}>
          <rect x={t.x} y={base - t.h} width={t.w} height={t.h} rx="6" fill={t.c} />
          <rect x={t.x + 6} y={base - t.h + 14} width={t.w - 12} height={t.h - 20} fill="url(#win)" />
          <rect x={t.x} y={base - t.h} width={t.w * 0.35} height={t.h} rx="6" fill="url(#shine)" opacity="0.6" />
          <rect x={t.x + t.w / 2 - 1.5} y={base - t.h - 18} width="3" height="18" fill="#0a6b56" />
        </g>
      ))}
      <rect x="0" y={base} width="680" height={520 - base} fill="url(#water)" />
      {towers.map((t) => (
        <rect key={`r${t.x}`} x={t.x} y={base + 4} width={t.w} height={t.h * 0.18} rx="4" fill={t.c} opacity="0.18" />
      ))}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={80 + i * 190} y={base + 22 + i * 10} width="120" height="2" rx="1" fill="#fff" opacity="0.5" />
      ))}
    </svg>
  );
}
