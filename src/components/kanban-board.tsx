import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Paperclip, Pause, Play } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { LabelChip, PriorityDot } from "@/components/bits";
import { useTaskMutations } from "@/lib/api";
import type { Status, Task } from "@/lib/types";
import { formatRange, isOverdue } from "@/lib/task-utils";

const COLUMNS: { id: Status; title: string; badgeClass: string }[] = [
  { id: "todo", title: "To Do", badgeClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
  { id: "in_progress", title: "In Progress", badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { id: "on_hold", title: "On Hold", badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { id: "done", title: "Done", badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
];

export function KanbanBoard({
  tasks,
  childrenOf,
  showSubtasks,
}: {
  tasks: Task[];
  childrenOf: (id: string) => Task[];
  showSubtasks: boolean;
}) {
  const { update } = useTaskMutations();
  const [dragOver, setDragOver] = useState<Status | null>(null);

  // Always list parent tasks as board cards
  const visible = tasks.filter((t) => !t.parent_task_id);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const items = visible.filter((t) => t.status === col.id);
        return (
          <section
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col.id);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id)
                update.mutate({
                  id,
                  status: col.id,
                  completed_at: col.id === "done" ? new Date().toISOString() : null,
                });
            }}
            className={cn(
              "rounded-2xl border bg-muted/40 p-3 transition-colors",
              dragOver === col.id && "border-primary bg-primary/5",
            )}
          >
            <header className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">{col.title}</h3>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", col.badgeClass)}>
                  {col.title}
                </span>
              </div>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {items.length}
              </span>
            </header>
            <ul className="space-y-2">
              {items.map((task) => {
                const kids = childrenOf(task.id);
                return (
                  <li
                    key={task.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
                    className="surface-card cursor-grab p-3 active:cursor-grabbing transition-shadow hover:shadow-md space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <PriorityDot priority={task.priority} />
                        <Link
                          to="/tasks/$taskId"
                          params={{ taskId: task.id }}
                          className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline"
                        >
                          {task.title}
                        </Link>
                      </div>

                      {/* Quick Progression Control Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {task.status !== "in_progress" && task.status !== "done" && (
                          <button
                            onClick={() => update.mutate({ id: task.id, status: "in_progress", completed_at: null })}
                            className="p-1 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 cursor-pointer transition-colors"
                            title="Start task (In Progress)"
                          >
                            <Play className="size-3.5 fill-current" />
                          </button>
                        )}
                        {task.status !== "on_hold" && task.status !== "done" && (
                          <button
                            onClick={() => update.mutate({ id: task.id, status: "on_hold", completed_at: null })}
                            className="p-1 rounded-md text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 cursor-pointer transition-colors"
                            title="Pause task (On Hold)"
                          >
                            <Pause className="size-3.5 fill-current" />
                          </button>
                        )}
                        {task.status !== "done" && (
                          <button
                            onClick={() => update.mutate({ id: task.id, status: "done", completed_at: new Date().toISOString() })}
                            className="p-1 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 cursor-pointer transition-colors"
                            title="Complete task (Done)"
                          >
                            <Check className="size-3.5 stroke-[3]" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(task.labels ?? []).map((l) => (
                        <LabelChip key={l.id} label={l} />
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      <span className={cn(isOverdue(task) && "font-semibold text-destructive")}>
                        {formatRange(task.start_datetime, task.end_datetime)}
                      </span>
                      {kids.length > 0 && !showSubtasks && (
                        <span>
                          {kids.filter((k) => k.status === "done").length}/{kids.length} sub-tasks
                        </span>
                      )}
                      {!!task.attachment_count && (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="size-3" />
                          {task.attachment_count}
                        </span>
                      )}
                    </div>

                    {/* NESTED SUB-TASKS INSIDE PARENT CARD */}
                    {showSubtasks && kids.length > 0 && (
                      <div className="mt-3 rounded-xl border bg-muted/30 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Sub-tasks</span>
                          <span>{kids.filter((k) => k.status === "done").length}/{kids.length}</span>
                        </div>
                        <ul className="space-y-1">
                          {kids.map((kid) => (
                            <li
                              key={kid.id}
                              className="flex items-center justify-between gap-2 rounded-lg bg-card p-1.5 text-xs border shadow-2xs"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Checkbox
                                  checked={kid.status === "done"}
                                  onCheckedChange={() =>
                                    update.mutate({
                                      id: kid.id,
                                      status: kid.status === "done" ? "todo" : "done",
                                      completed_at: kid.status === "done" ? null : new Date().toISOString(),
                                    })
                                  }
                                  className="size-3.5 cursor-pointer"
                                />
                                <PriorityDot priority={kid.priority} className="size-1.5" />
                                <Link
                                  to="/tasks/$taskId"
                                  params={{ taskId: kid.id }}
                                  className={cn(
                                    "truncate min-w-0 flex-1 font-medium hover:underline",
                                    kid.status === "done" && "line-through text-muted-foreground opacity-70",
                                  )}
                                >
                                  {kid.title}
                                </Link>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {kid.status !== "in_progress" && kid.status !== "done" && (
                                  <button
                                    onClick={() => update.mutate({ id: kid.id, status: "in_progress", completed_at: null })}
                                    className="p-0.5 text-muted-foreground hover:text-blue-600 cursor-pointer"
                                    title="Start sub-task"
                                  >
                                    <Play className="size-3 fill-current" />
                                  </button>
                                )}
                                {kid.status !== "on_hold" && kid.status !== "done" && (
                                  <button
                                    onClick={() => update.mutate({ id: kid.id, status: "on_hold", completed_at: null })}
                                    className="p-0.5 text-muted-foreground hover:text-amber-600 cursor-pointer"
                                    title="Pause sub-task"
                                  >
                                    <Pause className="size-3 fill-current" />
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
              {!items.length && (
                <li className="rounded-xl border border-dashed py-6 text-center text-xs text-muted-foreground">
                  Drop tasks here
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}