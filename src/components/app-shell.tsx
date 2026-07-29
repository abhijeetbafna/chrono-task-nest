import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Columns3,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Repeat,
  Search,
  Settings,
  Sun,
  Tags,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BucketDialog } from "@/components/bucket-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  useBuckets,
  useMarkNotificationsRead,
  useNotifications,
  useProfile,
  useSession,
} from "@/lib/api";
import { TaskNestLogo } from "@/components/bits";
import { QuickAdd } from "@/components/quick-add";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/board", label: "Board", icon: Columns3 },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/habits", label: "Habits", icon: Repeat },
  { to: "/trash", label: "Trash", icon: Trash2 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [createBucketOpen, setCreateBucketOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: buckets = [] } = useBuckets();
  const { data: profile } = useProfile();
  const { data: user } = useSession();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const unread = notifications.filter((n) => !n.read).length;

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tasknest.sidebar_collapsed") === "true";
    }
    return false;
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("tasknest.sidebar_collapsed", String(next));
      return next;
    });
  };

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem("tasknest.theme") as "light" | "dark") ||
        (profile?.theme as "light" | "dark") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      );
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("tasknest.theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const initials = (profile?.display_name || user?.email || "?").slice(0, 2).toUpperCase();

  const sidebar = (
    <div
      className={cn(
        "flex h-full shrink-0 flex-col gap-6 border-r bg-sidebar transition-all duration-300",
        collapsed ? "w-16 p-2" : "w-64 p-4",
      )}
    >
      <div className="flex items-center justify-between px-1">
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl gradient-primary text-primary-foreground shadow-sm group-hover:scale-105 transition-transform">
            <TaskNestLogo className="size-5" />
          </span>
          {!collapsed && <span className="font-display text-lg font-extrabold tracking-tight truncate">TaskNest</span>}
        </Link>

        <button
          onClick={toggleCollapsed}
          className="hidden md:flex p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      <Button
        className={cn("justify-start gap-2 cursor-pointer transition-all", collapsed && "px-0 justify-center size-9 rounded-xl")}
        onClick={() => setQuickOpen(true)}
        title={collapsed ? "New task" : undefined}
      >
        <Plus className="size-4 shrink-0" />
        {!collapsed && <span>New task</span>}
      </Button>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                collapsed && "justify-center px-0 py-2.5",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        <div className="pt-4">
          {!collapsed ? (
            <div className="flex items-center justify-between px-3 pb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Buckets
              </p>
              <button
                onClick={() => setCreateBucketOpen(true)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/80 transition-colors cursor-pointer"
                title="Create new bucket"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center pb-2">
              <button
                onClick={() => setCreateBucketOpen(true)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/80 cursor-pointer"
                title="Create new bucket"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          )}

          {buckets.map((b) => (
            <Link
              key={b.id}
              to="/tasks"
              search={{ bucket: b.id }}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? b.name : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                collapsed && "justify-center px-0 py-2",
              )}
            >
              <span className="text-base leading-none shrink-0">{b.icon || "📁"}</span>
              {!collapsed && <span className="truncate">{b.name}</span>}
            </Link>
          ))}
          {buckets.length === 0 && !collapsed && (
            <p className="px-3 py-1 text-xs text-muted-foreground italic">No buckets yet</p>
          )}
        </div>
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden md:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>
            <form
              className="relative min-w-0 flex-1 sm:w-80 sm:flex-none"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/tasks", search: { q: search || undefined } });
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="pl-9"
              />
            </form>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="cursor-pointer"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="size-5 text-amber-400" />
              ) : (
                <Moon className="size-5 text-muted-foreground" />
              )}
            </Button>

            <Button variant="ghost" size="icon" onClick={() => setQuickOpen(true)} aria-label="Quick add" className="cursor-pointer">
              <Plus className="size-5" />
            </Button>

            <Popover onOpenChange={(o) => o && unread > 0 && markRead.mutate()}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative cursor-pointer" aria-label="Notifications">
                  <Bell className="size-5" />
                  {unread > 0 && (
                    <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {unread}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <p className="border-b px-4 py-3 text-sm font-bold">Notifications</p>
                <ul className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 && (
                    <li className="px-4 py-6 text-center text-sm text-muted-foreground">You're all caught up.</li>
                  )}
                  {notifications.map((n) => (
                    <li key={n.id} className="border-b px-4 py-3 last:border-b-0">
                      <p className="text-sm font-semibold">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 cursor-pointer" aria-label="Account">
                  <Avatar className="size-9">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={profile?.display_name || "User"} />
                    ) : null}
                    <AvatarFallback className="bg-primary/15 text-sm font-bold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {profile?.display_name || user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/settings">
                    <Settings className="mr-2 size-4" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate({ to: "/auth", replace: true });
                  }}
                >
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      </div>

      <QuickAdd open={quickOpen} onOpenChange={setQuickOpen} />
      <BucketDialog open={createBucketOpen} onOpenChange={setCreateBucketOpen} />
    </div>
  );
}