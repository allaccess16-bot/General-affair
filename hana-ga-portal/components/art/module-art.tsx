import type { ModuleKey } from "@/lib/modules";
import { cn } from "@/lib/utils";

/** 모듈 카드 썸네일 일러스트 (SVG) */
export function ModuleArt({ module, className }: { module: ModuleKey; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden", BG[module], className)}>
      <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/25 blur-2xl" aria-hidden />
      <div className="absolute -bottom-12 -left-6 size-36 rounded-full bg-white/15 blur-xl" aria-hidden />
      <svg viewBox="0 0 320 180" className="relative h-full w-full" aria-hidden>
        {ART[module]}
      </svg>
    </div>
  );
}

const BG: Record<ModuleKey, string> = {
  ga: "bg-gradient-to-br from-[#2bb38c] via-[#00876c] to-[#055c4a]",
  vehicle: "bg-gradient-to-br from-[#6aa1ff] via-[#2f6fdb] to-[#1d4496]",
  meeting: "bg-gradient-to-br from-[#ffc46b] via-[#e08a1e] to-[#b05f0b]",
  seal: "bg-gradient-to-br from-[#b79bff] via-[#8a5ce6] to-[#5b35b0]",
};

const W = "#ffffff";

const ART: Record<ModuleKey, React.ReactNode> = {
  ga: (
    <g>
      {/* 체크리스트 문서 더미 */}
      <rect x="118" y="38" width="120" height="132" rx="12" fill={W} fillOpacity="0.25" transform="rotate(8 178 104)" />
      <rect x="96" y="30" width="128" height="140" rx="14" fill={W} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="112" y={54 + i * 26} width="16" height="16" rx="5" fill={i < 3 ? "#00876c" : "#d5e9e2"} />
          {i < 3 && <path d={`M116 ${62 + i * 26} l3 3 l6 -6`} stroke={W} strokeWidth="2.4" fill="none" strokeLinecap="round" />}
          <rect x="136" y={56 + i * 26} width={i % 2 ? 56 : 72} height="6" rx="3" fill="#cfe3dc" />
          <rect x="136" y={66 + i * 26} width="38" height="4" rx="2" fill="#e6f1ed" />
        </g>
      ))}
      <circle cx="232" cy="46" r="22" fill="#fde68a" />
      <path d="M232 34v12l8 5" stroke="#92400e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="40" y="110" width="44" height="44" rx="12" fill={W} fillOpacity="0.9" />
      <path d="M52 126h20M52 134h14M52 142h18" stroke="#00876c" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  vehicle: (
    <g>
      {/* 도로 + 차량 */}
      <path d="M0 150 C80 128 240 128 320 150 V180 H0Z" fill="#163a80" fillOpacity="0.55" />
      {[30, 100, 170, 240].map((x) => (
        <rect key={x} x={x} y="152" width="36" height="4" rx="2" fill={W} fillOpacity="0.55" />
      ))}
      <g transform="translate(78 64)">
        <path d="M18 54 L30 22 Q34 12 46 12 H118 Q130 12 136 22 L152 54 Z" fill={W} />
        <rect x="6" y="50" width="160" height="34" rx="14" fill={W} />
        <path d="M42 22 H82 V50 H32 Z" fill="#cfe0ff" />
        <path d="M90 22 H122 L136 50 H90 Z" fill="#cfe0ff" />
        <rect x="14" y="60" width="18" height="8" rx="4" fill="#fde68a" />
        <rect x="140" y="60" width="18" height="8" rx="4" fill="#fca5a5" />
        <circle cx="42" cy="86" r="15" fill="#1f2a44" />
        <circle cx="42" cy="86" r="6" fill="#cfe0ff" />
        <circle cx="130" cy="86" r="15" fill="#1f2a44" />
        <circle cx="130" cy="86" r="6" fill="#cfe0ff" />
      </g>
      <g transform="translate(236 26)">
        <path d="M18 0C8 0 0 8 0 18c0 13 18 30 18 30s18-17 18-30C36 8 28 0 18 0z" fill="#fde68a" />
        <circle cx="18" cy="18" r="7" fill="#1d4496" />
      </g>
    </g>
  ),
  meeting: (
    <g>
      {/* 캘린더 + 회의 테이블 */}
      <rect x="44" y="28" width="132" height="124" rx="14" fill={W} />
      <rect x="44" y="28" width="132" height="28" rx="14" fill="#b05f0b" fillOpacity="0.85" />
      <rect x="44" y="44" width="132" height="12" fill="#b05f0b" fillOpacity="0.85" />
      <rect x="70" y="20" width="6" height="18" rx="3" fill="#7c3f05" />
      <rect x="144" y="20" width="6" height="18" rx="3" fill="#7c3f05" />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect
          key={i}
          x={58 + (i % 4) * 28}
          y={68 + Math.floor(i / 4) * 26}
          width="20"
          height="18"
          rx="5"
          fill={i === 5 ? "#e08a1e" : i === 6 || i === 9 ? "#fde3bd" : "#f3ede5"}
        />
      ))}
      <g transform="translate(196 72)">
        <ellipse cx="50" cy="44" rx="48" ry="24" fill={W} />
        <ellipse cx="50" cy="40" rx="36" ry="15" fill="#fde3bd" />
        {[
          [6, 24],
          [94, 24],
          [20, 66],
          [80, 66],
          [50, 10],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="9" fill={W} fillOpacity="0.92" />
        ))}
      </g>
    </g>
  ),
  seal: (
    <g>
      {/* 문서 + 인장 */}
      <rect x="54" y="26" width="124" height="140" rx="12" fill={W} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="72" y={46 + i * 14} width={i === 4 ? 52 : 88} height="6" rx="3" fill="#e6defa" />
      ))}
      <circle cx="140" cy="132" r="22" fill="none" stroke="#e11d48" strokeWidth="3.5" strokeOpacity="0.85" />
      <text x="140" y="138" textAnchor="middle" fontSize="15" fontWeight="800" fill="#e11d48" fillOpacity="0.85">
        승인
      </text>
      <g transform="translate(196 34)">
        <rect x="26" y="0" width="34" height="18" rx="9" fill="#efe9ff" />
        <rect x="34" y="16" width="18" height="44" rx="6" fill={W} />
        <path d="M10 60 H76 Q84 60 84 68 V80 H2 V68 Q2 60 10 60Z" fill={W} />
        <rect x="0" y="80" width="86" height="12" rx="4" fill="#3d2380" fillOpacity="0.6" />
      </g>
      <path d="M200 140 l16 0" stroke={W} strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7" />
      <path d="M262 140 l16 0" stroke={W} strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7" />
    </g>
  ),
};
