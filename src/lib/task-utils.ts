import { PRIORITY_RANK, type Priority, type Task } from "./types";

export type SortKey =
  | "due_asc"
  | "due_desc"
  | "start_asc"
  | "start_desc"
  | "alpha_asc"
  | "alpha_desc"
  | "priority_desc"
  | "priority_asc"
  | "created"
  | "modified";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "due_asc", label: "Due date ↑" },
  { value: "due_desc", label: "Due date ↓" },
  { value: "start_asc", label: "Start date ↑" },
  { value: "start_desc", label: "Start date ↓" },
  { value: "priority_desc", label: "Priority high → low" },
  { value: "priority_asc", label: "Priority low → high" },
  { value: "alpha_asc", label: "Title A–Z" },
  { value: "alpha_desc", label: "Title Z–A" },
  { value: "created", label: "Date created" },
  { value: "modified", label: "Last modified" },
];

const t = (v: string | null) => (v ? new Date(v).getTime() : Number.POSITIVE_INFINITY);

export function sortTasks(tasks: Task[], key: SortKey): Task[] {
  const out = [...tasks];
  out.sort((a, b) => {
    switch (key) {
      case "due_asc":
        return t(a.end_datetime) - t(b.end_datetime);
      case "due_desc":
        return t(b.end_datetime) - t(a.end_datetime);
      case "start_asc":
        return t(a.start_datetime) - t(b.start_datetime);
      case "start_desc":
        return t(b.start_datetime) - t(a.start_datetime);
      case "alpha_asc":
        return a.title.localeCompare(b.title);
      case "alpha_desc":
        return b.title.localeCompare(a.title);
      case "priority_desc":
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      case "priority_asc":
        return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      case "created":
        return t(b.created_at) - t(a.created_at);
      case "modified":
        return t(b.updated_at) - t(a.updated_at);
    }
  });
  return out;
}

export interface Filters {
  labelIds: string[];
  priorities: Priority[];
  status: "all" | "open" | "done";
  search: string;
}

export const emptyFilters: Filters = { labelIds: [], priorities: [], status: "all", search: "" };

export function filterTasks(tasks: Task[], f: Filters): Task[] {
  return tasks.filter((task) => {
    if (f.status === "open" && task.status === "done") return false;
    if (f.status === "done" && task.status !== "done") return false;
    if (f.priorities.length && !f.priorities.includes(task.priority)) return false;
    if (f.labelIds.length && !(task.labels ?? []).some((l) => f.labelIds.includes(l.id))) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!`${task.title} ${task.description ?? ""}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function buildTree(tasks: Task[]) {
  const roots = tasks.filter((x) => !x.parent_task_id);
  const byParent = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.parent_task_id) continue;
    const list = byParent.get(task.parent_task_id) ?? [];
    list.push(task);
    byParent.set(task.parent_task_id, list);
  }
  return { roots, childrenOf: (id: string) => byParent.get(id) ?? [] };
}

export function isOverdue(task: Task) {
  return !!task.end_datetime && task.status !== "done" && new Date(task.end_datetime) < new Date();
}

export function withinHours(iso: string | null, hours: number) {
  if (!iso) return false;
  const diff = new Date(iso).getTime() - Date.now();
  return diff >= 0 && diff <= hours * 3600_000;
}

export function formatRange(start: string | null, end: string | null) {
  const is24h = typeof window !== "undefined" && localStorage.getItem("tasknest.time_format") === "24h";
  const fmt = (d: string) =>
    new Date(d).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: !is24h,
    });
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  if (end) return `Due ${fmt(end)}`;
  if (start) return `Starts ${fmt(start)}`;
  return "No timeline";
}

export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

/** Natural-language quick add: "Submit report tomorrow 5pm #work !high" */
export function parseQuickAdd(input: string) {
  let text = input;
  let priority: Priority = "none";
  const labels: string[] = [];

  text = text.replace(/!(urgent|high|medium|low)\b/gi, (_, p) => {
    priority = p.toLowerCase() as Priority;
    return "";
  });
  text = text.replace(/#([\w-]+)/g, (_, l) => {
    labels.push(l);
    return "";
  });

  let due: Date | null = null;
  const base = new Date();
  const dayMatch = text.match(/\b(today|tomorrow|tonight|next week)\b/i);
  if (dayMatch) {
    due = new Date(base);
    const word = dayMatch[1].toLowerCase();
    if (word === "tomorrow") due.setDate(due.getDate() + 1);
    if (word === "next week") due.setDate(due.getDate() + 7);
    if (word === "tonight") due.setHours(20, 0, 0, 0);
    text = text.replace(dayMatch[0], "");
  }
  const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (timeMatch) {
    due = due ?? new Date(base);
    let hour = parseInt(timeMatch[1], 10) % 12;
    if (timeMatch[3].toLowerCase() === "pm") hour += 12;
    due.setHours(hour, timeMatch[2] ? parseInt(timeMatch[2], 10) : 0, 0, 0);
    text = text.replace(timeMatch[0], "");
  } else if (due) {
    due.setHours(23, 59, 0, 0);
  }

  return {
    title: text.replace(/\s+/g, " ").trim() || "Untitled task",
    priority,
    labelNames: labels,
    end_datetime: due ? due.toISOString() : null,
  };
}