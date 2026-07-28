import { createFileRoute } from "@tanstack/react-router";
import { useTasks } from "@/lib/api";
import { CalendarView } from "@/components/calendar-view";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — TaskNest" },
      { name: "description", content: "See tasks and deadlines laid out by month, week or day." },
      { property: "og:title", content: "Calendar — TaskNest" },
      { property: "og:description", content: "See tasks and deadlines laid out by month, week or day." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { data: tasks = [] } = useTasks();
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">Tasks spanning their start → deadline window.</p>
      </header>
      <CalendarView tasks={tasks} />
    </div>
  );
}