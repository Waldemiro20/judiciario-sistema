import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FolderKanban,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Avatar, Chip, Empty, Field, inputCls, Panel, selectCls } from "@/components/kit";
import { NovaTarefaDialog, prazoInfo, TarefaDialog } from "@/components/TarefaDialog";
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
        content: "Resumo do escritório: tarefas, audiências, pendências e intimações.",
      },
    ],
  }),
  component: Dashboard,
});

/* ----------------------------- utilidades ----------------------------- */

type App = ReturnType<typeof useApp>;
type Coluna = Tarefa["coluna"];

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
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

type Oc = ReturnType<typeof ocorrencias>[number];

/* ------------------------------- filtros ------------------------------- */

type Situacao = "todas" | "atrasadas" | "concluidas";
type Periodo = "todas" | "hoje" | "7" | "30";
type Filtros = { situacao: Situacao; cliente: string; periodo: Periodo; busca: string };

const FILTROS_PADRAO: Filtros = { situacao: "todas", cliente: "todos", periodo: "todas", busca: "" };

const filtrosAtivos = (f: Filtros) =>
  f.situacao !== "todas" || f.cliente !== "todos" || f.periodo !== "todas" || f.busca.trim() !== "";

function passaFiltros(t: Tarefa, f: Filtros): boolean {
  if (f.situacao === "atrasadas" && !atrasada(t)) return false;
  if (f.situacao === "concluidas" && !concluida(t)) return false;

  if (f.cliente !== "todos" && !String(t.vinculo).toLowerCase().includes(f.cliente.toLowerCase())) {
    return false;
  }

  const d = diasAte(t.prazo);
  if (f.periodo === "hoje" && d !== 0) return false;
  if (f.periodo === "7" && (d < 0 || d > 7)) return false;
  if (f.periodo === "30" && (d < 0 || d > 30)) return false;

  const q = f.busca.trim().toLowerCase();
  if (q && !`${t.titulo} ${t.vinculo}`.toLowerCase().includes(q)) return false;

  return true;
}

const ordem = (a: Tarefa, b: Tarefa) =>
  Number(atrasada(b)) - Number(atrasada(a)) || a.prazo.localeCompare(b.prazo);

/** Leva a tela até o quadro de tarefas (usado ao clicar nos cards e na faixa "Hoje"). */
function irParaQuadro() {
  requestAnimationFrame(() =>
    document.getElementById("quadro-tarefas")?.scrollIntoView({ behavior: "smooth", block: "start" }),
  );
}

/* ------------------------------- página ------------------------------- */

const COLUNAS: {
  id: Coluna;
  titulo: string;
  dot: string;
  anterior: Coluna | null;
  proxima: Coluna | null;
}[] = [
  { id: "A Fazer", titulo: "Tarefas", dot: "bg-primary", anterior: null, proxima: "Em Andamento" },
  {
    id: "Em Andamento",
    titulo: "Desenvolvimento",
    dot: "bg-[var(--warning)]",
    anterior: "A Fazer",
    proxima: "Concluído",
  },
  {
    id: "Concluído",
    titulo: "Concluídas",
    dot: "bg-[var(--success)]",
    anterior: "Em Andamento",
    proxima: null,
  },
];

const ROTULO: Record<string, string> = {
  "A Fazer": "Tarefas",
  "Em Andamento": "Desenvolvimento",
  Concluído: "Concluídas",
};

type AbaInferior = "audiencias" | "pendencias" | "intimacoes" | "equipe";

function Dashboard() {
  const {
    usuario,
    usuarios,
    tarefas,
    setTarefas,
    eventos,
    processos,
    clientes,
    intimacoes,
    isAdmin,
    registrar,
  } = useApp();
  const pendencias = usePendencias();
  const [quem, setQuem] = useState<string>("todos");
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_PADRAO);
  const [aba, setAba] = useState<AbaInferior>("audiencias");
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [tarefaAberta, setTarefaAberta] = useState<string | null>(null);
  const [criarTarefa, setCriarTarefa] = useState(false);

  const agora = useAgora();
  const primeiroNome = usuario.split(" ")[0];

  // Só o administrador enxerga a equipe toda; os demais veem as próprias tarefas.
  const escopo = isAdmin ? quem : "minhas";

  const base = useMemo(() => {
    if (escopo === "todos") return tarefas;
    const nome = escopo === "minhas" ? usuario : escopo;
    return tarefas.filter((t) => t.responsavel === nome);
  }, [tarefas, escopo, usuario]);

  const nAtrasadas = base.filter(atrasada).length;
  const nConcluidas = base.filter(concluida).length;
  const nVencemHoje = base.filter((t) => !concluida(t) && diasAte(t.prazo) === 0).length;
  const nProcessos = processos.filter((p) => p.status !== "Arquivado").length;
  const nClientes = clientes.length;
  const nIntimacoes = intimacoes.filter((i) => !i.concluida).length;

  const visiveis = useMemo(
    () => base.filter((t) => passaFiltros(t, filtros)).sort(ordem),
    [base, filtros],
  );

  const listaDa = (id: Coluna) =>
    visiveis.filter((t) =>
      id === "Concluído"
        ? concluida(t)
        : id === "Em Andamento"
          ? coluna(t) === "Em Andamento"
          : !concluida(t) && coluna(t) !== "Em Andamento",
    );

  const mover = (t: Tarefa, destino: Coluna) => {
    if (coluna(t) === (destino as string)) return;
    setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, coluna: destino } : x)));
    registrar("Editou", "Tarefas", `Moveu "${t.titulo}" para ${ROTULO[destino as string]}`);
    toast.success(`Movida para ${ROTULO[destino as string]}`);
  };

  const soltar = (destino: Coluna) => {
    const t = tarefas.find((x) => x.id === arrastando);
    setArrastando(null);
    setSobre(null);
    if (t) mover(t, destino);
  };

  // Próximas audiências (60 dias), em ordem de data e hora.
  const audiencias = useMemo(() => {
    const ini = parseISO(HOJE);
    const fim = new Date(ini.getTime() + 60 * 86_400_000);
    return ocorrencias(eventos, ini, fim)
      .filter((o) => (o.evento.tipo as string) === "Audiência")
      .sort((a, b) => a.data.localeCompare(b.data) || a.evento.hora.localeCompare(b.evento.hora));
  }, [eventos]);

  // Ao clicar num card, zera os outros filtros: o número do card sempre bate com a lista.
  const filtrarSituacao = (s: Situacao) => {
    setFiltros({ ...FILTROS_PADRAO, situacao: s });
    if (s !== "todas") irParaQuadro();
  };
  const alternarSituacao = (s: Exclude<Situacao, "todas">) =>
    filtrarSituacao(filtros.situacao === s ? "todas" : s);

  const irParaAba = (a: AbaInferior) => {
    setAba(a);
    document.getElementById("painel-inferior")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* Faixa "Hoje": só mostra o que realmente pede atenção. */
  const proximaAudiencia = audiencias.find((o) => diasAte(o.data) <= 1);
  const destaques: Destaque[] = [];
  if (nAtrasadas > 0) {
    destaques.push({
      id: "atrasadas",
      texto: plural(nAtrasadas, "tarefa atrasada", "tarefas atrasadas"),
      tom: "critical",
      onClick: () => filtrarSituacao("atrasadas"),
    });
  }
  if (nVencemHoje > 0) {
    destaques.push({
      id: "hoje",
      texto: `${plural(nVencemHoje, "tarefa vence", "tarefas vencem")} hoje`,
      tom: "warning",
      onClick: () => {
        setFiltros({ ...FILTROS_PADRAO, periodo: "hoje" });
        irParaQuadro();
      },
    });
  }
  if (proximaAudiencia) {
    const d = diasAte(proximaAudiencia.data);
    destaques.push({
      id: "audiencia",
      texto: `Audiência ${d <= 0 ? "hoje" : "amanhã"} · ${proximaAudiencia.evento.hora}`,
      tom: d <= 0 ? "critical" : "warning",
      onClick: () => irParaAba("audiencias"),
    });
  }
  if (nIntimacoes > 0) {
    destaques.push({
      id: "intimacoes",
      texto: plural(nIntimacoes, "intimação pendente", "intimações pendentes"),
      tom: "warning",
      onClick: () => irParaAba("intimacoes"),
    });
  }

  const vazio =
    filtros.situacao === "atrasadas"
      ? "Nenhuma atrasada aqui."
      : filtros.situacao === "concluidas"
        ? "Nenhuma concluída aqui."
        : "Nada por aqui.";

  const porColuna = COLUNAS.map((c) => ({ titulo: c.titulo, n: listaDa(c.id).length })).filter(
    (c) => c.n > 0,
  );

  return (
    <AppShell
      title={agora ? `${saudacao(agora.getHours())}, ${primeiroNome}` : `Olá, ${primeiroNome}`}
      subtitle={agora ? fmtAgora(agora) : ""}
    >
      <div className="space-y-4 sm:space-y-5">
        {/* Faixa "Hoje" */}
        <FaixaHoje destaques={destaques} />

        {/* Indicadores */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            icon={FolderKanban}
            label="Processos em andamento"
            valor={String(nProcessos)}
            cor="primary"
            to="/processos"
          />
          <Kpi
            icon={Users}
            label="Clientes cadastrados"
            valor={String(nClientes)}
            cor="primary"
            to="/clientes"
          />
          <Kpi
            icon={AlertTriangle}
            label="Tarefas atrasadas"
            valor={String(nAtrasadas)}
            cor="critical"
            ativo={filtros.situacao === "atrasadas"}
            onClick={() => alternarSituacao("atrasadas")}
          />
          <Kpi
            icon={CheckCircle2}
            label="Tarefas concluídas"
            valor={String(nConcluidas)}
            cor="success"
            ativo={filtros.situacao === "concluidas"}
            onClick={() => alternarSituacao("concluidas")}
          />
        </section>

        {/* Filtro */}
        <BarraFiltro
          isAdmin={isAdmin}
          quem={quem}
          setQuem={setQuem}
          usuario={usuario}
          usuarios={usuarios}
          clientes={clientes}
          filtros={filtros}
          onChange={setFiltros}
          onNova={() => setCriarTarefa(true)}
        />

        {/* Tarefas, Desenvolvimento e Concluídas */}
        <section id="quadro-tarefas" className="scroll-mt-20 space-y-3">
          {filtros.situacao !== "todas" && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Chip tone={filtros.situacao === "atrasadas" ? "critical" : "success"}>
                {filtros.situacao === "atrasadas"
                  ? plural(visiveis.length, "tarefa atrasada", "tarefas atrasadas")
                  : plural(visiveis.length, "tarefa concluída", "tarefas concluídas")}
              </Chip>
              {porColuna.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {porColuna.map((c) => `${c.titulo}: ${c.n}`).join(" · ")}
                </span>
              )}
              <button
                onClick={() => filtrarSituacao("todas")}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Mostrar todas
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {COLUNAS.map((c) => (
              <ColunaKanban
                key={c.id}
                id={c.id}
                titulo={c.titulo}
                dot={c.dot}
                anterior={c.anterior}
                proxima={c.proxima}
                lista={listaDa(c.id)}
                vazio={vazio}
                arrastando={arrastando}
                sobre={sobre}
                setArrastando={setArrastando}
                setSobre={setSobre}
                onSoltar={soltar}
                onMover={mover}
                onAbrir={setTarefaAberta}
              />
            ))}
          </div>
        </section>

        {/* Audiências, pendências, intimações e equipe num bloco só */}
        <PainelInferior
          aba={aba}
          setAba={setAba}
          isAdmin={isAdmin}
          contagens={{
            audiencias: audiencias.length,
            pendencias: pendencias.length,
            intimacoes: nIntimacoes,
          }}
          audiencias={audiencias}
          quem={quem}
          onEscolher={setQuem}
        />
      </div>

      <TarefaDialog tarefaId={tarefaAberta} onOpenChange={(o) => !o && setTarefaAberta(null)} />
      <NovaTarefaDialog open={criarTarefa} onOpenChange={setCriarTarefa} />
    </AppShell>
  );
}

/* ------------------------------ faixa "Hoje" ------------------------------ */

type Destaque = { id: string; texto: string; tom: "critical" | "warning"; onClick: () => void };

const tomDestaque = {
  critical: "border-[var(--critical)] bg-[var(--critical-soft)] text-[var(--critical)]",
  warning: "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]",
} as const;

function FaixaHoje({ destaques }: { destaques: Destaque[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Hoje
      </span>
      {destaques.length === 0 ? (
        <span className="flex items-center gap-1.5 text-sm text-[var(--success)]">
          <CheckCircle2 className="size-4" /> Tudo em dia
        </span>
      ) : (
        destaques.map((d) => (
          <button
            key={d.id}
            onClick={d.onClick}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition motion-safe:hover:-translate-y-0.5",
              tomDestaque[d.tom],
            )}
          >
            {d.texto}
          </button>
        ))
      )}
    </div>
  );
}

/* ------------------------------ indicadores ------------------------------ */

// Vermelho = urgente/atrasado, verde = concluído, azul da marca = informativo.
// O brilho ao passar o mouse (ou focar com o teclado) usa a mesma cor do card.
const corKpi = {
  primary: {
    borda: "border-primary",
    icone: "text-primary",
    brilho:
      "hover:shadow-[0_8px_28px_-10px_color-mix(in_oklab,var(--primary)_55%,transparent)] focus-visible:shadow-[0_8px_28px_-10px_color-mix(in_oklab,var(--primary)_55%,transparent)]",
  },
  critical: {
    borda: "border-[var(--critical)]",
    icone: "text-[var(--critical)]",
    brilho:
      "hover:shadow-[0_8px_28px_-10px_color-mix(in_oklab,var(--critical)_60%,transparent)] focus-visible:shadow-[0_8px_28px_-10px_color-mix(in_oklab,var(--critical)_60%,transparent)]",
  },
  success: {
    borda: "border-[var(--success)]",
    icone: "text-[var(--success)]",
    brilho:
      "hover:shadow-[0_8px_28px_-10px_color-mix(in_oklab,var(--success)_60%,transparent)] focus-visible:shadow-[0_8px_28px_-10px_color-mix(in_oklab,var(--success)_60%,transparent)]",
  },
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
  const clicavel = Boolean(onClick || to);
  const cls = cn(
    "glass-panel flex w-full min-w-0 items-center gap-2.5 rounded-2xl border-2 p-3 text-left outline-none transition duration-200 motion-reduce:transition-none sm:gap-3 sm:p-4",
    c.borda,
    clicavel && cn("cursor-pointer motion-safe:hover:-translate-y-0.5", c.brilho),
    ativo && "ring-2 ring-current ring-offset-2 ring-offset-background",
    ativo && c.icone,
  );
  const conteudo = (
    <>
      <Icon className={cn("size-6 shrink-0 sm:size-8", c.icone)} />
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

/* ------------------------------ barra de filtro ------------------------------ */

function BarraFiltro({
  isAdmin,
  quem,
  setQuem,
  usuario,
  usuarios,
  clientes,
  filtros,
  onChange,
  onNova,
}: {
  isAdmin: boolean;
  quem: string;
  setQuem: (q: string) => void;
  usuario: string;
  usuarios: App["usuarios"];
  clientes: App["clientes"];
  filtros: Filtros;
  onChange: (f: Filtros) => void;
  onNova: () => void;
}) {
  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => onChange({ ...filtros, [k]: v });
  const sel = cn(selectCls, "h-9 w-full min-w-0 text-sm sm:w-auto");

  return (
    <div className="glass-panel space-y-3 rounded-2xl p-3 sm:p-4">
      <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
        <span className="col-span-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:col-span-1">
          Filtro
        </span>

        {isAdmin && (
          <select
            aria-label="Pessoa"
            className={sel}
            value={quem}
            onChange={(e) => setQuem(e.target.value)}
          >
            <option value="todos">Toda a equipe</option>
            <option value="minhas">Minhas tarefas</option>
            {usuarios
              .filter((u) => u.nome !== usuario)
              .map((u) => (
                <option key={u.nome} value={u.nome}>
                  {u.nome}
                </option>
              ))}
          </select>
        )}

        <select
          aria-label="Situação"
          className={sel}
          value={filtros.situacao}
          onChange={(e) => set("situacao", e.target.value as Situacao)}
        >
          <option value="todas">Todas as situações</option>
          <option value="atrasadas">Atrasadas</option>
          <option value="concluidas">Concluídas</option>
        </select>

        <select
          aria-label="Cliente"
          className={sel}
          value={filtros.cliente}
          onChange={(e) => set("cliente", e.target.value)}
        >
          <option value="todos">Todos os clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.nome}>
              {c.nome}
            </option>
          ))}
        </select>

        <select
          aria-label="Data"
          className={sel}
          value={filtros.periodo}
          onChange={(e) => set("periodo", e.target.value as Periodo)}
        >
          <option value="todas">Qualquer data</option>
          <option value="hoje">Vence hoje</option>
          <option value="7">Próximos 7 dias</option>
          <option value="30">Próximos 30 dias</option>
        </select>

        <div className="relative col-span-2 min-w-[170px] sm:col-span-1 sm:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Buscar tarefa"
            placeholder="Buscar processo, peça, documento…"
            className={cn(inputCls, "h-9 w-full pl-8 text-sm")}
            value={filtros.busca}
            onChange={(e) => set("busca", e.target.value)}
          />
        </div>

        {filtrosAtivos(filtros) && (
          <button
            onClick={() => onChange(FILTROS_PADRAO)}
            className="col-span-2 text-left text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline sm:col-span-1"
          >
            Limpar filtros
          </button>
        )}

        <Button size="sm" className="col-span-2 h-9 sm:col-span-1 sm:ml-auto" onClick={onNova}>
          <Plus className="size-4" /> Nova tarefa
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[var(--critical)]" /> Essencial (atrasada)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[var(--warning)]" /> Importante (vence hoje ou
          amanhã)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[var(--success)]" /> Concluída
        </span>
        <span className="hidden sm:inline">· Arraste uma tarefa para mudar de coluna.</span>
      </div>
    </div>
  );
}

/* ------------------------------ colunas de tarefas ------------------------------ */

const MAX_ITENS = 5;

function bordaPrioridade(t: Tarefa) {
  if (concluida(t)) return "border-l-[var(--success)]";
  if (atrasada(t)) return "border-l-[var(--critical)]";
  if (diasAte(t.prazo) <= 1) return "border-l-[var(--warning)]";
  return "border-l-transparent";
}

function ColunaKanban({
  id,
  titulo,
  dot,
  anterior,
  proxima,
  lista,
  vazio,
  arrastando,
  sobre,
  setArrastando,
  setSobre,
  onSoltar,
  onMover,
  onAbrir,
}: {
  id: Coluna;
  titulo: string;
  dot: string;
  anterior: Coluna | null;
  proxima: Coluna | null;
  lista: Tarefa[];
  vazio: string;
  arrastando: string | null;
  sobre: string | null;
  setArrastando: (id: string | null) => void;
  setSobre: (id: string | null) => void;
  onSoltar: (destino: Coluna) => void;
  onMover: (t: Tarefa, destino: Coluna) => void;
  onAbrir: (id: string) => void;
}) {
  const alvo = sobre === (id as string);
  const restantes = lista.length - MAX_ITENS;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!alvo) setSobre(id as string);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSobre(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onSoltar(id);
      }}
      className={cn(
        "glass-panel flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-transparent transition-colors",
        alvo && "border-primary",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className={cn("size-2.5 rounded-full", dot)} />
          {titulo}
          <span className="text-[11px] font-normal text-muted-foreground">{lista.length}</span>
        </h2>
        <Link
          to="/tarefas"
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          Ver tudo →
        </Link>
      </div>

      <div className="divide-y divide-border">
        {lista.length === 0 && <Empty>{vazio}</Empty>}
        {lista.slice(0, MAX_ITENS).map((t) => {
          const feita = concluida(t);
          const atras = atrasada(t);
          const p = prazoInfo(t);
          return (
            <div
              key={t.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", t.id);
                setArrastando(t.id);
              }}
              onDragEnd={() => {
                setArrastando(null);
                setSobre(null);
              }}
              className={cn(
                "group flex cursor-grab items-center gap-2 border-l-4 py-2.5 pl-2 pr-1.5 hover:bg-accent/50 active:cursor-grabbing",
                bordaPrioridade(t),
                arrastando === t.id && "opacity-40",
              )}
            >
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
                {/* Em telas menores o prazo aparece aqui; no desktop ele vira a etiqueta ao lado. */}
                {!feita && (
                  <span
                    className={cn(
                      "block text-[11px] xl:hidden",
                      atras ? "font-semibold text-[var(--critical)]" : "text-muted-foreground",
                    )}
                  >
                    {p.label}
                  </span>
                )}
              </button>
              {!feita && (
                <Chip tone={p.tone} className="hidden shrink-0 xl:inline-flex">
                  {p.label}
                </Chip>
              )}
              {/* Setas: aparecem ao passar o mouse (no celular ficam sempre visíveis). */}
              <div className="flex shrink-0 items-center transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0">
                {anterior && (
                  <button
                    aria-label={`Mover para ${ROTULO[anterior as string]}`}
                    onClick={() => onMover(t, anterior)}
                    className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:size-7"
                  >
                    <ArrowLeft className="size-4 sm:size-3.5" />
                  </button>
                )}
                {proxima && (
                  <button
                    aria-label={`Mover para ${ROTULO[proxima as string]}`}
                    onClick={() => onMover(t, proxima)}
                    className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:size-7"
                  >
                    <ArrowRight className="size-4 sm:size-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {restantes > 0 && (
        <Link
          to="/tarefas"
          className="border-t border-border px-4 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          + {restantes} {restantes === 1 ? "tarefa" : "tarefas"} · Ver tudo →
        </Link>
      )}

      {/* Área de soltar: só aparece enquanto você arrasta uma tarefa. */}
      {arrastando && (
        <div
          className={cn(
            "m-2 rounded-lg border-2 border-dashed px-3 py-3 text-center text-[11px] text-muted-foreground transition-colors",
            alvo ? "border-primary bg-[var(--brand-soft)]" : "border-border",
          )}
        >
          {alvo ? "Solte aqui" : "Arraste para cá"}
        </div>
      )}
    </div>
  );
}

/* --------------- bloco inferior: audiências, pendências, intimações, equipe --------------- */

function PainelInferior({
  aba,
  setAba,
  isAdmin,
  contagens,
  audiencias,
  quem,
  onEscolher,
}: {
  aba: AbaInferior;
  setAba: (a: AbaInferior) => void;
  isAdmin: boolean;
  contagens: { audiencias: number; pendencias: number; intimacoes: number };
  audiencias: Oc[];
  quem: string;
  onEscolher: (n: string) => void;
}) {
  const abas: { id: AbaInferior; label: string; n?: number }[] = [
    { id: "audiencias", label: "Audiências", n: contagens.audiencias },
    { id: "pendencias", label: "Pendências", n: contagens.pendencias },
    { id: "intimacoes", label: "Intimações", n: contagens.intimacoes },
    ...(isAdmin ? [{ id: "equipe" as const, label: "Equipe" }] : []),
  ];
  const abaAtual = abas.some((a) => a.id === aba) ? aba : "audiencias";

  return (
    <section id="painel-inferior" className="scroll-mt-20">
      <div className="mb-3 flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg bg-accent p-0.5 text-xs font-medium">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
              abaAtual === a.id ? "glass-soft text-foreground shadow-sm" : "text-muted-foreground",
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
      {abaAtual === "audiencias" && <PainelAudiencias lista={audiencias} />}
      {abaAtual === "pendencias" && <Pendencias />}
      {abaAtual === "intimacoes" && <Intimacoes />}
      {abaAtual === "equipe" && <ResumoEquipe quem={quem} onEscolher={onEscolher} />}
    </section>
  );
}

function PainelAudiencias({ lista }: { lista: Oc[] }) {
  const navigate = useNavigate();
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          Próximas audiências
          <span className="text-[11px] font-normal text-muted-foreground">{lista.length}</span>
        </span>
      }
      action={
        <Link
          to="/audiencias"
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          Ver tudo →
        </Link>
      }
      delay={0}
    >
      {lista.length === 0 ? (
        <Empty>Nenhuma audiência marcada.</Empty>
      ) : (
        <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2 xl:grid-cols-3">
          {lista.slice(0, 6).map(({ evento: e, data }) => {
            const d = diasAte(data);
            const tone = tipoTone[e.tipo];
            return (
              <button
                key={e.id + data}
                onClick={() => navigate({ to: "/audiencias" })}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-accent"
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
                <Chip tone={d <= 0 ? "critical" : d === 1 ? "warning" : "neutral"}>
                  {d <= 0 ? "Hoje" : d === 1 ? "Amanhã" : `${d} dias`}
                </Chip>
              </button>
            );
          })}
        </div>
      )}
    </Panel>
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
            onClick={() => onEscolher(quem === d.nome ? "todos" : d.nome)}
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