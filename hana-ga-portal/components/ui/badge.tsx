import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  Hourglass,
  Loader,
  Ban,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { RequestStatus } from "@/lib/data";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none", className)}
      {...props}
    />
  );
}

/** 상태는 색 + 아이콘 + 라벨을 함께 표시 (색만으로 구분하지 않음) */
const STATUS_STYLE: Record<RequestStatus, { cls: string; icon: LucideIcon }> = {
  접수: { cls: "bg-slate-100 text-slate-700 ring-slate-200", icon: CircleDashed },
  진행중: { cls: "bg-sky-50 text-sky-700 ring-sky-200", icon: Loader },
  승인대기: { cls: "bg-amber-50 text-amber-800 ring-amber-200", icon: Hourglass },
  승인완료: { cls: "bg-brand-50 text-brand-700 ring-brand-200", icon: Clock3 },
  완료: { cls: "bg-brand-600 text-white ring-brand-600", icon: CheckCircle2 },
  반려: { cls: "bg-rose-50 text-rose-700 ring-rose-200", icon: XCircle },
  취소: { cls: "bg-zinc-100 text-zinc-500 ring-zinc-200", icon: Ban },
};

export function StatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  const { cls, icon: Icon } = STATUS_STYLE[status];
  return (
    <Badge className={cn("ring-1 ring-inset", cls, className)}>
      <Icon className="size-3.5" aria-hidden />
      {status}
    </Badge>
  );
}
