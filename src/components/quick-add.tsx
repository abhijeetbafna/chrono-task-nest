import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriorityPill } from "@/components/bits";
import { useBuckets, useTaskMutations } from "@/lib/api";
import { parseQuickAdd } from "@/lib/task-utils";
import { TaskDialog } from "@/components/task-dialog";

export function QuickAdd({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [value, setValue] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const { data: buckets = [] } = useBuckets();
  const { create } = useTaskMutations();

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  const parsed = parseQuickAdd(value);

  async function submit() {
    if (!parsed.title.trim()) return toast.error("Type a task first");
    try {
      await create.mutateAsync({
        title: parsed.title,
        description: null,
        bucket_id: buckets[0]?.id ?? null,
        parent_task_id: null,
        start_datetime: null,
        end_datetime: parsed.end_datetime,
        priority: parsed.priority,
        status: "todo",
        recurrence: null,
        labelIds: [],
      });
      toast.success("Task added");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add task");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Quick add
            </DialogTitle>
            <DialogDescription>
              Try “Send report tomorrow 5pm !high” — dates, priority and repeats are picked up automatically.
            </DialogDescription>
          </DialogHeader>

          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Task title, date, !priority…"
          />

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <PriorityPill priority={parsed.priority} />
            {parsed.end_datetime && <span>Due {new Date(parsed.end_datetime).toLocaleString()}</span>}
            {parsed.labelNames.map((l) => (
              <span key={l}>#{l}</span>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                onOpenChange(false);
                setDetailOpen(true);
              }}
            >
              More options
            </Button>
            <Button onClick={submit} disabled={create.isPending}>
              Add task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDialog open={detailOpen} onOpenChange={setDetailOpen} />
    </>
  );
}