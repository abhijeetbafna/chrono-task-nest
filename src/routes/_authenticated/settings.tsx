import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronsUpDown,
  Clock,
  Globe,
  LogOut,
  Palette,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  useBucketMutations,
  useBuckets,
  useLabelMutations,
  useLabels,
  useProfile,
  useSession,
  useUpdateProfile,
} from "@/lib/api";
import { LABEL_COLORS } from "@/lib/types";
import { BucketDialog } from "@/components/bucket-dialog";

export const Route = createFileRoute("/_authenticated/settings")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    ...(typeof search.tab === "string" ? { tab: search.tab } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Settings — TaskNest" },
      { name: "description", content: "Customise your profile, appearance, time format, buckets and labels in TaskNest." },
      { property: "og:title", content: "Settings — TaskNest" },
      { property: "og:description", content: "Customise your profile, appearance, time format, buckets and labels in TaskNest." },
    ],
  }),
  component: SettingsPage,
});

import { useQuery } from "@tanstack/react-query";

// Dynamic Avatar Generators (Female, Male, and Abstract categories with verified 200 OK SVG endpoints)
function getDynamicFemaleAvatars(seedOffset = 0): { name: string; url: string }[] {
  const styles = ["lorelei", "micah", "personas", "big-smile"];
  const names = ["Sophia", "Emma", "Luna", "Maya", "Chloe", "Olivia", "Ava", "Isabella"];
  return names.map((name, i) => {
    const style = styles[i % styles.length];
    const seed = seedOffset ? `female_${name}_${seedOffset}` : `female_${name}`;
    return {
      name,
      url: `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`,
    };
  });
}

function getDynamicMaleAvatars(seedOffset = 0): { name: string; url: string }[] {
  const styles = ["adventurer", "micah", "personas", "big-smile"];
  const names = ["Alex", "Marcus", "Felix", "Leo", "Ryan", "David", "Ethan", "Noah"];
  return names.map((name, i) => {
    const style = styles[i % styles.length];
    const seed = seedOffset ? `male_${name}_${seedOffset}` : `male_${name}`;
    return {
      name,
      url: `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`,
    };
  });
}

function getDynamicAbstractAvatars(seedOffset = 0): { name: string; url: string }[] {
  const styles = ["bottts", "shapes", "identicon", "pixel-art"];
  const names = ["Bot-Alpha", "Bot-Beta", "Pixel-1", "Shape-A", "Abstract-X", "Plant-Green", "Cyber-Neo", "Matrix-01"];
  return names.map((name, i) => {
    const style = styles[i % styles.length];
    const seed = seedOffset ? `abstract_${name}_${seedOffset}` : `abstract_${name}`;
    return {
      name,
      url: `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`,
    };
  });
}

function SettingsPage() {
  const { tab = "profile" } = Route.useSearch();
  const [activeTab, setActiveTab] = useState<"profile" | "buckets" | "preferences">(
    tab === "buckets" ? "buckets" : tab === "preferences" ? "preferences" : "profile",
  );

  const { data: profile } = useProfile();
  const { data: user } = useSession();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();

  const { data: buckets = [] } = useBuckets();
  const { data: labels = [] } = useLabels();
  const bucketM = useBucketMutations();
  const labelM = useLabelMutations();

  // Profile tab states
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarCategory, setAvatarCategory] = useState<"female" | "male" | "abstract">("female");
  const [avatarSeed, setAvatarSeed] = useState(0);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [tzOpen, setTzOpen] = useState(false);
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">("12h");

  const femaleAvatars = useMemo(() => getDynamicFemaleAvatars(avatarSeed), [avatarSeed]);
  const maleAvatars = useMemo(() => getDynamicMaleAvatars(avatarSeed), [avatarSeed]);
  const abstractAvatars = useMemo(() => getDynamicAbstractAvatars(avatarSeed), [avatarSeed]);

  // Dynamic Timezones API via timeapi.io
  const { data: rawTimezones = [] } = useQuery<string[]>({
    queryKey: ["available-timezones"],
    queryFn: async () => {
      const res = await fetch("https://timeapi.io/api/timezone/availabletimezones");
      if (!res.ok) throw new Error("Failed to fetch timezones");
      return res.json();
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  const timezones = useMemo(() => {
    const list = rawTimezones.length ? rawTimezones : [
      "Asia/Kolkata", "UTC", "America/New_York", "Europe/London", "Asia/Tokyo", "Australia/Sydney", "Africa/Cairo"
    ];
    const now = new Date();
    return list.map((tz) => {
      try {
        const formatter = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" });
        const parts = formatter.formatToParts(now);
        const offset = parts.find((p) => p.type === "timeZoneName")?.value || "";
        return { value: tz, label: offset ? `${tz} (${offset})` : tz };
      } catch {
        return { value: tz, label: tz };
      }
    });
  }, [rawTimezones]);

  // Preferences tab states
  const [weekStart, setWeekStart] = useState("0");
  const [urgencyHours, setUrgencyHours] = useState("24");

  // Buckets & Labels tab states
  const [createBucketOpen, setCreateBucketOpen] = useState(false);
  const [editingBucket, setEditingBucket] = useState<unknown>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
    setTimezone(profile.timezone || "Asia/Kolkata");
    setWeekStart(String(profile.week_start ?? 0));
    setUrgencyHours(String(profile.urgency_hours ?? 24));

    if (typeof window !== "undefined") {
      const savedFmt = localStorage.getItem("tasknest.time_format") as "12h" | "24h";
      if (savedFmt) setTimeFormat(savedFmt);
    }
  }, [profile]);

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      return toast.error("Image file size should be less than 2MB");
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      setAvatarUrl(result);
      toast.success("Avatar image loaded");
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile() {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("tasknest.time_format", timeFormat);
        localStorage.setItem("tasknest.timezone", timezone);
      }
      await updateProfile.mutateAsync({
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl || null,
        timezone,
      });
      toast.success("Profile & appearance settings saved!");
    } catch {
      toast.error("Failed to save profile settings");
    }
  }

  async function handleSavePreferences() {
    try {
      await updateProfile.mutateAsync({
        week_start: Number(weekStart),
        urgency_hours: Number(urgencyHours),
      });
      toast.success("Preferences saved!");
    } catch {
      toast.error("Failed to save preferences");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, time preferences, buckets and labels.</p>
      </header>

      {/* Tabs navigation */}
      <div className="flex border-b space-x-2">
        <button
          onClick={() => setActiveTab("profile")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all cursor-pointer",
            activeTab === "profile"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <User className="size-4" /> Profile & Appearance
        </button>

        <button
          onClick={() => setActiveTab("buckets")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all cursor-pointer",
            activeTab === "buckets"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Tag className="size-4" /> Buckets & Labels
        </button>

        <button
          onClick={() => setActiveTab("preferences")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all cursor-pointer",
            activeTab === "preferences"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <SettingsIcon className="size-4" /> Preferences
        </button>
      </div>

      {/* TAB 1: PROFILE & APPEARANCE */}
      {activeTab === "profile" && (
        <div className="max-w-2xl space-y-6">
          <section className="surface-card space-y-5 p-6">
            <h2 className="text-base font-bold flex items-center gap-2 border-b pb-3">
              <User className="size-4 text-primary" /> Avatar & Display Info
            </h2>

            {/* Avatar section */}
            <div className="space-y-4">
              <Label>Profile Avatar</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Avatar className="size-20 border-2 border-primary/20 shrink-0">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="Avatar" /> : null}
                  <AvatarFallback className="bg-primary/15 text-xl font-bold text-primary">
                    {(displayName || user?.email || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setAvatarCategory("female")}
                        className={cn(
                          "rounded-md px-2.5 py-1 font-bold transition-all cursor-pointer",
                          avatarCategory === "female" ? "bg-card text-primary shadow-xs" : "text-muted-foreground",
                        )}
                      >
                        Female
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarCategory("male")}
                        className={cn(
                          "rounded-md px-2.5 py-1 font-bold transition-all cursor-pointer",
                          avatarCategory === "male" ? "bg-card text-primary shadow-xs" : "text-muted-foreground",
                        )}
                      >
                        Male
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarCategory("abstract")}
                        className={cn(
                          "rounded-md px-2.5 py-1 font-bold transition-all cursor-pointer flex items-center gap-1",
                          avatarCategory === "abstract" ? "bg-card text-primary shadow-xs" : "text-muted-foreground",
                        )}
                      >
                        <Sparkles className="size-3 text-amber-500" /> Abstract
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAvatarSeed((s) => s + 1)}
                        className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 px-2.5 py-1 text-xs font-semibold hover:bg-muted cursor-pointer transition-colors"
                        title="Generate new avatar styles"
                      >
                        🎲 Randomize
                      </button>

                      <label className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2.5 py-1 text-xs font-semibold hover:bg-muted cursor-pointer transition-colors shrink-0">
                        <Upload className="size-3.5 text-primary" /> Custom
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {(avatarCategory === "female"
                      ? femaleAvatars
                      : avatarCategory === "male"
                      ? maleAvatars
                      : abstractAvatars
                    ).map((item: { name: string; url: string }) => (
                      <button
                        key={item.url}
                        type="button"
                        onClick={() => setAvatarUrl(item.url)}
                        title={item.name}
                        className={cn(
                          "size-10 rounded-full overflow-hidden border-2 cursor-pointer transition-transform hover:scale-110 relative bg-muted/30",
                          avatarUrl === item.url ? "border-primary ring-2 ring-primary/40 scale-105" : "border-transparent opacity-80 hover:opacity-100",
                        )}
                      >
                        <img src={item.url} alt={item.name} className="size-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dn">Display Name</Label>
              <Input
                id="dn"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          </section>

          <section className="surface-card space-y-5 p-6">
            <h2 className="text-base font-bold flex items-center gap-2 border-b pb-3">
              <Globe className="size-4 text-primary" /> Timezone & Time Format
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Timezone</Label>
                <Popover open={tzOpen} onOpenChange={setTzOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={tzOpen}
                      className="w-full justify-between font-normal text-xs h-9 bg-background cursor-pointer"
                    >
                      <span className="truncate">
                        {timezone ? timezones.find((tz) => tz.value === timezone)?.label || timezone : "Search timezone..."}
                      </span>
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] sm:w-[380px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search city or timezone (e.g. Kolkata, London, New York)..." className="h-9 text-xs" />
                      <CommandList className="max-h-64 overflow-y-auto">
                        <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">No timezone found.</CommandEmpty>
                        <CommandGroup>
                          {timezones.map((tz: { value: string; label: string }) => (
                            <CommandItem
                              key={tz.value}
                              value={`${tz.value} ${tz.label}`}
                              onSelect={() => {
                                setTimezone(tz.value);
                                setTzOpen(false);
                              }}
                              className="text-xs flex items-center justify-between cursor-pointer"
                            >
                              <span className="truncate">{tz.label}</span>
                              <Check className={cn("size-3.5 shrink-0 ml-2", timezone === tz.value ? "opacity-100 text-primary" : "opacity-0")} />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label>Time Format</Label>
                <div className="flex gap-2 rounded-xl bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => setTimeFormat("12h")}
                    className={cn(
                      "flex-1 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer",
                      timeFormat === "12h" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground",
                    )}
                  >
                    12-hour (10:06 PM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFormat("24h")}
                    className={cn(
                      "flex-1 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer",
                      timeFormat === "24h" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground",
                    )}
                  >
                    24-hour (22:06)
                  </button>
                </div>
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending} className="cursor-pointer">
              Save Profile & Appearance
            </Button>
          </section>
        </div>
      )}

      {/* TAB 2: BUCKETS & LABELS */}
      {activeTab === "buckets" && (
        <div className="max-w-3xl space-y-6">
          <section className="surface-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Palette className="size-4 text-primary" /> Project Buckets
                </h2>
                <p className="text-xs text-muted-foreground">Categorise tasks with custom icons & colors</p>
              </div>
              <Button size="sm" onClick={() => setCreateBucketOpen(true)} className="gap-1.5 cursor-pointer">
                <Plus className="size-4" /> New Bucket
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {buckets.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl leading-none">{b.icon || "📁"}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{b.name}</p>
                      <span className="inline-block size-2 rounded-full" style={{ backgroundColor: b.color }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 cursor-pointer"
                      onClick={() => setEditingBucket(b)}
                    >
                      ✏️
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                      onClick={() => {
                        if (confirm(`Delete bucket “${b.name}”?`)) bucketM.remove.mutate(b.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {buckets.length === 0 && (
                <p className="text-sm text-muted-foreground italic py-4 col-span-2 text-center">
                  No buckets created yet. Click "New Bucket" to add one!
                </p>
              )}
            </div>
          </section>

          <section className="surface-card p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Tag className="size-4 text-primary" /> Color Labels
              </h2>
              <p className="text-xs text-muted-foreground">Add tags to highlight priority or categories</p>
            </div>

            <form
              className="flex flex-wrap items-center gap-2 pt-1"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newLabelName.trim()) return toast.error("Label name required");
                await labelM.create.mutateAsync({ name: newLabelName.trim(), color: newLabelColor });
                setNewLabelName("");
                toast.success("Label created!");
              }}
            >
              <Input
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="e.g. urgent, deep-work"
                className="w-full sm:w-64"
              />
              <div className="flex items-center gap-1.5">
                {LABEL_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setNewLabelColor(c)}
                    className={cn(
                      "size-6 rounded-full cursor-pointer transition-transform",
                      newLabelColor === c ? "ring-2 ring-primary scale-110" : "opacity-70 hover:opacity-100",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Button type="submit" size="sm" className="gap-1 cursor-pointer">
                <Plus className="size-4" /> Add Label
              </Button>
            </form>

            <div className="flex flex-wrap gap-2 pt-2">
              {labels.map((l) => (
                <span
                  key={l.id}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: `${l.color}1f`, color: l.color }}
                >
                  {l.name}
                  <button
                    type="button"
                    onClick={() => labelM.remove.mutate(l.id)}
                    className="hover:opacity-80 cursor-pointer"
                    aria-label={`Delete ${l.name}`}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </span>
              ))}
              {labels.length === 0 && <p className="text-xs text-muted-foreground italic">No labels created yet.</p>}
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: PREFERENCES & ACCOUNT */}
      {activeTab === "preferences" && (
        <div className="max-w-xl space-y-6">
          <section className="surface-card space-y-5 p-6">
            <h2 className="text-base font-bold flex items-center gap-2 border-b pb-3">
              <Clock className="size-4 text-primary" /> Task & Calendar Preferences
            </h2>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Week starts on</Label>
                <Select value={weekStart} onValueChange={setWeekStart}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Flag tasks as urgent within</Label>
                <Select value={urgencyHours} onValueChange={setUrgencyHours}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSavePreferences} disabled={updateProfile.isPending} className="cursor-pointer">
              Save Preferences
            </Button>
          </section>

          <section className="surface-card space-y-4 p-6">
            <h2 className="text-base font-bold text-destructive flex items-center gap-2">
              <LogOut className="size-4" /> Account Session
            </h2>
            <p className="text-xs text-muted-foreground">Signed in as: <span className="font-semibold text-foreground">{user?.email}</span></p>
            <Button
              variant="outline"
              className="cursor-pointer text-destructive hover:bg-destructive/10"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth", replace: true });
              }}
            >
              Sign out
            </Button>
          </section>
        </div>
      )}

      <BucketDialog
        open={createBucketOpen || !!editingBucket}
        onOpenChange={(open) => {
          setCreateBucketOpen(open);
          if (!open) setEditingBucket(null);
        }}
        bucket={editingBucket as any}
      />
    </div>
  );
}