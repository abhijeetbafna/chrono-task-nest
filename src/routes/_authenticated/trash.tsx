import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTaskMutations, useTasks } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/trash")({
  head: () => ({
    meta: [
      { title: "Trash — TaskNest" },
      { name: "description", content: "Restore recently deleted tasks or remove them permanently." },
      { property: "og:title", content: "Trash — TaskNest" },
      { property: "og:description", content: "Restore recently deleted tasks or remove them permanently." },
    ],
  }),
  component: TrashPage,
});

function TrashPage() {
  const { data: tasks = [] } = useTasks({ trashed: true });
  const { restore, destroy } = useTaskMutations();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Trash</h1>
        <p className="text-sm text-muted-foreground">Deleted tasks stay here until you clear them.</p>
      </header>

      <ul className="space-y-2">
        {tasks.map((t) => (
          <li key={t.id} className="surface-card flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1 truncate font-medium text-muted-foreground line-through">
              {t.title}
            </span>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => restore.mutate(t.id)}>
              <RotateCcw className="size-4" /> Restore
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-destructive"
              onClick={() => {
                if (window.confirm("Delete permanently? This can't be undone.")) {
                  destroy.mutate(t.id);
                  toast.success("Deleted permanently");
                }
              }}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </li>
        ))}
        {!tasks.length && (
          <li className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            Trash is empty.
          </li>
        )}
      </ul>
    </div>
  );
}