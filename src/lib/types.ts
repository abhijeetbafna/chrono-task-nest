export type Priority = "urgent" | "high" | "medium" | "low" | "none";
export type Status = "todo" | "in_progress" | "done";

export interface Bucket {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  position: number;
  archived: boolean;
  created_at: string;
}

export interface Label {
  id: string;
  user_id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  user_id: string;
  bucket_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  priority: Priority;
  status: Status;
  position: number;
  recurrence: string | null;
  deleted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  labels?: Label[];
  attachment_count?: number;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  color: string;
  frequency: string;
  archived: boolean;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string;
}

export interface AppNotification {
  id: string;
  task_id: string | null;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export const PRIORITIES: { value: Priority; label: string; className: string; dot: string }[] = [
  { value: "urgent", label: "Urgent", className: "text-p-urgent", dot: "bg-p-urgent" },
  { value: "high", label: "High", className: "text-p-high", dot: "bg-p-high" },
  { value: "medium", label: "Medium", className: "text-p-medium", dot: "bg-p-medium" },
  { value: "low", label: "Low", className: "text-p-low", dot: "bg-p-low" },
  { value: "none", label: "None", className: "text-p-none", dot: "bg-p-none" },
];

export const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

export const STATUSES: { value: Status; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export const LABEL_COLORS = [
  "#6d3fe0",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
  "#8b5cf6",
];