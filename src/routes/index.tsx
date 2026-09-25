import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { clientes, eventos, processos } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de Prazos — Vértice Gestão Jurídica" },
      {
        name: "description",
        content:
          "Painel diário do escritório: processos ativos, tarefas pendentes, audiências e prazos próximos.",
      },
      { property: "og:title", content: "Painel de Prazos — Vértice" },
      {
        property: "og:description",
        content: "Controle diário de produtividade, audiências e prazos da equipe.",
      },
    ],
  }),
  component: Dashboard,
});

const urgencyStyles: Record<string, { chip: string; label: string; date: string }> = {
  critico: {
    chip: "bg-[var(--critical-soft)] text-[var(--critical)]",
    label: "Crítico",
    date: "bg-[var(--critical-soft)] text-[var(--critical)]",
  },
  hoje: {
    chip: "bg-[var(--warning-soft)] text-[var(--warning)]",
    label: "Hoje",
    date: "bg-[var(--warning-soft)] text-[var(--warning)]",
  },
  proximo: {
    chip: "bg-[var(--brand-soft)] text-[var(--brand-soft-foreground)]",
    label: "Próximo",
    date: "bg-[var(--brand-soft)] text-[var(--brand-soft-foreground)]",
  },
  agendado: {
    chip: "bg-accent text-muted-foreground",
    label: "Agendado",
    date: "bg-accent text-muted-foreground",
  },
};

function Dashboard() {
  const { tarefas, setTarefas, usuario } = useApp();

  const minhas = tarefas.filter((t) => t.daSemana && t.responsavel === usuario);
  const concluidas = minhas.filter((t) => t.coluna === "Concluído").length;
  const pendentes = tarefas.filter((t) => t.coluna !== "Concluído").length;
  const ativos = processos.filter((p) => p.status === "Ativo").length;
  const criticos = eventos.filter((e) => e.urgencia === "critico" || e.urgencia === "hoje").length;

  const toggle = (id: string) =>
    setTarefas((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, coluna: t.coluna === "Concluído" ? "A Fazer" : "Concluído" }
          : t,
      ),
    );

  const cards = [
    { n: "01", label: "Processos Ativos", value: ativos, note: "+3 esta semana", tone: "text-[var(--success)]" },
    { n: "02", label: "Total de Clientes", value: clientes.length, note: "2 novos no mês", tone: "text-muted-foreground" },
    { n: "03", label: "Tarefas Pendentes", value: pendentes, note: "3 vencem hoje", tone: "text-[var(--warning)]" },
  ];

  return (
    <AppShell title="Bom dia, Dra. Helena" subtitle="terça-feira, 09 de abril · 08:12">
      <div className="space-y-5">
        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {cards.map((c, i) => (
            <div
              key={c.label}
              className="glass-panel rise rounded-2xl p-4"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">{c.label}</span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground/60">{c.n}</span>
              </div>
              <div className="mt-2 text-3xl font-bold tracking-tight">{c.value}</div>
              <div className={cn("mt-1 text-[11px] font-medium", c.tone)}>{c.note}</div>
            </div>
          ))}
          <div
            className="glass-panel rise rounded-2xl p-4 ring-1 ring-[var(--critical)]/25"
            style={{ animationDelay: "180ms" }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs text-muted-foreground">Prazos Próximos</span>
              <span className="shrink-0 font-mono text-[10px] text-[var(--critical)]">04</span>
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-[var(--critical)]">
              {criticos}
            </div>
            <div className="mt-1 text-[11px] font-medium text-[var(--critical)]">
              em 24h — atenção
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-5">
          <div
            className="glass-panel rise overflow-hidden rounded-2xl lg:col-span-3"
            style={{ animationDelay: "120ms" }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold tracking-tight">Próximas Audiências &amp; Prazos</h2>
              <Link to="/agenda" className="font-mono text-[10px] text-muted-foreground hover:text-foreground">
                CRONO
              </Link>
            </div>
            <div className="divide-y divide-border">
              {eventos.slice(0, 5).map((e) => {
                const s = urgencyStyles[e.urgencia];
                return (
                  <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                    <div
                      className={cn(
                        "size-9 shrink-0 rounded-lg py-1.5 text-center font-mono text-[11px] leading-tight",
                        s.date,
                      )}
                    >
                      {String(e.dia).padStart(2, "0")}/04
                      <br />
                      {e.hora}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium leading-tight">{e.titulo}</div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {e.local} · {e.advogado}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                        s.chip,
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="glass-panel rise overflow-hidden rounded-2xl lg:col-span-2"
            style={{ animationDelay: "180ms" }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold tracking-tight">Minhas Tarefas da Semana</h2>
              <span className="font-mono text-[10px] text-muted-foreground">
                {concluidas}/{minhas.length}
              </span>
            </div>
            <div className="space-y-1 p-2">
              {minhas.map((t) => {
                const feita = t.coluna === "Concluído";
                return (
                  <button
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                      t.prioridade === "Alta" && !feita
                        ? "bg-[var(--critical-soft)] hover:brightness-95"
                        : "hover:bg-accent",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded-full border-2",
                        feita
                          ? "border-[var(--success)] bg-[var(--success)]"
                          : "border-muted-foreground/50",
                      )}
                    >
                      {feita && <Check className="size-2.5 text-background" strokeWidth={4} />}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        feita ? "text-muted-foreground line-through" : "font-medium",
                      )}
                    >
                      {t.titulo}
                    </span>
                    {!feita && t.prioridade === "Alta" && (
                      <span className="shrink-0 font-mono text-[10px] text-[var(--critical)]">
                        hoje
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
