import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { useBucketMutations } from "@/lib/api";
import type { Bucket } from "@/lib/types";
import { LABEL_COLORS } from "@/lib/types";

const EMOJI_PRESETS = [
  "🏠", "💼", "🚀", "🎯", "📚", "🛍️", "🎨", "💡",
  "🔥", "⚡", "🌟", "📌", "✈️", "💰", "💻", "🏆",
  "🎮", "🏋️", "🎵", "☕", "🌱", "🛠️", "❤️", "📅"
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bucket?: Bucket | null;
}

export function BucketDialog({ open, onOpenChange, bucket }: Props) {
  const { create, update } = useBucketMutations();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📁");
  const [color, setColor] = useState(LABEL_COLORS[0]);

  useEffect(() => {
    if (!open) return;
    setName(bucket?.name ?? "");
    setIcon(bucket?.icon ?? "📁");
    setColor(bucket?.color ?? LABEL_COLORS[0]);
  }, [open, bucket]);

  async function handleSave() {
    if (!name.trim()) return toast.error("Please enter a bucket name");

    try {
      if (bucket) {
        await update.mutateAsync({
          id: bucket.id,
          name: name.trim(),
          icon: icon.trim() || "📁",
          color,
        });
        toast.success("Bucket updated");
      } else {
        await create.mutateAsync({
          name: name.trim(),
          icon: icon.trim() || "📁",
          color,
        });
        toast.success("Bucket created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save bucket");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{bucket ? "Edit bucket" : "New bucket"}</DialogTitle>
          <DialogDescription>
            Organise tasks into dedicated project buckets with custom emojis.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="b-name">Bucket name</Label>
            <div className="flex gap-2">
              <Input
                id="b-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Side Projects, Fitness, Work"
                className="flex-1"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Emoji icon</Label>
            <div className="flex flex-wrap gap-1.5 rounded-xl border p-2 bg-muted/20">
              {EMOJI_PRESETS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  className={`size-8 rounded-lg text-lg flex items-center justify-center transition-all cursor-pointer ${
                    icon === e ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Custom emoji:</span>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-16 h-8 text-center text-base"
                maxLength={4}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Color theme</Label>
            <div className="flex flex-wrap gap-2">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`size-7 rounded-full transition-all cursor-pointer ${
                    color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={create.isPending || update.isPending} className="cursor-pointer">
            {bucket ? "Save changes" : "Create bucket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
