import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, LayoutDashboard, ListTree, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TaskNestLogo } from "@/components/bits";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskNest — Nested tasks, real timelines" },
      {
        name: "description",
        content:
          "TaskNest keeps big goals and their sub-tasks on one timeline, with buckets, a board, habits and a dashboard that shows where your week went.",
      },
      { property: "og:title", content: "TaskNest — Nested tasks, real timelines" },
      {
        property: "og:description",
        content:
          "TaskNest keeps big goals and their sub-tasks on one timeline, with buckets, a board, habits and a dashboard that shows where your week went.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: ListTree, title: "Nested sub-tasks", body: "Break a goal into steps that stay inside the parent's timeline." },
  { icon: CalendarDays, title: "Calendar & board", body: "Month, week and day views plus a drag-and-drop status board." },
  { icon: Repeat, title: "Habits & streaks", body: "Daily check-ins with a 30-day grid and streak counter." },
  { icon: LayoutDashboard, title: "Insights", body: "Completion rate, priority mix and workload by week, month or year." },
];

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl gradient-primary text-primary-foreground shadow-sm">
            <TaskNestLogo className="size-5" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">TaskNest</span>
        </span>
        <Button asChild variant="outline" className="cursor-pointer">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <section className="py-16 text-center">
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
            Plan the big thing. Track every small step.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            Hierarchical tasks with real start and end windows, buckets, labels, habits — and a dashboard
            that finally tells you where the week went.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg" className="cursor-pointer">
              <Link to="/auth">Get started free</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <article key={f.title} className="surface-card p-6">
              <f.icon className="size-5 text-primary" />
              <h2 className="mt-3 font-display text-lg font-bold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
