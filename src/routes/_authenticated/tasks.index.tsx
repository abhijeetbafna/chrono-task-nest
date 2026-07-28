import { useDeferredValue, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useBuckets, useLabels, useTasks } from "@/lib/api";
import { PRIORITIES, type Priority } from "@/lib/types";
import {
  buildTree,
  emptyFilters,
  filterTasks,
  isOverdue,
  SORT_OPTIONS,
  sortTasks,
  type SortKey,
} from "@/lib/task-utils";
import { TaskList } from "@/components/task-list";
import { SectionHeading } from "@/components/bits";
import { TaskDialog } from "@/components/task-dialog";

export const Route = createFileRoute("/_authenticated/tasks/")({
  validateSearch: (search: Record<string, unknown>): { bucket?: string; q?: string } => ({
    ...(typeof search.bucket === "string" ? { bucket: search.bucket } : {}),
    ...(typeof search.q === "string" ? { q: search.q } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Tasks — TaskNest" },
      { name: "description", content: "Filter, sort and nest your tasks and sub-tasks in one focused list." },
      { property: "og:title", content: "Tasks — TaskNest" },
      { property: "og:description", content: "Filter, sort and nest your tasks and sub-tasks in one focused list." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const { bucket, q } = Route.useSearch();
  const { data: tasks = [] } = useTasks({ bucketId: bucket });
  const { data: labels = [] } = useLabels();
  const { data: buckets = [] } = useBuckets();
  const [sort, setSort] = useState<SortKey>("due_asc");
  const [filters, setFilters] = useState({ ...emptyFilters });
  const [newOpen, setNewOpen] = useState(false);

  const deferredSearch = useDeferredValue(q ?? filters.search);
  const activeBucket = buckets.find((b) => b.id === bucket);

  const { roots, childrenOf, overdue, today } = useMemo(() => {
    const filtered = filterTasks(tasks, { ...filters, search: deferredSearch });
    const sorted = sortTasks(filtered, sort);
    const tree = buildTree(sorted);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return {
      ...tree,
      overdue: tree.roots.filter((t) => isOverdue(t)),
      today: tree.roots.filter(
        (t) =>
          !isOverdue(t) &&
          t.end_datetime &&
          new Date(t.end_datetime) <= endOfToday &&
          t.status !== "done",
      ),
    };
  }, [tasks, filters, sort, deferredSearch]);

  const rest = roots.filter((t) => !overdue.includes(t) && !today.includes(t));
  const activeFilterCount =
    filters.priorities.length + filters.labelIds.length + (filters.status !== "all" ? 1 : 0);

  return (
    <div className="space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-extrabold tracking-tight">
            {activeBucket ? `${activeBucket.icon} ${activeBucket.name}` : "All tasks"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {roots.length} task{roots.length === 1 ? "" : "s"}
            {q ? ` matching “${q}”` : ""}
          </p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => setNewOpen(true)}>
          <Plus className="size-4" /> New task
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          placeholder="Filter in this view…"
          className="w-full sm:w-64"
        />

        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="size-4" /> Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 space-y-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</p>
              <div className="flex gap-1 rounded-full bg-muted p-1">
                {(["all", "open", "done"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilters((f) => ({ ...f, status: s }))}
                    className={cn(
                      "flex-1 rounded-full px-2 py-1 text-xs font-semibold capitalize",
                      filters.status === s ? "bg-card shadow-sm" : "text-muted-foreground",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority</p>
              <div className="space-y-1.5">
                {PRIORITIES.map((p) => (
                  <label key={p.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={filters.priorities.includes(p.value)}
                      onCheckedChange={() =>
                        setFilters((f) => ({
                          ...f,
                          priorities: f.priorities.includes(p.value)
                            ? f.priorities.filter((x) => x !== p.value)
                            : [...f.priorities, p.value as Priority],
                        }))
                      }
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>

            {labels.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Labels</p>
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((l) => {
                    const on = filters.labelIds.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        onClick={() =>
                          setFilters((f) => ({
                            ...f,
                            labelIds: on ? f.labelIds.filter((x) => x !== l.id) : [...f.labelIds, l.id],
                          }))
                        }
                        className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", !on && "opacity-60")}
                        style={{ backgroundColor: `${l.color}1f`, color: l.color }}
                      >
                        {l.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button variant="ghost" className="w-full" onClick={() => setFilters({ ...emptyFilters })}>
              Clear filters
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      {overdue.length > 0 && (
        <section>
          <SectionHeading title="Overdue" count={overdue.length} tone="danger" />
          <TaskList roots={overdue} childrenOf={childrenOf} />
        </section>
      )}

      {today.length > 0 && (
        <section>
          <SectionHeading title="Due today" count={today.length} tone="warn" />
          <TaskList roots={today} childrenOf={childrenOf} />
        </section>
      )}

      <section>
        <SectionHeading title="All tasks" count={rest.length} />
        <TaskList roots={rest} childrenOf={childrenOf} emptyLabel="No tasks match this view yet." />
      </section>

      <TaskDialog open={newOpen} onOpenChange={setNewOpen} defaultBucketId={bucket ?? null} />
    </div>
  );
}