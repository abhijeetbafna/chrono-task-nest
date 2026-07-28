import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PriorityDot } from "@/components/bits";
import type { Task } from "@/lib/types";

type Mode = "month" | "week" | "day";

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function occursOn(task: Task, day: Date) {
  const s = task.start_datetime ? startOfDay(new Date(task.start_datetime)) : null;
  const e = task.end_datetime ? startOfDay(new Date(task.end_datetime)) : null;
  const d = startOfDay(day).getTime();
  if (s && e) {
    const min = Math.min(s.getTime(), e.getTime());
    const max = Math.max(s.getTime(), e.getTime());
    return d >= min && d <= max;
  }
  if (e) return d === e.getTime();
  if (s) return d === s.getTime();
  return false;
}

export function CalendarView({ tasks }: { tasks: Task[] }) {
  const [mode, setMode] = useState<Mode>("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));

  const days = useMemo(() => {
    if (mode === "day") return [cursor];
    if (mode === "week") {
      const start = addDays(cursor, -cursor.getDay());
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor, mode]);

  const step = (dir: number) => {
    if (mode === "day") setCursor((c) => addDays(c, dir));
    else if (mode === "week") setCursor((c) => addDays(c, dir * 7));
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  };

  const title =
    mode === "day"
      ? cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
      : cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="surface-card p-4">
      <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => step(-1)} aria-label="Previous">
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="truncate text-lg font-bold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={() => step(1)} aria-label="Next">
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted p-1">
          {(["month", "week", "day"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors",
                mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      {mode !== "day" && (
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      )}

      <div className={cn("grid gap-1", mode === "day" ? "grid-cols-1" : "grid-cols-7")}>
        {days.map((day) => {
          const dayTasks = tasks.filter((t) => occursOn(t, day));
          const outside = mode === "month" && day.getMonth() !== cursor.getMonth();
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-24 rounded-xl border p-1.5",
                outside && "opacity-40",
                sameDay(day, new Date()) && "border-primary bg-primary/5",
                mode === "day" && "min-h-72",
              )}
            >
              <div className="mb-1 text-xs font-bold text-muted-foreground">{day.getDate()}</div>
              <ul className="space-y-1">
                {dayTasks.slice(0, mode === "month" ? 3 : 20).map((t) => (
                  <li key={t.id}>
                    <Link
                      to="/tasks/$taskId"
                      params={{ taskId: t.id }}
                      className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-1 text-[11px] font-medium hover:bg-accent"
                    >
                      <PriorityDot priority={t.priority} className="size-1.5" />
                      <span className={cn("truncate", t.status === "done" && "line-through opacity-60")}>
                        {t.title}
                      </span>
                    </Link>
                  </li>
                ))}
                {mode === "month" && dayTasks.length > 3 && (
                  <li className="px-1.5 text-[11px] text-muted-foreground">+{dayTasks.length - 3} more</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}