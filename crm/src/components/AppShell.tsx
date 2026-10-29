"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FileSignature,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  Settings,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/devis", label: "Devis", icon: FileSignature },
  { href: "/factures", label: "Factures", icon: Receipt },
  { href: "/offres", label: "Mes offres", icon: Package },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export default function AppShell({
  children,
  userName,
  companyName,
}: {
  children: React.ReactNode;
  userName: string;
  companyName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
    } catch {}
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem("sidebar-collapsed", c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const current = NAV.find((n) => isActive(pathname, n.href));

  const nav = (compact: boolean) => (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            title={compact ? label : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-gradient-to-r from-brand-500/20 to-indigo-500/10 text-white ring-1 ring-inset ring-brand-400/20"
                : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100",
              compact && "justify-center px-0",
            )}
          >
            <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand-300" : "text-slate-500 group-hover:text-slate-300")} />
            {!compact && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (compact: boolean) => (
    <Link href="/" className={cn("flex h-16 items-center gap-3 border-b border-white/[0.06] px-5", compact && "justify-center px-0")}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 text-sm font-bold text-white shadow-glow">
        DA
      </div>
      {!compact && <span className="truncate font-semibold text-white">{companyName}</span>}
    </Link>
  );

  const footer = (compact: boolean, withCollapse: boolean) => (
    <div className="border-t border-white/[0.06] px-3 py-3">
      {withCollapse && (
        <button onClick={toggleCollapsed} className={cn("btn-ghost w-full justify-start", compact && "justify-center px-0")} title={compact ? "Déplier" : undefined}>
          {compact ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          {!compact && "Réduire le menu"}
        </button>
      )}
      <button onClick={logout} className={cn("btn-ghost w-full justify-start", compact && "justify-center px-0")} title={compact ? "Déconnexion" : undefined}>
        <LogOut className="h-[18px] w-[18px]" />
        {!compact && "Déconnexion"}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Barre latérale (bureau) */}
      <aside
        className={cn(
          "no-print sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-ink-900 transition-[width] lg:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        {brand(collapsed)}
        {nav(collapsed)}
        {footer(collapsed, true)}
      </aside>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-white/[0.06] bg-ink-900">
            <button className="btn-ghost absolute right-2 top-3" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu">
              <X className="h-5 w-5" />
            </button>
            {brand(false)}
            {nav(false)}
            {footer(false, false)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-ink-950/80 px-4 backdrop-blur sm:px-6">
          <button className="btn-ghost -ml-2 px-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="truncate text-lg font-semibold text-white">{current?.label ?? "CRM"}</h1>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/devis/nouveau" className="btn-secondary hidden sm:inline-flex">
              <Plus className="h-4 w-4" /> Nouveau devis
            </Link>
            <Link href="/parametres" className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/[0.04]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-xs font-semibold text-white">
                {userName.slice(0, 1).toUpperCase() || "?"}
              </span>
              <span className="hidden text-sm text-slate-300 md:inline">{userName}</span>
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
