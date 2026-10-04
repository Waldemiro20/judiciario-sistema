import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  Repeat,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EventoDialog } from "@/components/EventoDialog";
import { Avatar, Chip, Panel, Segmented } from "@/components/kit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DIAS_SEMANA, MESES, ocorrencias, tipoTone, type Ocorrencia } from "@/lib/agenda";
import { fmtDMY, HOJE, parseISO, toISO, type Evento, type TipoEvento } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Gestão Jurídica" }] }),
  component: AgendaPage,
});

type Vista = "Mês" | "Semana" | "Dia";
const HORAS = Array.from({ length: 13 }, (_, i) => i + 8); // 08h–20h

function inicioSemana(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function AgendaPage() {
  const { eventos, setEventos, usuarios, pode, registrar } = useApp();
  const [vista, setVista] = useState<Vista>("Mês");
  const [ref, setRef] = useState(parseISO(HOJE));
  const [advogado, setAdvogado] = useState("Todos");
  const [tipos, setTipos] = useState<TipoEvento[]>(["Audiência", "Reunião", "Prazo"]);
  const [detalhe, setDetalhe] = useState<Ocorrencia | null>(null);
  const [form, setForm] = useState<{ open: boolean; editar: Evento | null; data: string }>({
    open: false,
    editar: null,
    data: HOJE,
  });
  const podeEditar = pode("Agenda") === "editar";

  const [ini, fim] = useMemo(() => {
    if (vista === "Dia") return [ref, ref];
    if (vista === "Semana") {
      const s = inicioSemana(ref);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      return [s, e];
    }
    const primeiro = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const s = inicioSemana(primeiro);
    const e = new Date(s);
    e.setDate(s.getDate() + 41);
    return [s, e];
  }, [vista, ref]);

  const lista = useMemo(
    () =>
      ocorrencias(eventos, ini, fim).filter(
        (o) =>
          (advogado === "Todos" || o.evento.advogado === advogado) && tipos.includes(o.evento.tipo),
      ),
    [eventos, ini, fim, advogado, tipos],
  );

  const porDia = useMemo(() => {
    const m = new Map<string, Ocorrencia[]>();
    for (const o of lista) m.set(o.data, [...(m.get(o.data) ?? []), o]);
    return m;
  }, [lista]);

  const navegar = (delta: number) => {
    const d = new Date(ref);
    if (vista === "Mês") d.setMonth(d.getMonth() + delta);
    else if (vista === "Semana") d.setDate(d.getDate() + 7 * delta);
    else d.setDate(d.getDate() + delta);
    setRef(d);
  };

  const titulo =
    vista === "Mês"
      ? `${(MESES[ref.getMonth()] ?? "").replace(/^./, (c) => c.toUpperCase())} de ${ref.getFullYear()}`
      : vista === "Semana"
        ? `${fmtDMY(toISO(ini)).slice(0, 5)} – ${fmtDMY(toISO(fim))}`
        : `${DIAS_SEMANA[ref.getDay()]}, ${fmtDMY(toISO(ref))}`;

  const dias = Array.from(
    { length: Math.round((fim.getTime() - ini.getTime()) / 86400000) + 1 },
    (_, i) => {
      const d = new Date(ini);
      d.setDate(ini.getDate() + i);
      return d;
    },
  );

  return (
    <AppShell title="Agenda" subtitle="audiências, reuniões e prazos do escritório">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            onClick={() => navegar(-1)}
            aria-label="Anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            onClick={() => navegar(1)}
            aria-label="Próximo"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setRef(parseISO(HOJE))}
          >
            Hoje
          </Button>
        </div>
        <h2 className="min-w-0 px-1 text-base font-semibold">{titulo}</h2>
        <Segmented
          className="ml-auto"
          value={vista}
          onChange={setVista}
          options={["Dia", "Semana", "Mês"] as const}
        />
        {podeEditar && (
          <Button onClick={() => setForm({ open: true, editar: null, data: toISO(ref) })}>
            <Plus className="size-4" /> Novo compromisso
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-accent p-0.5 text-xs font-medium">
          {["Todos", ...usuarios.map((u) => u.nome)].map((n) => (
            <button
              key={n}
              onClick={() => setAdvogado(n)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 transition-colors",
                advogado === n
                  ? "glass-soft text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {n !== "Todos" && <Avatar nome={n} className="size-5 text-[8px] ring-0" />}
              {n === "Todos" ? "Todo o escritório" : n.split(" ")[0]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs">
          {(["Audiência", "Reunião", "Prazo"] as TipoEvento[]).map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                className="accent-[var(--primary)]"
                checked={tipos.includes(t)}
                onChange={(e) =>
                  setTipos((x) => (e.target.checked ? [...x, t] : x.filter((y) => y !== t)))
                }
              />
              <span className={cn("size-2 rounded-full", tipoTone[t].dot)} />
              {t}
            </label>
          ))}
        </div>
      </div>

      {vista === "Mês" && (
        <Panel bodyClassName="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-7 border-b border-border">
              {DIAS_SEMANA.map((d) => (
                <div
                  key={d}
                  className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {dias.map((d, i) => {
                const iso = toISO(d);
                const doMes = d.getMonth() === ref.getMonth();
                const itens = porDia.get(iso) ?? [];
                return (
                  <div
                    key={iso}
                    onDoubleClick={() =>
                      podeEditar && setForm({ open: true, editar: null, data: iso })
                    }
                    className={cn(
                      "min-h-[108px] border-border p-1.5",
                      i % 7 !== 6 && "border-r",
                      i < 35 && "border-b",
                      !doMes && "bg-accent/30",
                    )}
                  >
                    <button
                      onClick={() => {
                        setRef(d);
                        setVista("Dia");
                      }}
                      className={cn(
                        "mb-1 grid size-6 place-items-center rounded-full font-mono text-[11px]",
                        iso === HOJE
                          ? "bg-primary font-bold text-primary-foreground"
                          : doMes
                            ? "hover:bg-accent"
                            : "text-muted-foreground/50",
                      )}
                    >
                      {d.getDate()}
                    </button>
                    <div className="space-y-0.5">
                      {itens.slice(0, 3).map((o) => (
                        <button
                          key={o.evento.id + o.data}
                          onClick={() => setDetalhe(o)}
                          className={cn(
                            "flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium",
                            tipoTone[o.evento.tipo].bg,
                            tipoTone[o.evento.tipo].text,
                          )}
                        >
                          <span className="shrink-0 font-mono">{o.evento.hora}</span>
                          <span className="truncate">{o.evento.titulo}</span>
                        </button>
                      ))}
                      {itens.length > 3 && (
                        <button
                          onClick={() => {
                            setRef(d);
                            setVista("Dia");
                          }}
                          className="px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          +{itens.length - 3} mais
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      )}

      {vista !== "Mês" && (
        <Panel bodyClassName="overflow-x-auto">
          <div className={cn(vista === "Semana" && "min-w-[820px]")}>
            <div
              className={cn(
                "grid border-b border-border",
                vista === "Semana" ? "grid-cols-[56px_repeat(7,1fr)]" : "grid-cols-[56px_1fr]",
              )}
            >
              <div />
              {dias.map((d) => (
                <div key={toISO(d)} className="border-l border-border px-2 py-2 text-center">
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">
                    {DIAS_SEMANA[d.getDay()]}
                  </div>
                  <div
                    className={cn(
                      "mx-auto mt-0.5 grid size-7 place-items-center rounded-full text-sm font-semibold",
                      toISO(d) === HOJE && "bg-primary text-primary-foreground",
                    )}
                  >
                    {d.getDate()}
                  </div>
                </div>
              ))}
            </div>
            <div
              className={cn(
                "relative grid",
                vista === "Semana" ? "grid-cols-[56px_repeat(7,1fr)]" : "grid-cols-[56px_1fr]",
              )}
            >
              <div>
                {HORAS.map((hh) => (
                  <div
                    key={hh}
                    className="h-14 pr-2 pt-0.5 text-right font-mono text-[10px] text-muted-foreground"
                  >
                    {String(hh).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
              {dias.map((d) => {
                const iso = toISO(d);
                const itens = porDia.get(iso) ?? [];
                return (
                  <div key={iso} className="relative border-l border-border">
                    {HORAS.map((hh) => (
                      <div
                        key={hh}
                        onDoubleClick={() =>
                          podeEditar && setForm({ open: true, editar: null, data: iso })
                        }
                        className="h-14 border-b border-border/60"
                      />
                    ))}
                    {itens.map((o) => {
                      const [hs, ms] = o.evento.hora.split(":").map(Number);
                      const top = Math.max(0, ((hs ?? 8) - 8) * 56 + ((ms ?? 0) / 60) * 56);
                      const altura = Math.max(
                        26,
                        (Math.max(o.evento.duracaoMin, 30) / 60) * 56 - 2,
                      );
                      const t = tipoTone[o.evento.tipo];
                      return (
                        <button
                          key={o.evento.id}
                          onClick={() => setDetalhe(o)}
                          style={{ top: Math.min(top, HORAS.length * 56 - altura), height: altura }}
                          className={cn(
                            "absolute inset-x-1 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] shadow-sm",
                            t.bg,
                            t.text,
                            o.evento.tipo === "Audiência"
                              ? "border-[var(--critical)]"
                              : o.evento.tipo === "Prazo"
                                ? "border-[var(--warning)]"
                                : "border-primary",
                          )}
                        >
                          <div className="font-mono text-[10px]">{o.evento.hora}</div>
                          <div className="truncate font-semibold">{o.evento.titulo}</div>
                          {vista === "Dia" && (
                            <div className="truncate opacity-80">
                              {o.evento.local} · {o.evento.advogado}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        Dica: dê dois cliques em um dia para criar um compromisso. Clique no número do dia para
        abrir a visão diária.
      </p>

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        {detalhe && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Chip
                  tone={
                    detalhe.evento.tipo === "Audiência"
                      ? "critical"
                      : detalhe.evento.tipo === "Prazo"
                        ? "warning"
                        : "brand"
                  }
                >
                  {detalhe.evento.tipo}
                </Chip>
                {detalhe.evento.recorrencia !== "Não repete" && (
                  <Chip>
                    <Repeat className="size-3" /> {detalhe.evento.recorrencia}
                  </Chip>
                )}
              </div>
              <DialogTitle className="text-left">{detalhe.evento.titulo}</DialogTitle>
              <DialogDescription className="text-left font-mono text-xs">
                {fmtDMY(detalhe.data)} · {detalhe.evento.hora}
                {detalhe.evento.duracaoMin > 0 && ` · ${detalhe.evento.duracaoMin} min`}
              </DialogDescription>
            </DialogHeader>
            <dl className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{detalhe.evento.local}</span>
              </div>
              {detalhe.evento.linkOnline && (
                <div className="flex items-start gap-2">
                  <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="break-all text-primary">{detalhe.evento.linkOnline}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Avatar nome={detalhe.evento.advogado} className="size-5 text-[8px] ring-0" />
                <span>{detalhe.evento.advogado}</span>
              </div>
              {detalhe.evento.juiz && (
                <div className="text-muted-foreground">Magistrado: {detalhe.evento.juiz}</div>
              )}
              {detalhe.evento.processo && (
                <div className="font-mono text-xs text-muted-foreground">
                  Processo {detalhe.evento.processo}
                </div>
              )}
              <div className="flex items-start gap-2">
                <Bell className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {detalhe.evento.lembretes.join(" · ") || "Sem lembretes"}
                </span>
              </div>
            </dl>
            {podeEditar && (
              <DialogFooter className="gap-2">
                <Button
                  variant="ghost"
                  className="text-[var(--critical)]"
                  onClick={() => {
                    setEventos((prev) => prev.filter((e) => e.id !== detalhe.evento.id));
                    registrar("Excluiu", "Agenda", `Excluiu "${detalhe.evento.titulo}"`);
                    toast.success("Compromisso excluído");
                    setDetalhe(null);
                  }}
                >
                  <Trash2 className="size-4" /> Excluir
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setForm({ open: true, editar: detalhe.evento, data: detalhe.data });
                    setDetalhe(null);
                  }}
                >
                  <Pencil className="size-4" /> Editar
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>

      <EventoDialog
        open={form.open}
        onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}
        editar={form.editar}
        tipoInicial="Reunião"
        dataInicial={form.data}
      />
    </AppShell>
  );
}
