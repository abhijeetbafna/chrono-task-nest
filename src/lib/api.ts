import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  AppNotification,
  Attachment,
  Bucket,
  Habit,
  HabitLog,
  Label,
  Task,
} from "./types";

/* ---------------- session ---------------- */

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
    staleTime: 60_000,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data as {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
        timezone: string;
        theme: string;
        week_start: number;
        urgency_hours: number;
      } | null;
    },
    staleTime: 30_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update(patch as never).eq("id", u.user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

/* ---------------- buckets ---------------- */

export function useBuckets() {
  return useQuery({
    queryKey: ["buckets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buckets")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Bucket[];
    },
    staleTime: 15_000,
  });
}

export function useBucketMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ["buckets"] });

  const create = useMutation({
    mutationFn: async (input: Partial<Bucket>) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("buckets")
        .insert({ ...input, name: input.name ?? "New bucket", user_id: u.user.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data as Bucket;
    },
    onSuccess: done,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Bucket> & { id: string }) => {
      const { error } = await supabase.from("buckets").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("buckets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      done();
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return { create, update, remove };
}

/* ---------------- labels ---------------- */

export function useLabels() {
  return useQuery({
    queryKey: ["labels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("labels").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Label[];
    },
    staleTime: 15_000,
  });
}

export function useLabelMutations() {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: ["labels"] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };
  const create = useMutation({
    mutationFn: async (input: { name: string; color: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("labels").insert({ ...input, user_id: u.user.id } as never);
      if (error) throw error;
    },
    onSuccess: done,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; color?: string }) => {
      const { error } = await supabase.from("labels").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("labels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
  });
  return { create, update, remove };
}

/* ---------------- tasks ---------------- */

type RawTask = Task & { task_labels?: { labels: Label | null }[]; attachments?: { id: string }[] };

function shape(rows: RawTask[]): Task[] {
  return rows.map((r) => ({
    ...r,
    labels: (r.task_labels ?? []).map((tl) => tl.labels).filter(Boolean) as Label[],
    attachment_count: (r.attachments ?? []).length,
  }));
}

const SELECT = "*, task_labels(labels(*)), attachments(id)";

export function useTasks(opts: { bucketId?: string; trashed?: boolean } = {}) {
  return useQuery({
    queryKey: ["tasks", opts.bucketId ?? "all", opts.trashed ? "trash" : "live"],
    queryFn: async () => {
      let q = supabase.from("tasks").select(SELECT);
      q = opts.trashed ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
      if (opts.bucketId) q = q.eq("bucket_id", opts.bucketId);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return shape((data ?? []) as unknown as RawTask[]);
    },
    staleTime: 0,
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ["task", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select(SELECT).eq("id", id!).maybeSingle();
      if (error) throw error;
      return data ? shape([data as unknown as RawTask])[0] : null;
    },
  });
}

export interface TaskInput {
  title: string;
  description?: string | null;
  bucket_id?: string | null;
  parent_task_id?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  priority?: string;
  status?: string;
  recurrence?: string | null;
}

export function useTaskMutations() {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["task"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const create = useMutation({
    mutationFn: async ({ labelIds, ...input }: TaskInput & { labelIds?: string[] }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...input, user_id: u.user.id } as never)
        .select()
        .single();
      if (error) throw error;
      const task = data as Task;
      if (labelIds?.length) {
        await supabase
          .from("task_labels")
          .insert(labelIds.map((l) => ({ task_id: task.id, label_id: l, user_id: u.user!.id })) as never);
      }
      return task;
    },
    onSuccess: done,
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      labelIds,
      ...patch
    }: Partial<TaskInput> & { id: string; labelIds?: string[]; completed_at?: string | null; deleted_at?: string | null }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("tasks").update(patch as never).eq("id", id);
      if (error) throw error;
      if (labelIds && u.user) {
        await supabase.from("task_labels").delete().eq("task_id", id);
        if (labelIds.length) {
          await supabase
            .from("task_labels")
            .insert(labelIds.map((l) => ({ task_id: id, label_id: l, user_id: u.user!.id })) as never);
        }
      }
    },
    onSuccess: done,
  });

  const trash = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").update({ deleted_at: null } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
  });

  const destroy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
  });

  return { create, update, trash, restore, destroy };
}

/* ---------------- attachments ---------------- */

export function useAttachments(taskId: string | undefined) {
  return useQuery({
    enabled: !!taskId,
    queryKey: ["attachments", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("task_id", taskId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Attachment[];
    },
  });
}

export function useAttachmentMutations(taskId: string | undefined) {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: ["attachments", taskId] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || !taskId) throw new Error("Not ready");
      const path = `${u.user.id}/${taskId}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("attachments").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("attachments").insert({
        user_id: u.user.id,
        task_id: taskId,
        file_path: path,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      } as never);
      if (error) throw error;
    },
    onSuccess: done,
  });
  const remove = useMutation({
    mutationFn: async (a: Attachment) => {
      await supabase.storage.from("attachments").remove([a.file_path]);
      const { error } = await supabase.from("attachments").delete().eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: done,
  });
  return { upload, remove };
}

export async function attachmentUrl(path: string) {
  const { data } = await supabase.storage.from("attachments").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/* ---------------- habits ---------------- */

export function useHabits() {
  return useQuery({
    queryKey: ["habits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .eq("archived", false)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Habit[];
    },
    staleTime: 15_000,
  });
}

export function useHabitLogs() {
  return useQuery({
    queryKey: ["habit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("habit_logs").select("*");
      if (error) throw error;
      return (data ?? []) as HabitLog[];
    },
    staleTime: 15_000,
  });
}

export function useHabitMutations() {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: ["habits"] });
    qc.invalidateQueries({ queryKey: ["habit_logs"] });
  };
  const create = useMutation({
    mutationFn: async (input: { name: string; color: string; frequency: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("habits").insert({ ...input, user_id: u.user.id } as never);
      if (error) throw error;
    },
    onSuccess: done,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
  });
  const toggleDay = useMutation({
    mutationFn: async ({ habitId, date, on }: { habitId: string; date: string; on: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (on) {
        const { error } = await supabase
          .from("habit_logs")
          .insert({ habit_id: habitId, log_date: date, user_id: u.user.id } as never);
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("habit_logs")
          .delete()
          .eq("habit_id", habitId)
          .eq("log_date", date);
        if (error) throw error;
      }
    },
    onSuccess: done,
  });
  return { create, remove, toggleDay };
}

/* ---------------- notifications ---------------- */

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
    staleTime: 15_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as never)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}