import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTasks } from "@/lib/api";
import { buildTree } from "@/lib/task-utils";
import { KanbanBoard } from "@/components/kanban-board";

export const Route = createFileRoute("/_authenticated/board")({
  head: () => ({
    meta: [
      { title: "Board — TaskNest" },
      { name: "description", content: "Drag tasks between To Do, In Progress and Done on the TaskNest board." },
      { property: "og:title", content: "Board — TaskNest" },
      { property: "og:description", content: "Drag tasks between To Do, In Progress and Done on the TaskNest board." },
    ],
  }),
  component: BoardPage,
});

function BoardPage() {
  const { data: tasks = [] } = useTasks();
  const [showSubtasks, setShowSubtasks] = useState(false);
  const { childrenOf } = buildTree(tasks);

  return (
    <div className="space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Board</h1>
          <p className="text-sm text-muted-foreground">Drag a card to change its status.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Switch id="subs" checked={showSubtasks} onCheckedChange={setShowSubtasks} />
          <Label htmlFor="subs" className="text-sm">Show sub-tasks</Label>
        </div>
      </header>

      <KanbanBoard tasks={tasks} childrenOf={childrenOf} showSubtasks={showSubtasks} />
    </div>
  );
}