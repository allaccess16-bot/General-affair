import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl border border-line bg-white shadow-card", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h3 className="text-[17px] font-bold tracking-tight text-ink">{title}</h3>
        {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
      </div>
      {action}
    </div>
  );
}
