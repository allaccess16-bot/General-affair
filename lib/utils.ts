import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026-10-14" → "10.14 (수)" */
export function formatShortDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}.${dd} (${WEEKDAYS[d.getDay()]})`;
}

export function formatNumber(n: number) {
  return n.toLocaleString("ko-KR");
}
