import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  LogOut,
  BarChart3,
  CalendarDays,
  FileSignature,
  FolderTree,
  Gavel,
  LayoutDashboard,
  ListChecks,
  Menu,
  Moon,
  Scale,
  Search,
  Settings,
  Sun,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useApp } from "@/lib/store";
import { usePendencias } from "@/lib/pendencias";
import { iniciais, PERFIS_DEMO, ROLE_LABEL, type Modulo } from "@/lib/data";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: Modulo; icon: LucideIcon };

const NAV: { grupo: string; itens: NavItem[] }[] = [
  {
    grupo: "Rotina",
    itens: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/tarefas", label: "Tarefas", icon: ListChecks },
      { to: "/agenda", label: "Agenda", icon: CalendarDays },
      { to: "/audiencias", label: "Audiências", icon: Scale },
    ],
  },
  {
    grupo: "Cadastros",
    itens: [
      { to: "/processos", label: "Processos", icon: Gavel },
      { to: "/clientes", label: "Clientes", icon: Users },
      { to: "/documentos", label: "Documentos", icon: FolderTree },
      { to: "/contratos", label: "Contratos e Peças", icon: FileSignature },
    ],
  },
  {
    grupo: "Gestão",
    itens: [
      { to: "/financeiro", label: "Financeiro", icon: Wallet },
      { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { pode, tarefas, usuario } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const minhasPendentes = tarefas.filter(
    (t) => t.coluna !== "Concluído" && t.responsavel === usuario,
  ).length;

  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4 text-sm">
      {NAV.map((g) => {
        const itens = g.itens.filter((i) => pode(i.label) !== "nenhum");
        if (!itens.length) return null;
        return (
          <div key={g.grupo}>
            <div className="mb-1 px-3 text-[11px] font-medium text-muted-foreground/70">
              {g.grupo}
            </div>
            <div className="space-y-0.5">
              {itens.map((item) => {
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
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
                    {item.label === "Tarefas" && minhasPendentes > 0 && (
                      <span
                        className={cn(
                          "ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold",
                          active
                            ? "bg-primary-foreground/20"
                            : "bg-[var(--warning-soft)] text-[var(--warning)]",
                        )}
                      >
                        {minhasPendentes}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function Brand() {
  const { identidade } = useApp();
  const [logoErro, setLogoErro] = useState(false);

  return (
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
      {!logoErro ? (
        <img
          src="/logo2.png"
          alt={`Logo ${identidade.nomeEscritorio}`}
          onError={() => setLogoErro(true)}
          className="h-9 w-auto max-w-[42px] shrink-0 object-contain drop-shadow-sm transition-all dark:brightness-0 dark:invert"
        />
      ) : (
        <div className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          {identidade.sigla}
        </div>
      )}

      <div className="flex min-w-0 flex-col justify-center">
        <span className="truncate text-xs font-bold leading-tight tracking-tight text-foreground">
          {identidade.nomeEscritorio}
        </span>
        <span className="text-[10px] font-mono tracking-wider text-muted-foreground">
          ADVOCACIA
        </span>
      </div>
    </div>
  );
}

const nivelDot = {
  critico: "bg-[var(--critical)]",
  atencao: "bg-[var(--warning)]",
  info: "bg-primary",
} as const;

function Notificacoes() {
  const pendencias = usePendencias();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const criticas = pendencias.filter((p) => p.nivel === "critico").length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Pendências"
        className="relative grid size-9 place-items-center rounded-lg bg-accent text-foreground/70 transition-colors hover:bg-accent/70"
      >
        <Bell className="size-4" />
        {pendencias.length > 0 && (
          <span
            className={cn(
              "absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white",
              criticas ? "bg-[var(--critical)]" : "bg-[var(--warning)]",
            )}
          >
            {pendencias.length}
          </span>
        )}
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-[min(92vw,380px)] p-0">
        <div className="border-b border-border px-4 py-3">
          <div className="text-sm font-semibold">Pendências</div>
          <div className="text-[11px] text-muted-foreground">
            O que precisa da sua atenção agora
          </div>
        </div>
        <div className="max-h-[60vh] divide-y divide-border overflow-y-auto">
          {pendencias.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nada pendente. Tudo em dia!
            </div>
          )}
          {pendencias.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setOpen(false);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                navigate({ to: p.to as any, params: p.params as any });
              }}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
            >
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", nivelDot[p.nivel])} />
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-tight">{p.titulo}</span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {p.detalhe}
                </span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BuscaGlobal() {
  const { clientes, processos, tarefas, documentos } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Buscar"
        className="flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-xs text-muted-foreground transition-colors hover:bg-accent/70 lg:w-56"
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden truncate whitespace-nowrap lg:inline">Buscar…</span>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Digite nome, CPF/CNPJ, nº do processo…" />
        <CommandList>
          <CommandEmpty>Nenhum resultado.</CommandEmpty>
          <CommandGroup heading="Clientes">
            {clientes.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.nome} ${c.documento}`}
                onSelect={() => go(() => navigate({ to: "/clientes/$id", params: { id: c.id } }))}
              >
                <Users className="size-4" />
                <span className="truncate">{c.nome}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {c.documento}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Processos">
            {processos.map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.numero} ${p.titulo} ${p.cliente} ${p.parteContraria}`}
                onSelect={() => go(() => navigate({ to: "/processos/$id", params: { id: p.id } }))}
              >
                <Gavel className="size-4" />
                <span className="truncate">{p.titulo}</span>
                <span className="ml-auto hidden font-mono text-[10px] text-muted-foreground sm:inline">
                  {p.numero}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Tarefas">
            {tarefas.map((t) => (
              <CommandItem
                key={t.id}
                value={`tarefa ${t.titulo} ${t.vinculo}`}
                onSelect={() => go(() => navigate({ to: "/tarefas" }))}
              >
                <ListChecks className="size-4" />
                <span className="truncate">{t.titulo}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Documentos">
            {documentos.map((d) => (
              <CommandItem
                key={d.id}
                value={`documento ${d.nome} ${d.conteudo}`}
                onSelect={() => go(() => navigate({ to: "/documentos" }))}
              >
                <FolderTree className="size-4" />
                <span className="truncate">{d.nome}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

function PerfilMenu() {
  const { usuario, role, trocarPerfil, sair, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-accent">
        <span className="grid size-8 place-items-center rounded-full bg-[var(--brand-soft)] text-xs font-semibold text-[var(--brand-soft-foreground)] ring-1 ring-primary/20">
          {iniciais(usuario)}
        </span>
        <span className="hidden text-left xl:block">
          <span className="block text-xs font-medium leading-tight">{usuario}</span>
          <span className="block text-[10px] text-muted-foreground">{ROLE_LABEL[role]}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Simular acesso como (protótipo)
        </DropdownMenuLabel>
        {PERFIS_DEMO.map((p) => (
          <DropdownMenuItem key={p.nome} onSelect={() => trocarPerfil(p.nome)} className="gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-accent text-[10px] font-semibold">
              {iniciais(p.nome)}
            </span>
            <span className="min-w-0">
              <span className="block text-sm">{p.nome}</span>
              <span className="block text-[11px] text-muted-foreground">{ROLE_LABEL[p.role]}</span>
            </span>
            {p.nome === usuario && (
              <span className="ml-auto size-2 rounded-full bg-[var(--success)]" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 sm:hidden" onSelect={toggleTheme}>
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {theme === "dark" ? "Tema claro" : "Tema escuro"}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/configuracoes">Configurações</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 text-[var(--critical)]"
          onSelect={() => {
            sair();
            navigate({ to: "/login" });
          }}
        >
          <LogOut className="size-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { theme, toggleTheme, logado } = useApp();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Sem login, as telas internas não aparecem: redireciona para /login.
  useEffect(() => {
    if (logado === false) navigate({ to: "/login" });
  }, [logado, navigate]);

  if (!logado) return <div className="min-h-dvh bg-background" />;

  return (
    <div className="min-h-dvh w-full bg-background font-sans text-foreground antialiased">
      <div className="flex min-h-dvh">
        <aside className="glass-bar sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border md:flex">
          <Brand />
          <NavList />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass-bar sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border px-3 sm:gap-3 sm:px-4 md:px-7">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-foreground/70 md:hidden">
                <Menu className="size-4" />
              </SheetTrigger>
              <SheetContent side="left" className="flex w-64 flex-col bg-popover p-0">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Brand />
                <NavList onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-none tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 hidden truncate text-xs text-muted-foreground sm:block">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              <BuscaGlobal />
              <Notificacoes />
              <button
                onClick={toggleTheme}
                aria-label="Alternar tema"
                className="hidden size-9 place-items-center rounded-lg bg-accent text-foreground/70 transition-colors hover:bg-accent/70 sm:grid"
              >
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
              <PerfilMenu />
            </div>
          </header>

          <main className="min-w-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-7">
            {actions && <div className="mb-5 flex flex-wrap items-center gap-2">{actions}</div>}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}