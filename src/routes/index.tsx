import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Avatar, Chip, Empty, Field, inputCls, Panel, selectCls } from "@/components/kit";
import {
  NovaTarefaDialog,
  prazoInfo,
  TarefaDialog,
  useAcoesTarefa,
} from "@/components/TarefaDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ocorrencias, tipoTone } from "@/lib/agenda";
import {
  agoraCarimbo,
  diasAte,
  fmtDM,
  parseISO,
  HOJE,
  uid,
  type Intimacao,
  type Tarefa,
} from "@/lib/data";
import { usePendencias } from "@/lib/pendencias";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
 
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Gestão Jurídica" },
      {
        name: "description",
        content: "Resumo do escritório: tarefas, agenda, audiências, pendências e intimações.",
      },
    ],
  }),
  component: Dashboard,
});
 
/* ----------------------------- utilidades ----------------------------- */
 
function saudacao(hora: number) {
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}
 
const fmtAgora = (d: Date) => {
  const data = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${data} · ${hora}`;
};
 
/** Hora atual do aparelho, atualizada a cada 30s (só no navegador). */
function useAgora() {
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => {
    setAgora(new Date());
    const id = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return agora;
}
 
const coluna = (t: Tarefa) => t.coluna as string;
const concluida = (t: Tarefa) => coluna(t) === "Concluído";
const atrasada = (t: Tarefa) => !concluida(t) && diasAte(t.prazo) < 0;
const dois = (n: number) => String(n).padStart(2, "0");
 
type Oc = ReturnType<typeof ocorrencias>[number];
type Foco = "abertas" | "atrasadas" | "concluidas";
 
const MAX_ITENS = 5;
 
/* ------------------------------- página ------------------------------- */
 
function Dashboard() {
  const { usuario, usuarios, tarefas, eventos, processos, clientes } = useApp();
  const [quem, setQuem] = useState<string>("minhas");
  const [foco, setFoco] = useState<Foco>("abertas");
  const [tarefaAberta, setTarefaAberta] = useState<string | null>(null);
  const [criarTarefa, setCriarTarefa] = useState(false);
 
  const agora = useAgora();
  const primeiroNome = usuario.split(" ")[0];
 
  const base = useMemo(() => {
    if (quem === "todos") return tarefas;
    const nome = quem === "minhas" ? usuario : quem;
    return tarefas.filter((t) => t.responsavel === nome);
  }, [tarefas, quem, usuario]);
 
  const nAtrasadas = base.filter(atrasada).length;
  const nConcluidas = base.filter(concluida).length;
  const processosAtivos = processos.filter((p) => p.status !== "Arquivado").length;
 
  // Próximos compromissos (45 dias), em ordem de data e hora.
  const proximos = useMemo(() => {
    const ini = parseISO(HOJE);
    const fim = new Date(ini.getTime() + 45 * 86_400_000);
    return ocorrencias(eventos, ini, fim).sort(
      (a, b) => a.data.localeCompare(b.data) || a.evento.hora.localeCompare(b.evento.hora),
    );
  }, [eventos]);
  const audiencias = proximos.filter((o) => (o.evento.tipo as string) === "Audiência");
  const agenda = proximos.filter((o) => (o.evento.tipo as string) !== "Audiência");
 
  return (
    <AppShell
      title={agora ? `${saudacao(agora.getHours())}, ${primeiroNome}` : `Olá, ${primeiroNome}`}
      subtitle={agora ? fmtAgora(agora) : ""}
    >
      <div className="space-y-4 sm:space-y-5">
        {/* Topo: filtro + indicadores à esquerda, calendário pequeno à direita */}
        <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_200px]">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="filtro-quem" className="text-xs font-medium text-muted-foreground">
                Filtro
              </label>
              <select
                id="filtro-quem"
                className={cn(selectCls, "h-9 w-auto min-w-0 max-w-full text-sm")}
                value={quem}
                onChange={(e) => setQuem(e.target.value)}
              >
                <option value="minhas">Minhas tarefas</option>
                <option value="todos">Toda a equipe</option>
                {usuarios
                  .filter((u) => u.nome !== usuario)
                  .map((u) => (
                    <option key={u.nome} value={u.nome}>
                      {u.nome}
                    </option>
                  ))}
              </select>
              <Button size="sm" className="ml-auto h-9" onClick={() => setCriarTarefa(true)}>
                <Plus className="size-4" /> Nova tarefa
              </Button>
            </div>
 
            <section className="grid grid-cols-2 gap-3">
              <Kpi
                icon={Briefcase}
                label="Processos em andamento"
                valor={String(processosAtivos)}
                cor="primary"
                to="/processos"
              />
              <Kpi
                icon={Users}
                label="Clientes cadastrados"
                valor={String(clientes.length)}
                cor="primary"
                to="/clientes"
              />
              <Kpi
                icon={AlertTriangle}
                label="Tarefas atrasadas"
                valor={String(nAtrasadas)}
                cor="critical"
                ativo={foco === "atrasadas"}
                onClick={() => setFoco(foco === "atrasadas" ? "abertas" : "atrasadas")}
              />
              <Kpi
                icon={CheckCircle2}
                label="Tarefas concluídas"
                valor={String(nConcluidas)}
                cor="success"
                ativo={foco === "concluidas"}
                onClick={() => setFoco(foco === "concluidas" ? "abertas" : "concluidas")}
              />
            </section>
          </div>
 
          <aside className="min-w-0">
            <MiniCalendario />
          </aside>
        </div>
 
        {/* Três quadrados: tarefas, agenda e audiências */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <PainelTarefas
            base={base}
            foco={foco}
            setFoco={setFoco}
            onAbrir={setTarefaAberta}
          />
          <PainelEventos
            titulo="Agenda"
            destino="/agenda"
            lista={agenda}
            vazio="Nenhum compromisso próximo."
          />
          <div className="md:col-span-2 xl:col-span-1">
            <PainelEventos
              titulo="Audiências"
              destino="/audiencias"
              lista={audiencias}
              vazio="Nenhuma audiência marcada."
            />
          </div>
        </section>
 
        <BlocoInferior quem={quem} onEscolher={setQuem} />
      </div>
 
      <TarefaDialog tarefaId={tarefaAberta} onOpenChange={(o) => !o && setTarefaAberta(null)} />
      <NovaTarefaDialog open={criarTarefa} onOpenChange={setCriarTarefa} />
    </AppShell>
  );
}
 
/* ------------------------------ indicadores ------------------------------ */
 
const corKpi = {
  warning: { borda: "border-[var(--warning)]", icone: "text-[var(--warning)]" },
  primary: { borda: "border-primary", icone: "text-primary" },
  critical: { borda: "border-[var(--critical)]", icone: "text-[var(--critical)]" },
  success: { borda: "border-[var(--success)]", icone: "text-[var(--success)]" },
} as const;
 
function Kpi({
  icon: Icon,
  label,
  valor,
  cor,
  ativo,
  onClick,
  to,
}: {
  icon: LucideIcon;
  label: string;
  valor: string;
  cor: keyof typeof corKpi;
  ativo?: boolean | undefined;
  onClick?: (() => void) | undefined;
  to?: string | undefined;
}) {
  const c = corKpi[cor];
  const cls = cn(
    "glass-panel flex w-full min-w-0 items-center gap-3 rounded-2xl border-2 p-3 text-left transition sm:p-4",
    c.borda,
    (onClick || to) && "hover:-translate-y-0.5",
    ativo && "ring-2 ring-current ring-offset-2 ring-offset-background",
    ativo && c.icone,
  );
  const conteudo = (
    <>
      <Icon className={cn("size-7 shrink-0 sm:size-8", c.icone)} />
      <span className="min-w-0 text-foreground">
        <span className="block truncate text-xs text-muted-foreground">{label}</span>
        <span className="block text-xl font-bold leading-tight tracking-tight sm:text-2xl">
          {valor}
        </span>
      </span>
    </>
  );
 
  if (to) {
    return (
      <Link to={to} className={cls}>
        {conteudo}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button onClick={onClick} className={cls}>
        {conteudo}
      </button>
    );
  }
  return <div className={cls}>{conteudo}</div>;
}
 
/* ------------------------------ quadrado: tarefas ------------------------------ */
 
const FILTROS: { id: Foco; label: string }[] = [
  { id: "abertas", label: "Em aberto" },
  { id: "atrasadas", label: "Atrasadas" },
  { id: "concluidas", label: "Concluídas" },
];
 
function PainelTarefas({
  base,
  foco,
  setFoco,
  onAbrir,
}: {
  base: Tarefa[];
  foco: Foco;
  setFoco: (f: Foco) => void;
  onAbrir: (id: string) => void;
}) {
  const { alternarConclusao } = useAcoesTarefa();
 
  const lista = base
    .filter((t) =>
      foco === "atrasadas" ? atrasada(t) : foco === "concluidas" ? concluida(t) : !concluida(t),
    )
    .sort((a, b) => Number(atrasada(b)) - Number(atrasada(a)) || a.prazo.localeCompare(b.prazo));
 
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          Tarefas
          <span className="text-[11px] font-normal text-muted-foreground">{lista.length}</span>
        </span>
      }
      action={
        <Link
          to="/tarefas"
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          Ver tudo →
        </Link>
      }
      delay={80}
    >
      <div className="flex flex-wrap gap-1.5 px-3 pt-3">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFoco(f.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              foco === f.id
                ? "border-primary bg-[var(--brand-soft)] text-[var(--brand-soft-foreground)]"
                : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
 
      <div className="mt-2 divide-y divide-border">
        {lista.length === 0 && <Empty>Nada por aqui.</Empty>}
        {lista.slice(0, MAX_ITENS).map((t) => {
          const feita = concluida(t);
          const p = prazoInfo(t);
          return (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50">
              <Avatar nome={t.responsavel} />
              <button onClick={() => onAbrir(t.id)} className="min-w-0 flex-1 text-left">
                <span
                  className={cn(
                    "block truncate text-sm",
                    feita ? "text-muted-foreground line-through" : "font-medium",
                  )}
                >
                  {t.titulo}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {t.vinculo}
                </span>
              </button>
              {!feita && (
                <Chip tone={p.tone} className="hidden shrink-0 sm:inline-flex">
                  {p.label}
                </Chip>
              )}
              <button
                aria-label={feita ? "Reabrir tarefa" : "Concluir tarefa"}
                onClick={() => alternarConclusao(t)}
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border-2",
                  feita
                    ? "border-[var(--success)] bg-[var(--success)]"
                    : "border-muted-foreground/50 hover:border-[var(--success)]",
                )}
              >
                {feita && <Check className="size-3 text-background" strokeWidth={4} />}
              </button>
            </div>
          );
        })}
      </div>
      {lista.length > MAX_ITENS && (
        <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          + {lista.length - MAX_ITENS} tarefa{lista.length - MAX_ITENS > 1 ? "s" : ""} em "Ver
          tudo".
        </p>
      )}
    </Panel>
  );
}
 
/* ------------------------ quadrados: agenda e audiências ------------------------ */
 
function PainelEventos({
  titulo,
  destino,
  lista,
  vazio,
}: {
  titulo: string;
  destino: string;
  lista: Oc[];
  vazio: string;
}) {
  const navigate = useNavigate();
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          {titulo}
          <span className="text-[11px] font-normal text-muted-foreground">{lista.length}</span>
        </span>
      }
      action={
        <Link
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          to={destino as any}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          Ver tudo →
        </Link>
      }
      delay={100}
    >
      <div className="divide-y divide-border">
        {lista.length === 0 && <Empty>{vazio}</Empty>}
        {lista.slice(0, MAX_ITENS).map(({ evento: e, data }) => {
          const d = diasAte(data);
          const tone = tipoTone[e.tipo];
          return (
            <button
              key={e.id + data}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => navigate({ to: destino as any })}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/50"
            >
              <div
                className={cn(
                  "w-12 shrink-0 rounded-lg py-1.5 text-center font-mono text-[11px] leading-tight",
                  tone.bg,
                  tone.text,
                )}
              >
                {fmtDM(data)}
                <br />
                {e.hora}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium leading-tight">{e.titulo}</div>
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {e.local} · {e.advogado}
                </div>
              </div>
              <Chip
                tone={d <= 0 ? "critical" : d === 1 ? "warning" : "neutral"}
                className="hidden shrink-0 sm:inline-flex"
              >
                {d <= 0 ? "Hoje" : d === 1 ? "Amanhã" : `${d} dias`}
              </Chip>
            </button>
          );
        })}
      </div>
      {lista.length > MAX_ITENS && (
        <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          + {lista.length - MAX_ITENS} em "Ver tudo".
        </p>
      )}
    </Panel>
  );
}
 
/* ------------------------------ mini calendário ------------------------------ */
 
const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const pontoTipo: Record<string, string> = {
  Audiência: "bg-[var(--critical)]",
  Prazo: "bg-[var(--warning)]",
  Reunião: "bg-primary",
};
 
function MiniCalendario() {
  const { eventos } = useApp();
  const navigate = useNavigate();
  const hoje = parseISO(HOJE);
  const [mes, setMes] = useState({ a: hoje.getFullYear(), m: hoje.getMonth() });
  const [sel, setSel] = useState<string>(HOJE.slice(0, 10));
 
  const primeiro = new Date(mes.a, mes.m, 1);
  const ultimo = new Date(mes.a, mes.m + 1, 0);
  const iso = (d: number) => `${mes.a}-${dois(mes.m + 1)}-${dois(d)}`;
 
  const ocs = useMemo(
    () => ocorrencias(eventos, primeiro, ultimo),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventos, mes.a, mes.m],
  );
 
  const porDia = new Map<string, typeof ocs>();
  ocs.forEach((o) => {
    const k = o.data.slice(0, 10);
    porDia.set(k, [...(porDia.get(k) ?? []), o]);
  });
 
  const celulas: (number | null)[] = [
    ...Array<null>(primeiro.getDay()).fill(null),
    ...Array.from({ length: ultimo.getDate() }, (_, i) => i + 1),
  ];
 
  const doDia = porDia.get(sel) ?? [];
  const nomeMes = primeiro.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
 
  const mudarMes = (delta: number) => {
    const d = new Date(mes.a, mes.m + delta, 1);
    setMes({ a: d.getFullYear(), m: d.getMonth() });
  };
 
  return (
    <Panel
      title={<span className="text-sm capitalize">{nomeMes}</span>}
      action={
        <>
          <button
            aria-label="Mês anterior"
            onClick={() => mudarMes(-1)}
            className="rounded p-1 hover:bg-accent"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            aria-label="Próximo mês"
            onClick={() => mudarMes(1)}
            className="rounded p-1 hover:bg-accent"
          >
            <ChevronRight className="size-4" />
          </button>
        </>
      }
      delay={60}
    >
      <div className="p-2.5">
        <div className="grid grid-cols-7 gap-y-0.5 text-center text-[10px] text-muted-foreground">
          {DIAS_SEMANA.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
          {celulas.map((d, i) => {
            if (d === null) return <span key={i} />;
            const k = iso(d);
            const eventosDia = porDia.get(k);
            const ehHoje = k === HOJE.slice(0, 10);
            return (
              <button
                key={i}
                onClick={() => setSel(k)}
                aria-label={`Dia ${d}`}
                className={cn(
                  "relative mx-auto grid size-7 place-items-center rounded-full text-[11px] transition-colors",
                  k === sel
                    ? "bg-primary text-primary-foreground"
                    : ehHoje
                      ? "bg-[var(--brand-soft)] font-semibold text-[var(--brand-soft-foreground)]"
                      : "text-foreground hover:bg-accent",
                )}
              >
                {d}
                {eventosDia && (
                  <span
                    className={cn(
                      "absolute bottom-0.5 size-1 rounded-full",
                      k === sel
                        ? "bg-primary-foreground"
                        : (pontoTipo[eventosDia[0]!.evento.tipo as string] ?? "bg-primary"),
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
 
        <div className="mt-2.5 space-y-0.5 border-t border-border pt-2.5">
          {doDia.length === 0 && (
            <p className="px-1 text-[11px] text-muted-foreground">Nada marcado neste dia.</p>
          )}
          {doDia.slice(0, 3).map(({ evento: e, data }) => (
            <button
              key={e.id + data}
              onClick={() => navigate({ to: "/agenda" })}
              className="flex w-full items-start gap-2 rounded-md p-1 text-left hover:bg-accent"
            >
              <span
                className={cn(
                  "mt-1.5 size-1.5 shrink-0 rounded-full",
                  pontoTipo[e.tipo as string] ?? "bg-primary",
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{e.titulo}</span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {e.hora} · {e.tipo}
                </span>
              </span>
            </button>
          ))}
          {doDia.length > 3 && (
            <Link
              to="/agenda"
              className="block px-1 pt-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              + {doDia.length - 3} no dia →
            </Link>
          )}
        </div>
      </div>
    </Panel>
  );
}
 
/* ---------------- pendências, intimações e equipe (abas) ---------------- */
 
type AbaInferior = "pendencias" | "intimacoes" | "equipe";
 
function BlocoInferior({ quem, onEscolher }: { quem: string; onEscolher: (n: string) => void }) {
  const pendencias = usePendencias();
  const { intimacoes } = useApp();
  const [aba, setAba] = useState<AbaInferior>("pendencias");
  const intimPend = intimacoes.filter((i) => !i.concluida).length;
 
  const abas: { id: AbaInferior; label: string; n?: number }[] = [
    { id: "pendencias", label: "Pendências", n: pendencias.length },
    { id: "intimacoes", label: "Intimações", n: intimPend },
    { id: "equipe", label: "Equipe" },
  ];
 
  return (
    <section>
      <div className="mb-3 flex w-fit gap-1 rounded-lg bg-accent p-0.5 text-xs font-medium">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
              aba === a.id ? "glass-soft text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {a.label}
            {a.n !== undefined && a.n > 0 && (
              <span className="rounded bg-[var(--warning-soft)] px-1.5 text-[10px] text-[var(--warning)]">
                {a.n}
              </span>
            )}
          </button>
        ))}
      </div>
      {aba === "pendencias" && <Pendencias />}
      {aba === "intimacoes" && <Intimacoes />}
      {aba === "equipe" && <ResumoEquipe quem={quem} onEscolher={onEscolher} />}
    </section>
  );
}
 
const nivelTone = { critico: "critical", atencao: "warning", info: "brand" } as const;
const nivelLabel = { critico: "Urgente", atencao: "Atenção", info: "Aviso" } as const;
 
function Pendencias() {
  const pendencias = usePendencias();
  const navigate = useNavigate();
  return (
    <Panel title="Pendências que precisam de atenção" delay={0}>
      {pendencias.length === 0 ? (
        <Empty>Tudo em dia. Nenhuma pendência para você.</Empty>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-y-0">
          {pendencias.slice(0, 6).map((p, i) => (
            <button
              key={p.id}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => navigate({ to: p.to as any, params: p.params as any })}
              className={cn(
                "flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent md:border-b md:border-border",
                i % 2 === 0 && "md:border-r",
              )}
            >
              <Chip tone={nivelTone[p.nivel]} className="mt-0.5 w-16 shrink-0 justify-center">
                {nivelLabel[p.nivel]}
              </Chip>
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-tight">{p.titulo}</span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {p.detalhe}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}
 
function ResumoEquipe({ quem, onEscolher }: { quem: string; onEscolher: (n: string) => void }) {
  const { tarefas, usuarios } = useApp();
  const dados = usuarios.map((u) => {
    const dele = tarefas.filter((t) => t.responsavel === u.nome);
    return {
      nome: u.nome,
      abertas: dele.filter((t) => !concluida(t)).length,
      atrasadas: dele.filter(atrasada).length,
      concluidas: dele.filter(concluida).length,
    };
  });
 
  return (
    <Panel title="Resumo da equipe" delay={0}>
      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
        {dados.map((d) => (
          <button
            key={d.nome}
            onClick={() => onEscolher(quem === d.nome ? "minhas" : d.nome)}
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-accent",
              quem === d.nome && "border-primary bg-[var(--brand-soft)]",
            )}
          >
            <Avatar nome={d.nome} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{d.nome}</span>
              <span className="block text-[11px] text-muted-foreground">
                {d.abertas} em aberto
              </span>
              <span
                className={cn(
                  "block text-[11px]",
                  d.atrasadas ? "text-[var(--critical)]" : "text-muted-foreground",
                )}
              >
                {d.atrasadas} atrasada{d.atrasadas === 1 ? "" : "s"}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {d.concluidas} concluída{d.concluidas === 1 ? "" : "s"}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}
 
/* ------------------------------- intimações ------------------------------- */
 
function Intimacoes() {
  const { intimacoes, setIntimacoes, processos, registrar } = useApp();
  const [editando, setEditando] = useState<Intimacao | null>(null);
  const [criando, setCriando] = useState(false);
  const [apagando, setApagando] = useState<Intimacao | null>(null);
 
  const alternarConclusao = (i: Intimacao) => {
    const concluir = !i.concluida;
    setIntimacoes((prev) =>
      prev.map((x) => (x.id === i.id ? { ...x, concluida: concluir, lida: true } : x)),
    );
    registrar(
      "Editou",
      "Intimações",
      `${concluir ? "Concluiu" : "Reabriu"} a intimação do processo ${i.processo}`,
    );
    toast.success(concluir ? "Intimação concluída" : "Intimação reaberta");
  };
 
  const apagar = (i: Intimacao) => {
    const indice = intimacoes.findIndex((x) => x.id === i.id);
    setIntimacoes((prev) => prev.filter((x) => x.id !== i.id));
    registrar("Excluiu", "Intimações", `Apagou a intimação do processo ${i.processo}`);
    toast.success("Intimação apagada", {
      action: {
        label: "Desfazer",
        onClick: () =>
          setIntimacoes((prev) => {
            if (prev.some((x) => x.id === i.id)) return prev;
            const copia = [...prev];
            copia.splice(Math.max(0, indice), 0, i);
            return copia;
          }),
      },
    });
  };
 
  const nova = () => {
    const { dataCurta, hora } = agoraCarimbo();
    setCriando(true);
    setEditando({
      id: uid(),
      processo: processos[0]?.numero ?? "",
      resumo: "",
      recebida: `${dataCurta} às ${hora}`,
      prazoDias: 5,
      lida: false,
    });
  };
 
  const salvar = (i: Intimacao) => {
    if (criando) {
      setIntimacoes((prev) => [i, ...prev]);
      registrar("Criou", "Intimações", `Cadastrou intimação do processo ${i.processo}`);
      toast.success("Intimação adicionada");
    } else {
      setIntimacoes((prev) => prev.map((x) => (x.id === i.id ? i : x)));
      registrar("Editou", "Intimações", `Editou a intimação do processo ${i.processo}`);
      toast.success("Intimação atualizada");
    }
    setEditando(null);
    setCriando(false);
  };
 
  return (
    <Panel
      title="Novas intimações"
      action={
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={nova}>
          <Plus className="size-3.5" /> Nova
        </Button>
      }
      delay={0}
    >
      <div className="max-h-[420px] divide-y divide-border overflow-y-auto">
        {intimacoes.length === 0 && <Empty>Nenhuma intimação.</Empty>}
        {[...intimacoes]
          .sort((a, b) => Number(!!a.concluida) - Number(!!b.concluida))
          .map((i) => (
            <div
              key={i.id}
              className={cn("px-4 py-3", !i.lida && !i.concluida && "bg-[var(--warning-soft)]/40")}
            >
              <div className="flex items-center gap-2">
                {!i.lida && !i.concluida && (
                  <span className="size-2 shrink-0 rounded-full bg-[var(--warning)]" />
                )}
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {i.processo}
                </span>
                {i.concluida && <Chip tone="success">Concluída</Chip>}
                <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                  {i.recebida}
                </span>
              </div>
              <p
                className={cn("mt-1 text-sm", i.concluida && "text-muted-foreground line-through")}
              >
                {i.resumo}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={i.concluida ? "outline" : "secondary"}
                  className="h-7 text-[11px]"
                  onClick={() => alternarConclusao(i)}
                >
                  {i.concluida ? <RotateCcw className="size-3" /> : <Check className="size-3" />}
                  {i.concluida ? "Reabrir" : "Concluir"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px]"
                  onClick={() => setEditando(i)}
                >
                  <Pencil className="size-3" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] text-[var(--critical)] hover:bg-[var(--critical-soft)] hover:text-[var(--critical)]"
                  onClick={() => setApagando(i)}
                >
                  <Trash2 className="size-3" /> Apagar
                </Button>
              </div>
            </div>
          ))}
      </div>
 
      <EditarIntimacaoDialog
        intimacao={editando}
        nova={criando}
        processos={processos.map((p) => p.numero)}
        onOpenChange={(o) => {
          if (o) return;
          setEditando(null);
          setCriando(false);
        }}
        onSalvar={salvar}
      />
 
      <AlertDialog open={!!apagando} onOpenChange={(o) => !o && setApagando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar intimação?</AlertDialogTitle>
            <AlertDialogDescription>
              A intimação do processo{" "}
              <strong className="font-mono text-foreground">{apagando?.processo}</strong> será
              removida da lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--critical)] text-white hover:bg-[var(--critical)]/90"
              onClick={() => apagando && apagar(apagando)}
            >
              <Trash2 className="size-4" /> Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}
 
function EditarIntimacaoDialog({
  intimacao,
  nova,
  processos,
  onOpenChange,
  onSalvar,
}: {
  intimacao: Intimacao | null;
  nova: boolean;
  processos: string[];
  onOpenChange: (open: boolean) => void;
  onSalvar: (i: Intimacao) => void;
}) {
  const [f, setF] = useState<Intimacao | null>(intimacao);
  useEffect(() => setF(intimacao), [intimacao]);
 
  // Garante que o processo atual apareça na lista mesmo se não estiver cadastrado.
  const opcoes = f && !processos.includes(f.processo) ? [f.processo, ...processos] : processos;
 
  return (
    <Dialog open={!!intimacao} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{nova ? "Nova intimação" : "Editar intimação"}</DialogTitle>
          <DialogDescription>
            {nova
              ? "Informe o processo, o resumo e o prazo da intimação."
              : "Ajuste o processo, o resumo ou o prazo."}
          </DialogDescription>
        </DialogHeader>
        {f && (
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!f.resumo.trim()) {
                toast.error("Informe o resumo da intimação");
                return;
              }
              onSalvar({ ...f, resumo: f.resumo.trim() });
            }}
          >
            <Field label="Processo">
              <select
                className={selectCls}
                value={f.processo}
                onChange={(e) => setF({ ...f, processo: e.target.value })}
              >
                {opcoes.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Resumo">
              <textarea
                rows={3}
                className={cn(inputCls, "h-auto py-2")}
                value={f.resumo}
                onChange={(e) => setF({ ...f, resumo: e.target.value })}
              />
            </Field>
            <Field label="Prazo (dias)">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={f.prazoDias}
                onChange={(e) => setF({ ...f, prazoDias: Math.max(0, Number(e.target.value)) })}
              />
            </Field>
            <DialogFooter className="mt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">{nova ? "Adicionar" : "Salvar"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
 