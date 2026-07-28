import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Paperclip } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { LabelChip, PriorityDot } from "@/components/bits";
import { useTaskMutations } from "@/lib/api";
import type { Status, Task } from "@/lib/types";
import { formatRange, isOverdue } from "@/lib/task-utils";

const COLUMNS: { id: Status; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "done", title: "Done" },
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
    <div className="grid gap-4 lg:grid-cols-3">
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
              <h3 className="text-sm font-bold">{col.title}</h3>
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
                    className="surface-card cursor-grab p-3 active:cursor-grabbing transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center gap-2">
                      <PriorityDot priority={task.priority} />
                      <Link
                        to="/tasks/$taskId"
                        params={{ taskId: task.id }}
                        className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline"
                      >
                        {task.title}
                      </Link>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(task.labels ?? []).map((l) => (
                        <LabelChip key={l.id} label={l} />
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
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
                              className="flex items-center gap-2 rounded-lg bg-card p-1.5 text-xs border shadow-2xs"
                            >
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