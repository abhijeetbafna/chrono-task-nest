import { cn } from "@/lib/utils";
import { PRIORITIES, type Label as TaskLabel, type Priority } from "@/lib/types";

export function PriorityDot({ priority, className }: { priority: Priority; className?: string }) {
  const p = PRIORITIES.find((x) => x.value === priority)!;
  return <span title={p.label} className={cn("inline-block size-2.5 shrink-0 rounded-full", p.dot, className)} />;
}

export function PriorityPill({ priority }: { priority: Priority }) {
  const p = PRIORITIES.find((x) => x.value === priority)!;
  if (priority === "none") return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold",
        p.className,
      )}
      style={{ borderColor: "currentColor" }}
    >
      <span className={cn("size-1.5 rounded-full", p.dot)} />
      {p.label}
    </span>
  );
}

export function LabelChip({ label }: { label: TaskLabel }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: `${label.color}1f`, color: label.color }}
    >
      {label.name}
    </span>
  );
}

export function SectionHeading({
  title,
  count,
  tone = "default",
}: {
  title: string;
  count?: number;
  tone?: "default" | "danger" | "warn";
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <h2
        className={cn(
          "text-xs font-bold uppercase tracking-wider",
          tone === "danger" && "text-destructive",
          tone === "warn" && "text-p-high",
          tone === "default" && "text-muted-foreground",
        )}
      >
        {title}
      </h2>
      {count !== undefined && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="surface-card flex flex-col items-center justify-center gap-1 px-6 py-14 text-center">
      <p className="font-semibold">{title}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TaskNestLogo({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3.5 13.5C4.2 18 8 20.5 12 20.5C16 20.5 19.8 18 20.5 13.5" strokeWidth="2" />
      <path d="M6 11.5C6.5 15 9 17 12 17C15 17 17.5 15 18 11.5" strokeWidth="1.75" strokeOpacity="0.8" />
      <path d="M8.5 9L11 11.5L16 5.5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GoogleLogo({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}