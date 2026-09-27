import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  Clock,
  ExternalLink,
  Gavel,
  MapPin,
  Pencil,
  Plus,
  User,
  Users,
  Video,
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EventoDialog } from "@/components/EventoDialog";
import { Avatar, Chip, Empty, NotaPrototipo, Panel, Segmented } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { DIAS_SEMANA } from "@/lib/agenda";
import { diasAte, fmtDMY, parseISO, type Evento } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/audiencias")({
  head: () => ({ meta: [{ title: "Audiências — Gestão Jurídica" }] }),
  component: AudienciasPage,
});

/** Calcula o momento de disparo de um lembrete (texto) em relação à audiência. */
function disparo(e: Evento, lembrete: string) {
  const [hh, mm] = e.hora.split(":").map(Number);
  const d = parseISO(e.data);
  d.setHours(hh ?? 0, mm ?? 0);
  const m = lembrete.match(/(\d+)\s*(min|h|dia|semana)/);
  if (lembrete === "No dia") d.setHours(7, 0);
  else if (m) {
    const n = Number(m[1]);
    const unidade = m[2];
    if (unidade === "min") d.setMinutes(d.getMinutes() - n);
    else if (unidade === "h") d.setHours(d.getHours() - n);
    else if (unidade === "dia") d.setDate(d.getDate() - n);
    else d.setDate(d.getDate() - 7 * n);
  }
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} às ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function AudienciasPage() {
  const { eventos, processos, usuario, pode } = useApp();
  const [filtro, setFiltro] = useState<"Próximas" | "Minhas" | "Realizadas">("Próximas");
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [form, setForm] = useState<{ open: boolean; editar: Evento | null }>({
    open: false,
    editar: null,
  });
  const podeEditar = pode("Audiências") === "editar";

  const todas = eventos
    .filter((e) => e.tipo === "Audiência")
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  const lista = todas.filter((e) => {
    const d = diasAte(e.data);
    if (filtro === "Realizadas") return d < 0;
    if (filtro === "Minhas") return d >= 0 && e.advogado === usuario;
    return d >= 0;
  });
  const atual = todas.find((e) => e.id === selecionada) ?? lista[0];
  const processo = atual?.processo ? processos.find((p) => p.numero === atual.processo) : undefined;

  return (
    <AppShell title="Audiências" subtitle="fichas completas e lembretes de aproximação">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Segmented
          value={filtro}
          onChange={setFiltro}
          options={["Próximas", "Minhas", "Realizadas"] as const}
        />
        {podeEditar && (
          <Button className="ml-auto" onClick={() => setForm({ open: true, editar: null })}>
            <Plus className="size-4" /> Nova audiência
          </Button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Panel
          title={`${lista.length} audiência${lista.length === 1 ? "" : "s"}`}
          className="lg:col-span-2"
        >
          <div className="divide-y divide-border">
            {lista.length === 0 && <Empty>Nenhuma audiência neste filtro.</Empty>}
            {lista.map((e) => {
              const d = diasAte(e.data);
              const ativa = atual?.id === e.id;
              const dt = parseISO(e.data);
              return (
                <button
                  key={e.id}
                  onClick={() => setSelecionada(e.id)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                    ativa ? "bg-[var(--brand-soft)]" : "hover:bg-accent",
                  )}
                >
                  <div
                    className={cn(
                      "w-12 shrink-0 rounded-lg py-1.5 text-center leading-tight",
                      d === 0
                        ? "bg-[var(--critical)] text-white"
                        : d <= 3 && d >= 0
                          ? "bg-[var(--critical-soft)] text-[var(--critical)]"
                          : "bg-accent",
                    )}
                  >
                    <div className="font-mono text-[10px] uppercase">
                      {DIAS_SEMANA[dt.getDay()]}
                    </div>
                    <div className="text-lg font-bold">{dt.getDate()}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-tight">{e.titulo}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {e.hora}
                      </span>
                      <span className="flex items-center gap-1">
                        {e.linkOnline ? (
                          <Video className="size-3" />
                        ) : (
                          <MapPin className="size-3" />
                        )}
                        {e.linkOnline ? "Online" : "Presencial"}
                      </span>
                      <span>{e.advogado}</span>
                    </div>
                  </div>
                  {d >= 0 && d <= 1 && <Chip tone="critical">{d === 0 ? "Hoje" : "Amanhã"}</Chip>}
                </button>
              );
            })}
          </div>
        </Panel>

        <div className="lg:col-span-3">
          {!atual ? (
            <Panel>
              <Empty>Selecione uma audiência.</Empty>
            </Panel>
          ) : (
            <Panel
              title="Ficha da audiência"
              action={
                podeEditar && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setForm({ open: true, editar: atual })}
                  >
                    <Pencil className="size-3.5" /> Editar
                  </Button>
                )
              }
              delay={60}
            >
              <div className="space-y-5 p-5">
                <div>
                  <h3 className="text-lg font-semibold leading-tight">{atual.titulo}</h3>
                  {atual.observacoes && (
                    <p className="mt-1 text-sm text-muted-foreground">{atual.observacoes}</p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Info icon={Calendar} label="Data">
                    {DIAS_SEMANA[parseISO(atual.data).getDay()]}, {fmtDMY(atual.data)}
                  </Info>
                  <Info icon={Clock} label="Horário">
                    {atual.hora}
                    {atual.duracaoMin > 0 && (
                      <span className="text-muted-foreground"> · {atual.duracaoMin} min</span>
                    )}
                  </Info>
                  <Info icon={MapPin} label="Local físico">
                    {atual.local}
                  </Info>
                  <Info icon={Video} label="Link (online)">
                    {atual.linkOnline ? (
                      <a
                        href={atual.linkOnline}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 break-all text-primary hover:underline"
                      >
                        {atual.linkOnline} <ExternalLink className="size-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Presencial</span>
                    )}
                  </Info>
                  <Info icon={Gavel} label="Magistrado">
                    {atual.juiz ?? "—"}
                  </Info>
                  <Info icon={User} label="Advogado responsável">
                    <span className="flex items-center gap-2">
                      <Avatar nome={atual.advogado} className="size-5 text-[8px] ring-0" />
                      {atual.advogado}
                    </span>
                  </Info>
                </div>

                <div>
                  <h4 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Vínculos
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-border p-3">
                      <div className="text-[11px] text-muted-foreground">Processo</div>
                      {processo ? (
                        <Link
                          to="/processos/$id"
                          params={{ id: processo.id }}
                          className="mt-0.5 block text-sm font-medium text-primary hover:underline"
                        >
                          {processo.numero}
                        </Link>
                      ) : (
                        <div className="mt-0.5 text-sm">—</div>
                      )}
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <div className="text-[11px] text-muted-foreground">
                        Cliente que deve comparecer
                      </div>
                      <div className="mt-0.5 text-sm font-medium">{atual.cliente ?? "—"}</div>
                    </div>
                    <div className="rounded-xl border border-border p-3 sm:col-span-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Users className="size-3.5" /> Testemunhas
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {(atual.testemunhas ?? []).length === 0 && (
                          <span className="text-sm text-muted-foreground">Nenhuma arrolada</span>
                        )}
                        {(atual.testemunhas ?? []).map((t) => (
                          <Chip key={t}>{t}</Chip>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Lembretes de aproximação
                  </h4>
                  <div className="space-y-2">
                    {atual.lembretes.map((l) => (
                      <div
                        key={l}
                        className="flex items-center gap-3 rounded-xl bg-accent/60 px-3 py-2 text-sm"
                      >
                        <Bell className="size-4 text-[var(--warning)]" />
                        <span className="font-medium">{l}</span>
                        <span className="ml-auto font-mono text-xs text-muted-foreground">
                          {disparo(atual, l)}
                        </span>
                      </div>
                    ))}
                    {atual.lembretes.length === 0 && (
                      <p className="text-sm text-muted-foreground">Sem lembretes configurados.</p>
                    )}
                  </div>
                  <div className="mt-3">
                    <NotaPrototipo>
                      Protótipo: os lembretes são exibidos aqui e no sino de pendências; o envio
                      real (notificação/e-mail) será implementado junto com o back-end.
                    </NotaPrototipo>
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>

      <EventoDialog
        open={form.open}
        onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}
        editar={form.editar}
        tipoInicial="Audiência"
      />
    </AppShell>
  );
}

function Info({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Clock;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}
