import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Flame, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useHabitLogs, useHabitMutations, useHabits } from "@/lib/api";
import { LABEL_COLORS } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/habits")({
  head: () => ({
    meta: [
      { title: "Habits — TaskNest" },
      { name: "description", content: "Track daily habits with streaks and a 30-day check-in grid." },
      { property: "og:title", content: "Habits — TaskNest" },
      { property: "og:description", content: "Track daily habits with streaks and a 30-day check-in grid." },
    ],
  }),
  component: HabitsPage,
});

function dayKey(offset: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function HabitsPage() {
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useHabitLogs();
  const { create, toggleDay, remove } = useHabitMutations();
  const [name, setName] = useState("");

  const days = Array.from({ length: 30 }, (_, i) => dayKey(29 - i));
  const has = (habitId: string, date: string) =>
    logs.some((l) => l.habit_id === habitId && l.log_date === date);
  const flip = (habitId: string, date: string) =>
    toggleDay.mutate({ habitId, date, on: !has(habitId, date) });

  const streak = (habitId: string) => {
    let n = 0;
    for (let i = 0; i < 365; i++) {
      if (has(habitId, dayKey(i))) n++;
      else if (i > 0) break;
    }
    return n;
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Habits</h1>
        <p className="text-sm text-muted-foreground">Small things, done often.</p>
      </header>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          create.mutate({
            name: name.trim(),
            color: LABEL_COLORS[habits.length % LABEL_COLORS.length],
            frequency: "daily",
          });
          setName("");
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New habit — e.g. Read 20 pages" />
        <Button type="submit" className="gap-2 shrink-0">
          <Plus className="size-4" /> Add
        </Button>
      </form>

      <div className="space-y-3">
        {habits.map((h) => (
          <div key={h.id} className="surface-card p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: h.color }} />
                <span className="truncate font-semibold">{h.name}</span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-p-high/10 px-2 py-0.5 text-xs font-bold text-p-high">
                  <Flame className="size-3" /> {streak(h.id)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant={has(h.id, dayKey(0)) ? "default" : "outline"}
                  onClick={() => flip(h.id, dayKey(0))}
                >
                  {has(h.id, dayKey(0)) ? "Done today" : "Check in"}
                </Button>
                <button onClick={() => remove.mutate(h.id)} aria-label="Delete habit">
                  <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {days.map((d) => (
                <button
                  key={d}
                  title={d}
                  onClick={() => flip(h.id, d)}
                  className={cn("size-4 rounded-[4px] transition-transform hover:scale-110")}
                  style={{ backgroundColor: has(h.id, d) ? h.color : "var(--muted)" }}
                />
              ))}
            </div>
          </div>
        ))}
        {!habits.length && (
          <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            No habits yet — add your first one above.
          </p>
        )}
      </div>
    </div>
  );
}