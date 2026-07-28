import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LabelChip, PriorityDot } from "@/components/bits";
import { useTaskMutations } from "@/lib/api";
import type { Task } from "@/lib/types";
import { formatRange, isOverdue } from "@/lib/task-utils";
import { TaskDialog } from "@/components/task-dialog";

const EXPANDED_KEY = "tasknest.expanded";

function readExpanded(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(EXPANDED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function TaskList({
  roots,
  childrenOf,
  emptyLabel = "Nothing here yet.",
}: {
  roots: Task[];
  childrenOf: (id: string) => Task[];
  emptyLabel?: string;
}) {
  const [expanded, setExpanded] = useState<string[]>(readExpanded);
  const [editing, setEditing] = useState<Task | null>(null);
  const [subParent, setSubParent] = useState<Task | null>(null);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      sessionStorage.setItem(EXPANDED_KEY, JSON.stringify(next));
      return next;
    });

  if (!roots.length) {
    return <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <>
      <ul className="space-y-2">
        {roots.map((task) => {
          const kids = childrenOf(task.id);
          const open = expanded.includes(task.id);
          return (
            <li key={task.id} className="surface-card overflow-hidden">
              <TaskRow
                task={task}
                subCount={kids.length}
                subDone={kids.filter((k) => k.status === "done").length}
                expandable={kids.length > 0}
                expanded={open}
                onToggle={() => toggle(task.id)}
                onEdit={() => setEditing(task)}
                onAddSub={() => setSubParent(task)}
              />
              {open && kids.length > 0 && (
                <ul className="border-t bg-muted/30">
                  {kids.map((kid) => (
                    <li key={kid.id} className="border-b last:border-b-0">
                      <TaskRow task={kid} nested onEdit={() => setEditing(kid)} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <TaskDialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)} task={editing} />
      <TaskDialog open={!!subParent} onOpenChange={(v) => !v && setSubParent(null)} parent={subParent} />
    </>
  );
}

export function TaskRow({
  task,
  nested,
  subCount = 0,
  subDone = 0,
  expandable,
  expanded,
  onToggle,
  onEdit,
  onAddSub,
}: {
  task: Task;
  nested?: boolean;
  subCount?: number;
  subDone?: number;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onAddSub?: () => void;
}) {
  const { update, trash } = useTaskMutations();
  const [showNotes, setShowNotes] = useState(false);
  const done = task.status === "done";
  const overdue = isOverdue(task);

  const toggleDone = () => {
    if (!done && subCount > subDone) {
      toast.info(`Completed “${task.title}” (${subCount - subDone} sub-tasks remain open)`);
    }
    update.mutate({
      id: task.id,
      status: done ? "todo" : "done",
      completed_at: done ? null : new Date().toISOString(),
    });
  };

  return (
    <div className={cn("flex items-start gap-3 px-4 py-3", nested && "pl-10")}>
      {expandable ? (
        <button onClick={onToggle} aria-label="Toggle sub-tasks" className="mt-0.5 text-muted-foreground">
          <ChevronRight className={cn("size-4 transition-transform", expanded && "rotate-90")} />
        </button>
      ) : (
        <span className="mt-0.5 w-4" />
      )}

      <Checkbox checked={done} onCheckedChange={toggleDone} className="mt-1" aria-label="Complete task" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityDot priority={task.priority} />
          <Link
            to="/tasks/$taskId"
            params={{ taskId: task.id }}
            className={cn(
              "truncate font-semibold hover:underline",
              done && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </Link>
          {(task.labels ?? []).map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className={cn(overdue && "font-semibold text-destructive")}>
            {formatRange(task.start_datetime, task.end_datetime)}
          </span>
          {subCount > 0 && (
            <span>
              {subDone}/{subCount} sub-tasks
            </span>
          )}
          {!!task.attachment_count && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="size-3" />
              {task.attachment_count}
            </span>
          )}
          {task.recurrence && <span className="capitalize">repeats {task.recurrence}</span>}
        </div>

        {task.description && (
          <div className="mt-1 text-sm text-muted-foreground">
            <p className={cn(!showNotes && "line-clamp-1")}>{task.description}</p>
            <button className="text-xs font-semibold text-primary" onClick={() => setShowNotes((v) => !v)}>
              {showNotes ? "Show less" : "Show more"}
            </button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {onAddSub && (
          <Button variant="ghost" size="icon" onClick={onAddSub} aria-label="Add sub-task">
            <Plus className="size-4" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Task actions">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 size-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                trash.mutate(task.id);
                toast.success("Moved to trash");
              }}
            >
              <Trash2 className="mr-2 size-4" /> Move to trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}