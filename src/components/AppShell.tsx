import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  FileStack,
  FolderTree,
  Gavel,
  LayoutDashboard,
  ListChecks,
  Menu,
  Moon,
  Sun,
  Users,
  Wallet,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useApp } from "@/lib/store";
import { eventos } from "@/lib/data";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/processos", label: "Processos", icon: Gavel },
  { to: "/tarefas", label: "Tarefas", icon: ListChecks },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/documentos", label: "Documentos", icon: FolderTree },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, adminOnly: true },
  { to: "/modelos", label: "Modelos", icon: FileStack },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin, tarefas } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pendentes = tarefas.filter((t) => t.coluna !== "Concluído").length;

  return (
    <nav className="space-y-0.5 px-3 py-4 text-sm">
      {NAV.filter((i) => !("adminOnly" in i && i.adminOnly) || isAdmin).map((item) => {
        const active = pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors",
              active
                ? "bg-primary font-medium text-primary-foreground shadow-sm"
                : "text-foreground/70 hover:bg-accent",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.label === "Tarefas" && pendentes > 0 && (
              <span
                className={cn(
                  "ml-auto rounded px-1.5 py-0.5 font-mono text-[10px]",
                  active
                    ? "bg-primary-foreground/20"
                    : "bg-[var(--warning-soft)] text-[var(--warning)]",
                )}
              >
                {pendentes}
              </span>
            )}
            {item.label === "Financeiro" && (
              <span
                className={cn(
                  "ml-auto font-mono text-[10px]",
                  active ? "text-primary-foreground/70" : "text-muted-foreground/60",
                )}
              >
                restrito
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
      <div className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        V
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-none tracking-tight">Vértice</div>
        <div className="mt-1 truncate font-mono text-[10px] tracking-wide text-muted-foreground">
          SOB. LACERDA &amp; VOSS
        </div>
      </div>
    </div>
  );
}

function SidebarFooterCard() {
  const proxima = eventos[0];
  return (
    <div className="mt-auto p-3">
      <div className="glass-soft rounded-xl border border-border p-3">
        <div className="text-xs font-medium">Próxima sessão</div>
        <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {String(proxima.dia).padStart(2, "0")}/04 · {proxima.hora}
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">{proxima.titulo}</div>
      </div>
    </div>
  );
}

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { role, setRole, theme, toggleTheme } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-background font-sans text-foreground antialiased">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-32 h-[420px] w-[420px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-[380px] w-[380px] rounded-full bg-[var(--brand-soft)] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="flex min-h-screen">
        <aside className="glass-bar hidden w-60 shrink-0 flex-col border-r border-border md:flex">
          <Brand />
          <NavList />
          <SidebarFooterCard />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass-bar sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border px-4 md:px-7">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-foreground/70 md:hidden">
                <Menu className="size-4" />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-popover p-0">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Brand />
                <NavList onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-none tracking-tight">
                {title}
              </h1>
              <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                {subtitle}
              </p>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-1 rounded-lg bg-accent p-0.5 text-xs font-medium sm:flex">
                <button
                  onClick={() => setRole("socio")}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 transition-colors",
                    role === "socio"
                      ? "glass-soft text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  Advogado Sócio
                </button>
                <button
                  onClick={() => setRole("colaborador")}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 transition-colors",
                    role === "colaborador"
                      ? "glass-soft text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  Colaborador
                </button>
              </div>
              <button
                onClick={() => setRole(role === "socio" ? "colaborador" : "socio")}
                className="rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-medium sm:hidden"
              >
                {role === "socio" ? "Sócio" : "Colab."}
              </button>
              <button
                onClick={toggleTheme}
                aria-label="Alternar tema"
                className="grid size-9 place-items-center rounded-lg bg-accent text-foreground/70 transition-colors hover:bg-accent/70"
              >
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
              <div className="grid size-9 place-items-center rounded-full bg-[var(--brand-soft)] text-xs font-semibold text-[var(--brand-soft-foreground)] ring-1 ring-primary/20">
                HV
              </div>
            </div>
          </header>

          <main className="p-4 md:p-7">{children}</main>
        </div>
      </div>
    </div>
  );
}
