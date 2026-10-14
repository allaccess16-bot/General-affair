import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 md:mb-10",
        align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className={cn(align === "center" && "max-w-2xl")}>
        {eyebrow && (
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-brand-600">
            <span className="h-px w-6 bg-brand-400" />
            {eyebrow}
          </p>
        )}
        <h2 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink md:text-[34px]">{title}</h2>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-ink-2 md:text-base">{description}</p>}
      </div>
      {action}
    </div>
  );
}
