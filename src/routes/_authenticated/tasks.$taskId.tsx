import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Pause, Pencil, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTaskMutations, useTasks } from "@/lib/api";
import { buildTree, formatRange } from "@/lib/task-utils";
import { LabelChip, PriorityPill } from "@/components/bits";
import { TaskDialog, TimelineBar } from "@/components/task-dialog";
import { TaskRow } from "@/components/task-list";

export const Route = createFileRoute("/_authenticated/tasks/$taskId")({
  head: () => ({
    meta: [
      { title: "Task details — TaskNest" },
      { name: "description", content: "Inspect a task, its sub-tasks, timeline and attachments." },
      { property: "og:title", content: "Task details — TaskNest" },
      { property: "og:description", content: "Inspect a task, its sub-tasks, timeline and attachments." },
    ],
  }),
  component: TaskDetail,
});

function TaskDetail() {
  const { taskId } = Route.useParams();
  const { data: tasks = [], isLoading } = useTasks();
  const { update } = useTaskMutations();
  const [editOpen, setEditOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);

  const task = tasks.find((t) => t.id === taskId);
  const { childrenOf } = buildTree(tasks);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!task)
    return (
      <div className="surface-card p-8 text-center">
        <p className="font-semibold">This task no longer exists.</p>
        <Link to="/tasks" className="mt-2 inline-block text-sm font-semibold text-primary">
          Back to tasks
        </Link>
      </div>
    );

  const kids = childrenOf(task.id);
  const doneKids = kids.filter((k) => k.status === "done").length;
  const parent = task.parent_task_id ? tasks.find((t) => t.id === task.parent_task_id) : null;

  return (
    <div className="space-y-5">
      <Link to="/tasks" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
        <ArrowLeft className="size-4" /> All tasks
      </Link>

      <div className="surface-card p-6">
        {parent && (
          <Link
            to="/tasks/$taskId"
            params={{ taskId: parent.id }}
            className="text-xs font-semibold text-primary"
          >
            ↑ {parent.title}
          </Link>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <h1 className="min-w-0 font-display text-2xl font-extrabold tracking-tight">{task.title}</h1>
          <div className="flex flex-wrap shrink-0 items-center gap-2">
            {task.status !== "in_progress" && task.status !== "done" && (
              <Button
                variant="outline"
                className="gap-1.5 text-blue-600 border-blue-500/30 hover:bg-blue-500/10 cursor-pointer"
                onClick={() => update.mutate({ id: task.id, status: "in_progress", completed_at: null })}
              >
                <Play className="size-4 fill-current" /> Start
              </Button>
            )}
            {task.status !== "on_hold" && task.status !== "done" && (
              <Button
                variant="outline"
                className="gap-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
                onClick={() => update.mutate({ id: task.id, status: "on_hold", completed_at: null })}
              >
                <Pause className="size-4 fill-current" /> Pause
              </Button>
            )}
            {task.status !== "done" && (
              <Button
                variant="outline"
                className="gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                onClick={() => update.mutate({ id: task.id, status: "done", completed_at: new Date().toISOString() })}
              >
                <Check className="size-4 stroke-[3]" /> Complete
              </Button>
            )}
            <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
            <Button className="gap-2" onClick={() => setSubOpen(true)}>
              <Plus className="size-4" /> Sub-task
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <PriorityPill priority={task.priority} />
          <span className="text-sm text-muted-foreground">
            {formatRange(task.start_datetime, task.end_datetime)}
          </span>
          {(task.labels ?? []).map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </div>

        {task.description && <p className="mt-4 whitespace-pre-wrap text-sm">{task.description}</p>}

        {kids.length > 0 && (
          <div className="mt-5">
            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Sub-task progress</span>
              <span>
                {doneKids}/{kids.length}
              </span>
            </div>
            <Progress value={(doneKids / kids.length) * 100} />
          </div>
        )}
      </div>

      {kids.length > 0 && <TimelineBar task={task} children={kids} />}

      <section className="surface-card divide-y overflow-hidden">
        <p className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Sub-tasks
        </p>
        {kids.map((k) => (
          <TaskRow key={k.id} task={k} />
        ))}
        {!kids.length && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Break this down into smaller steps.
          </p>
        )}
      </section>

      <TaskDialog open={editOpen} onOpenChange={setEditOpen} task={task} />
      <TaskDialog open={subOpen} onOpenChange={setSubOpen} parent={task} />
    </div>
  );
}