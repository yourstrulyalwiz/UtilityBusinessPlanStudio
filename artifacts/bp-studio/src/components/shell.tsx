import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { RoleSwitcher } from "@/lib/test-mode";
import { useQueryClient } from "@tanstack/react-query";
import { useListNotifications, getListNotificationsQueryKey, useReadNotification } from "@workspace/api-client-react";
import { Bell, CircleHelp, ClipboardList, History, LayoutGrid, LogOut, Menu, Users, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Glyph } from "@/components/kit";
import { useMe, ROLE_LABEL, initials, fmtDateTime } from "@/lib/app";
import { cn } from "@/lib/utils";

function Notifications() {
  const qc = useQueryClient();
  const list = useListNotifications({ query: { queryKey: getListNotificationsQueryKey(), refetchInterval: 60000 } });
  const read = useReadNotification({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }) } });
  const items = list.data ?? [];
  const unread = items.filter((n) => !n.read);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border bg-white text-[#002244] hover:bg-muted" data-testid="button-notifications" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D9622B] px-1 text-[10px] font-semibold text-white tnum">{unread.length}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] rounded-xl p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold text-[#002244]">Notifications</div>
          {unread.length > 0 && (
            <button className="text-xs font-medium text-[#009FDA] hover:underline" data-testid="button-read-all" onClick={() => unread.forEach((n) => read.mutate({ id: n.id }))}>Mark all read</button>
          )}
        </div>
        <div className="max-h-[380px] overflow-auto">
          {list.isLoading ? (
            <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>
          ) : items.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">You are all caught up. Request decisions and team changes will appear here.</div>
          ) : (
            items.map((n) => (
              <button key={n.id} data-testid={`notification-${n.id}`} onClick={() => !n.read && read.mutate({ id: n.id })}
                className={cn("block w-full border-b px-4 py-3 text-left last:border-0 hover:bg-muted/60", !n.read && "bg-[#009FDA]/[.05]")}>
                <div className="flex items-start gap-2">
                  <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-[#009FDA]")} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[#002244]">{n.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground/80">{fmtDateTime(n.createdAt)}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const me = useMe();
  const { logout } = useAuth();
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const isAdmin = me.role === "admin";
  const canPeople = isAdmin || me.role === "ttl";
  const nav = [
    { href: isAdmin ? "/admin" : "/", label: isAdmin ? "Portfolio" : "Utilities", icon: LayoutGrid, show: true },
    { href: "/requests", label: "Requests", icon: ClipboardList, show: isAdmin || me.role === "ttl" },
    { href: "/users", label: "People & roles", icon: Users, show: canPeople },
    { href: "/audit", label: "Audit history", icon: History, show: canPeople },
    { href: "/help", label: "Help center", icon: CircleHelp, show: true },
  ].filter((n) => n.show);
  const inWorkspace = loc.startsWith("/utilities/") || loc.startsWith("/plans/");
  const active = (h: string) => (h === "/" ? loc === "/" || inWorkspace : loc.startsWith(h) || (h === "/admin" && inWorkspace));

  const sidebar = (
    <aside className="flex h-full w-64 flex-col bg-[#002244] text-white">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white"><Glyph className="h-6 w-6" /></div>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold">BP Studio</div>
          <div className="text-[11px] text-white/55">Utility of the Future</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)} data-testid={`link-${n.label.toLowerCase().replace(/\W+/g, "-")}`}
            className={cn("group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition",
              active(n.href) ? "bg-white/10 font-medium text-white" : "text-white/70 hover:bg-white/5 hover:text-white")}>
            {active(n.href) && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#009FDA]" />}
            <n.icon className="h-4 w-4" /> {n.label}
          </Link>
        ))}
      </nav>
      <div className="px-5 pb-3"><div className="wave-line opacity-50" /></div>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#009FDA] text-xs font-semibold">{initials(me.fullName)}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium" data-testid="text-user-name">{me.fullName}</div>
            <div className="truncate text-[11px] text-white/55">{ROLE_LABEL[me.role]}</div>
          </div>
          <button onClick={logout} className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Log out" data-testid="button-logout"><LogOut className="h-4 w-4" /></button>
        </div>
        <div className="mt-3 text-[10.5px] text-white/40">Water Global Practice · Utility of the Future</div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <div className="sticky top-0 hidden h-[100dvh] md:block">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-[#002244]/40" onClick={() => setOpen(false)} />
          <div className="relative h-full w-64">{sidebar}</div>
          <button className="absolute left-[270px] top-4 rounded-lg bg-white p-2" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-4 w-4" /></button>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-8">
          <button className="rounded-lg p-2 md:hidden" onClick={() => setOpen(true)} aria-label="Open menu" data-testid="button-menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden text-xs text-muted-foreground md:block">{me.organization || "World Bank"} · signed in as {me.email}</div>
          <div className="flex items-center gap-3"><RoleSwitcher /><Link href="/help" className="rounded-lg p-2 text-[#002244]/70 hover:bg-muted hover:text-[#002244]" aria-label="Help center" data-testid="button-topbar-help"><CircleHelp className="h-5 w-5" /></Link><Notifications /></div>
        </header>
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
