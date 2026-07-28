import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CheckCircle2, Clock, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHabitLogs, useHabits, useTasks } from "@/lib/api";
import { PRIORITIES, type Task } from "@/lib/types";
import { isOverdue } from "@/lib/task-utils";
import { SectionHeading } from "@/components/bits";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TaskNest" },
      { name: "description", content: "See completion rates, priority mix and workload across the week, month and year." },
      { property: "og:title", content: "Dashboard — TaskNest" },
      { property: "og:description", content: "See completion rates, priority mix and workload across the week, month and year." },
    ],
  }),
  component: DashboardPage,
});

type Range = "week" | "month" | "year";

function rangeStart(range: Range) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === "week") d.setDate(d.getDate() - d.getDay());
  else if (range === "month") d.setDate(1);
  else {
    d.setMonth(0, 1);
  }
  return d;
}

function inRange(task: Task, from: Date) {
  const ref = task.end_datetime ?? task.start_datetime ?? task.created_at;
  return new Date(ref).getTime() >= from.getTime();
}

function DashboardPage() {
  const [range, setRange] = useState<Range>("week");
  const { data: tasks = [] } = useTasks();
  const { data: habits = [] } = useHabits();
  const { data: logs = [] } = useHabitLogs();

  const from = rangeStart(range);
  const scoped = useMemo(() => tasks.filter((t) => inRange(t, from)), [tasks, from]);

  const parents = scoped.filter((t) => !t.parent_task_id);
  const subs = scoped.filter((t) => t.parent_task_id);
  const done = scoped.filter((t) => t.status === "done");
  const overdue = tasks.filter((t) => isOverdue(t));
  const rate = scoped.length ? Math.round((done.length / scoped.length) * 100) : 0;

  const priorityData = useMemo(
    () =>
      PRIORITIES.map((p) => ({
        name: p.label,
        value: scoped.filter((t) => t.priority === p.value).length,
        color:
          p.value === "urgent"
            ? "#e5484d"
            : p.value === "high"
              ? "#f5a524"
              : p.value === "medium"
                ? "#3b82f6"
                : p.value === "low"
                  ? "#10b981"
                  : "#a1a1aa",
      })).filter((d) => d.value > 0),
    [scoped],
  );

  const trend = useMemo(() => {
    const buckets: { name: string; created: number; completed: number }[] = [];
    const now = new Date();
    const points = range === "year" ? 12 : range === "month" ? 4 : 7;
    for (let i = points - 1; i >= 0; i--) {
      let start: Date;
      let end: Date;
      let name: string;
      if (range === "year") {
        start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        name = start.toLocaleDateString(undefined, { month: "short" });
      } else if (range === "month") {
        end = new Date(now);
        end.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - i * 7 + 7);
        start = new Date(end);
        start.setDate(start.getDate() - 7);
        name = `Wk ${points - i}`;
      } else {
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - i);
        end = new Date(start);
        end.setDate(end.getDate() + 1);
        name = start.toLocaleDateString(undefined, { weekday: "short" });
      }
      const within = (iso: string | null) =>
        !!iso && new Date(iso).getTime() >= start.getTime() && new Date(iso).getTime() < end.getTime();
      buckets.push({
        name,
        created: tasks.filter((t) => within(t.created_at)).length,
        completed: tasks.filter((t) => within(t.completed_at)).length,
      });
    }
    return buckets;
  }, [tasks, range]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const habitsDoneToday = habits.filter((h) =>
    logs.some((l) => l.habit_id === h.id && l.log_date === todayIso),
  ).length;

  const upcoming = tasks
    .filter((t) => t.status !== "done" && t.end_datetime)
    .sort((a, b) => new Date(a.end_datetime!).getTime() - new Date(b.end_datetime!).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Where your {range} actually went.</p>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted p-1">
          {(["week", "month", "year"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold capitalize",
                range === r ? "bg-card shadow-sm" : "text-muted-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ListTodo} label="Tasks" value={parents.length} hint={`${subs.length} sub-tasks`} />
        <StatCard icon={CheckCircle2} label="Completed" value={done.length} hint={`${rate}% completion`} tone="success" />
        <StatCard icon={AlertTriangle} label="Overdue" value={overdue.length} hint="across all time" tone="danger" />
        <StatCard
          icon={Clock}
          label="Habits today"
          value={`${habitsDoneToday}/${habits.length}`}
          hint="checked in"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <SectionHeading title="Created vs completed" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="var(--primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-5">
          <SectionHeading title="Priority mix" />
          <div className="h-64">
            {priorityData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {priorityData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="pt-20 text-center text-sm text-muted-foreground">No tasks in this range yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <SectionHeading title="Status breakdown" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "To Do", value: scoped.filter((t) => t.status === "todo").length },
                  { name: "In Progress", value: scoped.filter((t) => t.status === "in_progress").length },
                  { name: "Done", value: done.length },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-5">
          <SectionHeading title="Up next" count={upcoming.length} />
          <ul className="divide-y">
            {upcoming.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link
                  to="/tasks/$taskId"
                  params={{ taskId: t.id }}
                  className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline"
                >
                  {t.title}
                </Link>
                <span
                  className={cn(
                    "shrink-0 text-xs text-muted-foreground",
                    isOverdue(t) && "font-semibold text-destructive",
                  )}
                >
                  {new Date(t.end_datetime!).toLocaleDateString()}
                </span>
              </li>
            ))}
            {!upcoming.length && <li className="py-6 text-center text-sm text-muted-foreground">Nothing scheduled.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: typeof ListTodo;
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Icon
          className={cn(
            "size-4",
            tone === "success" && "text-success",
            tone === "danger" && "text-destructive",
            tone === "default" && "text-primary",
          )}
        />
        {label}
      </div>
      <p className="mt-2 font-display text-3xl font-extrabold tracking-tight">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}