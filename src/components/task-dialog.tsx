import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronRight, Clock, Paperclip, Plus, Trash2, Upload } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PriorityDot } from "@/components/bits";
import {
  attachmentUrl,
  useAttachmentMutations,
  useAttachments,
  useBuckets,
  useLabelMutations,
  useLabels,
  useTaskMutations,
} from "@/lib/api";
import { LABEL_COLORS, PRIORITIES, STATUSES, type Priority, type Status, type Task } from "@/lib/types";
import { fromLocalInput, toLocalInput } from "@/lib/task-utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task?: Task | null;
  parent?: Task | null;
  defaultBucketId?: string | null;
}

interface DraftSubtask {
  id: string;
  title: string;
  start: string;
  end: string;
  priority: Priority;
}

export function TaskDialog({ open, onOpenChange, task, parent, defaultBucketId }: Props) {
  const { data: buckets = [] } = useBuckets();
  const { data: labels = [] } = useLabels();
  const { create, update } = useTaskMutations();
  const labelMutations = useLabelMutations();
  const fileRef = useRef<HTMLInputElement>(null);

  // Stepper state (1: Task Details, 2: Add Sub-tasks)
  const [step, setStep] = useState<1 | 2>(1);

  // Main task form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bucketId, setBucketId] = useState<string>("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [priority, setPriority] = useState<Priority>("none");
  const [status, setStatus] = useState<Status>("todo");
  const [recurrence, setRecurrence] = useState("none");
  const [labelIds, setLabelIds] = useState<string[]>([]);

  // Inline Label creation state
  const [showNewLabel, setShowNewLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);

  async function handleCreateInlineLabel() {
    if (!newLabelName.trim()) return toast.error("Label name required");
    try {
      await labelMutations.create.mutateAsync({
        name: newLabelName.trim(),
        color: newLabelColor,
      });
      setNewLabelName("");
      setShowNewLabel(false);
      toast.success("Label created!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create label");
    }
  }

  // Sub-task draft builder states (Step 2)
  const [draftSubtasks, setDraftSubtasks] = useState<DraftSubtask[]>([]);
  const [subTitle, setSubTitle] = useState("");
  const [subStart, setSubStart] = useState("");
  const [subEnd, setSubEnd] = useState("");
  const [subPriority, setSubPriority] = useState<Priority>("none");

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setDraftSubtasks([]);
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setBucketId(task?.bucket_id ?? parent?.bucket_id ?? defaultBucketId ?? buckets[0]?.id ?? "");
    setStart(toLocalInput(task?.start_datetime ?? parent?.start_datetime));
    setEnd(toLocalInput(task?.end_datetime ?? parent?.end_datetime));
    setPriority(task?.priority ?? "none");
    setStatus(task?.status ?? "todo");
    setRecurrence(task?.recurrence ?? "none");
    setLabelIds((task?.labels ?? []).map((l) => l.id));

    // Reset sub-task builder input
    setSubTitle("");
    setSubStart(toLocalInput(task?.start_datetime ?? parent?.start_datetime));
    setSubEnd(toLocalInput(task?.end_datetime ?? parent?.end_datetime));
    setSubPriority("none");
  }, [open, task, parent, defaultBucketId, buckets]);

  const constraintError = useMemo(() => {
    if (!parent) return null;
    const ps = parent.start_datetime ? new Date(parent.start_datetime).getTime() : null;
    const pe = parent.end_datetime ? new Date(parent.end_datetime).getTime() : null;
    const s = start ? new Date(start).getTime() : null;
    const e = end ? new Date(end).getTime() : null;
    if (ps && s && s < ps) return "Sub-task starts before its parent task's window.";
    if (pe && e && e > pe) return "Sub-task ends after its parent task's deadline.";
    return null;
  }, [parent, start, end]);

  const rangeError = start && end && new Date(end) < new Date(start) ? "End must be after start." : null;

  function validateStep1() {
    if (!title.trim()) {
      toast.error("Give the task a title");
      return false;
    }
    if (rangeError) {
      toast.error(rangeError);
      return false;
    }
    if (constraintError) {
      toast.error(constraintError);
      return false;
    }
    return true;
  }

  function handleAddDraftSubtask() {
    if (!subTitle.trim()) {
      return toast.error("Enter a title for the sub-task");
    }
    const ps = start ? new Date(start).getTime() : null;
    const pe = end ? new Date(end).getTime() : null;
    const ss = subStart ? new Date(subStart).getTime() : null;
    const se = subEnd ? new Date(subEnd).getTime() : null;

    if (ss && se && se < ss) {
      return toast.error("Sub-task deadline must be after its start time");
    }
    if (ps && ss && ss < ps) {
      return toast.error("Sub-task starts before main task start time");
    }
    if (pe && se && se > pe) {
      return toast.error("Sub-task ends after main task deadline");
    }

    setDraftSubtasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: subTitle.trim(),
        start: subStart,
        end: subEnd,
        priority: subPriority,
      },
    ]);
    setSubTitle("");
    toast.success("Sub-task added to list");
  }

  async function saveAll(includeSubtasks: boolean) {
    if (!validateStep1()) return;

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      bucket_id: bucketId || null,
      parent_task_id: task?.parent_task_id ?? parent?.id ?? null,
      start_datetime: fromLocalInput(start),
      end_datetime: fromLocalInput(end),
      priority,
      status,
      recurrence: recurrence === "none" ? null : recurrence,
      labelIds,
    };

    try {
      if (task) {
        await update.mutateAsync({
          id: task.id,
          ...payload,
          completed_at: status === "done" ? (task.completed_at ?? new Date().toISOString()) : null,
        });
        toast.success("Task updated");
      } else {
        const createdParent = await create.mutateAsync(payload);
        
        // Save batch sub-tasks if user added any in step 2
        if (includeSubtasks && draftSubtasks.length > 0 && createdParent?.id) {
          for (const sub of draftSubtasks) {
            await create.mutateAsync({
              title: sub.title,
              parent_task_id: createdParent.id,
              bucket_id: createdParent.bucket_id,
              start_datetime: fromLocalInput(sub.start),
              end_datetime: fromLocalInput(sub.end),
              priority: sub.priority,
              status: "todo",
            });
          }
          toast.success(`Task created with ${draftSubtasks.length} sub-task(s)`);
        } else {
          toast.success(parent ? "Sub-task added" : "Task created");
        }
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save task");
    }
  }

  const isNewParentTask = !task && !parent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2">
              {task ? "Edit task" : parent ? "New sub-task" : "Create new task"}
              {parent && <span className="text-muted-foreground font-normal text-sm"> · under “{parent.title}”</span>}
            </DialogTitle>
          </div>

          {isNewParentTask && (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted/50 p-2 text-xs font-semibold text-muted-foreground">
              <span
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1 transition-colors",
                  step === 1 ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground",
                )}
              >
                1. Task details
              </span>
              <ChevronRight className="size-3" />
              <span
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1 transition-colors",
                  step === 2 ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground",
                )}
              >
                2. Sub-tasks (Optional)
              </span>
            </div>
          )}

          <DialogDescription>
            {step === 1
              ? parent
                ? "Sub-task timeline must stay inside the parent task's window."
                : "Set a title, timeframe, and options for your task."
              : "Break down this goal into smaller sub-tasks or skip to finish."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="t-title">Title</Label>
              <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="t-desc">Notes</Label>
              <Textarea
                id="t-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details, links, checklists…"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="t-start">Starts</Label>
                <Input id="t-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="t-end">Deadline</Label>
                <Input id="t-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>

            {(constraintError || rangeError) && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {constraintError ?? rangeError}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Bucket</Label>
                <Select value={bucketId} onValueChange={setBucketId} disabled={!!parent}>
                  <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
                  <SelectContent>
                    {buckets.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.icon} {b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!parent && (
              <div className="grid gap-2">
                <Label>Repeats</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Does not repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Labels</Label>
                <button
                  type="button"
                  onClick={() => setShowNewLabel(!showNewLabel)}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Plus className="size-3" /> {showNewLabel ? "Cancel" : "New label"}
                </button>
              </div>

              {showNewLabel && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border p-3 bg-muted/20">
                  <Input
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="Label name"
                    className="h-8 text-xs w-40"
                  />
                  <div className="flex items-center gap-1">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewLabelColor(c)}
                        className={cn(
                          "size-5 rounded-full cursor-pointer transition-transform",
                          newLabelColor === c ? "ring-2 ring-primary scale-110" : "opacity-70 hover:opacity-100",
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <Button type="button" size="sm" className="h-8 text-xs cursor-pointer" onClick={handleCreateInlineLabel}>
                    Add
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {labels.length === 0 && !showNewLabel && (
                  <p className="text-xs text-muted-foreground">No labels yet. Click "+ New label" to create one.</p>
                )}
                {labels.map((l) => {
                  const on = labelIds.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() =>
                        setLabelIds((prev) => (on ? prev.filter((x) => x !== l.id) : [...prev, l.id]))
                      }
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer",
                        on ? "ring-2 ring-offset-1 ring-offset-card" : "opacity-60 hover:opacity-100",
                      )}
                      style={{ backgroundColor: `${l.color}1f`, color: l.color }}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {task && <AttachmentPanel taskId={task.id} fileRef={fileRef} />}
          </div>
        ) : (
          /* STEP 2: SUB-TASKS BUILDER */
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-3 text-xs space-y-1">
              <p className="font-bold text-foreground">Task: “{title}”</p>
              <p className="text-muted-foreground">
                Timeframe: {start ? new Date(start).toLocaleString() : "No start"} → {end ? new Date(end).toLocaleString() : "No deadline"}
              </p>
            </div>

            <div className="rounded-xl border p-4 space-y-3 bg-card">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add a Sub-task</p>
              <div className="grid gap-3">
                <Input
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  placeholder="Sub-task title (e.g. Draft section 1)"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <Label className="text-xs">Starts</Label>
                    <Input
                      type="datetime-local"
                      value={subStart}
                      onChange={(e) => setSubStart(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Deadline</Label>
                    <Input
                      type="datetime-local"
                      value={subEnd}
                      onChange={(e) => setSubEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Priority:</Label>
                    <Select value={subPriority} onValueChange={(v) => setSubPriority(v as Priority)}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" size="sm" onClick={handleAddDraftSubtask} className="gap-1">
                    <Plus className="size-3.5" /> Add sub-task
                  </Button>
                </div>
              </div>
            </div>

            {/* List of draft sub-tasks */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sub-tasks ({draftSubtasks.length})
              </p>
              {draftSubtasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-xl">
                  No sub-tasks added yet. Add some above, or click finish to skip.
                </p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {draftSubtasks.map((sub, idx) => (
                    <li key={sub.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs bg-muted/20">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate">{idx + 1}. {sub.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {sub.start ? new Date(sub.start).toLocaleDateString() : ""} → {sub.end ? new Date(sub.end).toLocaleDateString() : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDraftSubtasks((prev) => prev.filter((x) => x.id !== sub.id))}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <div className="flex flex-wrap items-center gap-2">
                {isNewParentTask && (
                  <Button
                    variant="outline"
                    onClick={() => saveAll(false)}
                    disabled={create.isPending || update.isPending}
                  >
                    Skip Sub-tasks & Create
                  </Button>
                )}
                {isNewParentTask ? (
                  <Button
                    onClick={() => {
                      if (validateStep1()) setStep(2);
                    }}
                  >
                    Next: Add Sub-tasks <ArrowRight className="ml-1.5 size-4" />
                  </Button>
                ) : (
                  <Button onClick={() => saveAll(false)} disabled={create.isPending || update.isPending}>
                    {task ? "Save changes" : "Create"}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => saveAll(false)} disabled={create.isPending}>
                  Skip Sub-tasks & Finish
                </Button>
                <Button onClick={() => saveAll(true)} disabled={create.isPending}>
                  Save Task {draftSubtasks.length > 0 ? `& ${draftSubtasks.length} Sub-task(s)` : ""}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttachmentPanel({
  taskId,
  fileRef,
}: {
  taskId: string;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { data: files = [] } = useAttachments(taskId);
  const { upload, remove } = useAttachmentMutations(taskId);

  return (
    <div className="grid gap-2">
      <Label>Attachments</Label>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          Array.from(e.dataTransfer.files).forEach((f) => upload.mutate(f));
        }}
        className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground"
      >
        <Upload className="mx-auto mb-1 size-4" />
        Drag files here, or{" "}
        <button type="button" className="font-semibold text-primary" onClick={() => fileRef.current?.click()}>
          browse
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            Array.from(e.target.files ?? []).forEach((f) => upload.mutate(f));
            e.target.value = "";
          }}
        />
      </div>
      <ul className="grid gap-1">
        {files.map((f) => (
          <li key={f.id} className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
            <Paperclip className="size-4 shrink-0 text-muted-foreground" />
            <button
              className="min-w-0 flex-1 truncate text-left hover:underline"
              onClick={async () => {
                const url = await attachmentUrl(f.file_path);
                if (url) window.open(url, "_blank");
              }}
            >
              {f.file_name}
            </button>
            <span className="shrink-0 text-xs text-muted-foreground">
              {Math.max(1, Math.round((f.file_size ?? 0) / 1024))} KB
            </span>
            <button onClick={() => remove.mutate(f)} aria-label="Remove attachment">
              <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TimelineBar({ task, children }: { task: Task; children: Task[] }) {
  const s = task.start_datetime ? new Date(task.start_datetime).getTime() : null;
  const e = task.end_datetime ? new Date(task.end_datetime).getTime() : null;
  if (!s || !e || e <= s) return null;
  const span = Math.max(1, e - s);

  const is24h = typeof window !== "undefined" && localStorage.getItem("tasknest.time_format") === "24h";

  const formatTimeStr = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: !is24h,
        })
      : "Unscheduled";

  return (
    <div className="surface-card overflow-hidden p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div>
          <h3 className="font-display text-sm font-bold flex items-center gap-2">
            <Clock className="size-4 text-primary" /> Sub-task Schedule Breakdown
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visual breakdown of sub-task windows relative to the parent timeframe
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold rounded-full bg-muted/60 px-3 py-1.5 text-muted-foreground">
          <span>Start: {formatTimeStr(task.start_datetime)}</span>
          <ArrowRight className="size-3 shrink-0 text-primary" />
          <span>Deadline: {formatTimeStr(task.end_datetime)}</span>
        </div>
      </div>

      <div className="rounded-xl bg-muted/30 p-3 space-y-1.5 border">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
          <span className="text-primary font-bold">ℹ️ Schedule Guide:</span> The track below represents the full parent timeframe. Each colored bar shows when that specific sub-task is scheduled.
        </p>
      </div>

      <div className="space-y-4">
        {children.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-xl">
            No sub-tasks added yet.
          </p>
        ) : (
          children.map((c) => {
            const cs = c.start_datetime ? new Date(c.start_datetime).getTime() : s;
            const ce = c.end_datetime ? new Date(c.end_datetime).getTime() : e;

            const rawLeft = Math.max(0, Math.min(100, ((cs - s) / span) * 100));
            const rawRight = Math.max(0, Math.min(100, ((ce - s) / span) * 100));

            // Guarantee a minimum 8% bar width so sub-tasks positioned at start/deadline remain clear legible pills
            const width = Math.max(8, Math.min(100, rawRight - rawLeft));
            const left = Math.max(0, Math.min(100 - width, rawLeft));

            const isDone = c.status === "done";

            const timingLabel =
              rawLeft >= 95
                ? "At parent deadline"
                : rawLeft <= 5
                  ? "At parent start"
                  : `Scheduled ~${Math.round(left)}% through parent timeframe`;

            return (
              <div key={c.id} className="space-y-2 rounded-xl border bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <PriorityDot priority={c.priority} />
                    <span className={cn("font-semibold truncate", isDone && "line-through text-muted-foreground")}>
                      {c.title}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        isDone ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-primary/15 text-primary",
                      )}
                    >
                      {c.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs shrink-0">
                    <span className="text-[11px] font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-md border">
                      {formatTimeStr(c.start_datetime)} → {formatTimeStr(c.end_datetime)}
                    </span>
                  </div>
                </div>

                <div className="relative pt-1">
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/80">
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 rounded-full transition-all flex items-center justify-center text-[9px] font-bold text-primary-foreground shadow-xs",
                        isDone ? "bg-emerald-500" : "bg-primary",
                      )}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${c.title}: Scheduled from ${formatTimeStr(c.start_datetime)} to ${formatTimeStr(c.end_datetime)} (${timingLabel})`}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground font-mono px-0.5">
                    <span>0% (Start)</span>
                    <span>50%</span>
                    <span>100% (Deadline)</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}