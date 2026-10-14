import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** 라벨 + 아이콘이 붙은 네이티브 select (접근성·모바일 호환을 위해 native 사용) */
export function SelectField({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={cn("group relative flex min-w-0 items-center gap-3 rounded-2xl px-4 py-3 transition hover:bg-brand-50/70", className)}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition group-hover:bg-white">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-ink-3">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none truncate bg-transparent pr-6 text-[15px] font-semibold text-ink outline-none"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </span>
      <ChevronDown className="pointer-events-none absolute right-4 size-4 text-ink-3" aria-hidden />
    </label>
  );
}
