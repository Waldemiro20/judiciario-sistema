import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  Pencil,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Avatar, Chip, Empty, Field, inputCls, Panel, selectCls, Stat } from "@/components/kit";
import {
  NovaTarefaDialog,
  prazoInfo,
  TarefaDialog,
  TarefaMenu,
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
import { useApp, type WidgetId } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Gestão Jurídica" },
      {
        name: "description",
        content: "Painel diário do escritório: tarefas, pendências, audiências e prazos.",
      },
    ],
  }),
  component: Dashboard,
});

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

/** Hora atual do aparelho, atualizada a cada minuto (só no navegador, para não
 *  divergir do horário do servidor na renderização inicial). */
function useAgora() {
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => {
    setAgora(new Date());
    const id = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return agora;
}

function Dashboard() {
  const { usuario, widgets, setWidgets } = useApp();
  const [editando, setEditando] = useState(false);
  const [arrastando, setArrastando] = useState<WidgetId | null>(null);
  const [tarefaAberta, setTarefaAberta] = useState<string | null>(null);
  const [criarTarefa, setCriarTarefa] = useState(false);

  const primeiroNome = usuario.split(" ")[0];
  const agora = useAgora();
  const mover = (id: WidgetId, delta: number) =>
    setWidgets((prev) => {
      const i = prev.findIndex((w) => w.id === id);
      const j = i + delta;
      if (j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[j]] = [copia[j]!, copia[i]!];
      return copia;
    });

  const soltarSobre = (alvo: WidgetId) => {
    if (!arrastando || arrastando === alvo) return;
    setWidgets((prev) => {
      const origem = prev.find((w) => w.id === arrastando)!;
      const sem = prev.filter((w) => w.id !== arrastando);
      const idx = sem.findIndex((w) => w.id === alvo);
      sem.splice(idx, 0, origem);
      return sem;
    });
  };

  const render: Record<WidgetId, () => React.ReactNode> = {
    resumo: () => <Resumo />,
    pendencias: () => <Pendencias />,
    agenda: () => <ProximosEventos />,
    tarefas: () => <MinhasTarefas onAbrir={setTarefaAberta} onNova={() => setCriarTarefa(true)} />,
    intimacoes: () => <Intimacoes />,
    equipe: () => <CargaEquipe />,
  };

  const largos: WidgetId[] = ["resumo", "pendencias"];

  return (
    <AppShell
      title={agora ? `${saudacao(agora.getHours())}, ${primeiroNome}` : `Olá, ${primeiroNome}`}
      subtitle={agora ? fmtAgora(agora) : ""}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Aqui está o que precisa da sua atenção hoje.
        </p>
        <Button
          variant={editando ? "default" : "outline"}
          size="sm"
          onClick={() => setEditando((e) => !e)}
        >
          {editando ? <Check className="size-4" /> : <Settings2 className="size-4" />}
          {editando ? "Concluir" : "Personalizar painel"}
        </Button>
      </div>

      {editando && (
        <div className="glass-panel mb-5 rounded-2xl p-3">
          <p className="mb-2 px-1 text-xs text-muted-foreground">
            Arraste para reordenar, use as setas ou o olho para mostrar/ocultar blocos.
          </p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {widgets.map((w, i) => (
              <div
                key={w.id}
                draggable
                onDragStart={() => setArrastando(w.id)}
                onDragEnd={() => setArrastando(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => soltarSobre(w.id)}
                className={cn(
                  "flex cursor-grab items-center gap-2 rounded-lg border border-border bg-background/60 px-2 py-2 text-sm",
                  arrastando === w.id && "opacity-50",
                  !w.visivel && "text-muted-foreground",
                )}
              >
                <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{w.titulo}</span>
                <button
                  aria-label="Subir"
                  onClick={() => mover(w.id, -1)}
                  disabled={i === 0}
                  className="rounded p-1 hover:bg-accent disabled:opacity-30"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  aria-label="Descer"
                  onClick={() => mover(w.id, 1)}
                  disabled={i === widgets.length - 1}
                  className="rounded p-1 hover:bg-accent disabled:opacity-30"
                >
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  aria-label={w.visivel ? "Ocultar" : "Mostrar"}
                  onClick={() =>
                    setWidgets((prev) =>
                      prev.map((x) => (x.id === w.id ? { ...x, visivel: !x.visivel } : x)),
                    )
                  }
                  className="rounded p-1 hover:bg-accent"
                >
                  {w.visivel ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {widgets
          .filter((w) => w.visivel)
          .map((w) => (
            <div key={w.id} className={cn("min-w-0", largos.includes(w.id) && "lg:col-span-2")}>
              {render[w.id]()}
            </div>
          ))}
      </div>

      <TarefaDialog tarefaId={tarefaAberta} onOpenChange={(o) => !o && setTarefaAberta(null)} />
      <NovaTarefaDialog open={criarTarefa} onOpenChange={setCriarTarefa} />
    </AppShell>
  );
}

function Resumo() {
  const { processos, clientes, tarefas, eventos, usuario } = useApp();
  const ativos = processos.filter((p) => p.status !== "Arquivado").length;
  const minhas = tarefas.filter((t) => t.coluna !== "Concluído" && t.responsavel === usuario);
  const atrasadas = minhas.filter((t) => diasAte(t.prazo) < 0).length;
  const proximos = ocorrencias(eventos, parseISO(HOJE), new Date(2024, 3, 11)).filter(
    (o) => o.evento.tipo !== "Reunião",
  );

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <Stat
        label="Processos em andamento"
        value={ativos}
        note={`${processos.length} cadastrados no total`}
        delay={0}
      />
      <Stat
        label="Clientes cadastrados"
        value={clientes.length}
        note={`${clientes.filter((c) => c.status === "Ativo").length} ativos`}
        delay={60}
      />
      <Stat
        label="Minhas tarefas pendentes"
        value={minhas.length}
        note={atrasadas ? `${atrasadas} atrasada${atrasadas > 1 ? "s" : ""}` : "nenhuma atrasada"}
        tone={atrasadas ? "warning" : "success"}
        delay={120}
      />
      <Stat
        label="Prazos e audiências (48h)"
        value={proximos.length}
        note="hoje e amanhã — atenção"
        tone="critical"
        delay={180}
      />
    </div>
  );
}

const nivelTone = { critico: "critical", atencao: "warning", info: "brand" } as const;
const nivelLabel = { critico: "Urgente", atencao: "Atenção", info: "Aviso" } as const;

function Pendencias() {
  const pendencias = usePendencias();
  const navigate = useNavigate();
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          Pendências que precisam de atenção
          <Chip tone={pendencias.some((p) => p.nivel === "critico") ? "critical" : "warning"}>
            {pendencias.length}
          </Chip>
        </span>
      }
      delay={80}
    >
      {pendencias.length === 0 ? (
        <Empty>Tudo em dia. Nenhuma pendência para você.</Empty>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-y-0">
          {pendencias.slice(0, 8).map((p, i) => (
            <button
              key={p.id}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => navigate({ to: p.to as any, params: p.params as any })}
              className={cn(
                "flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent md:border-b md:border-border",
                i % 2 === 0 && "md:border-r",
              )}
            >
              <Chip tone={nivelTone[p.nivel]} className="mt-0.5 w-16 justify-center">
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

function ProximosEventos() {
  const { eventos } = useApp();
  const lista = ocorrencias(eventos, parseISO(HOJE), new Date(2024, 3, 30)).slice(0, 6);
  return (
    <Panel
      title="Próximos prazos e audiências"
      action={
        <Link
          to="/agenda"
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          Ver agenda →
        </Link>
      }
      delay={120}
    >
      <div className="divide-y divide-border">
        {lista.map(({ evento: e, data }) => {
          const d = diasAte(data);
          const tone = tipoTone[e.tipo];
          return (
            <div key={e.id + data} className="flex items-start gap-3 px-4 py-3">
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
                  {e.tipo} · {e.local} · {e.advogado}
                </div>
              </div>
              <Chip tone={d === 0 ? "critical" : d === 1 ? "warning" : "neutral"}>
                {d === 0 ? "Hoje" : d === 1 ? "Amanhã" : `${d} dias`}
              </Chip>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function MinhasTarefas({ onAbrir, onNova }: { onAbrir: (id: string) => void; onNova: () => void }) {
  const { tarefas, usuario } = useApp();
  const { alternarConclusao } = useAcoesTarefa();
  const minhas = tarefas
    .filter((t) => t.responsavel === usuario)
    .sort(
      (a, b) =>
        Number(a.coluna === "Concluído") - Number(b.coluna === "Concluído") ||
        a.prazo.localeCompare(b.prazo),
    );
  const concluidas = minhas.filter((t) => t.coluna === "Concluído").length;

  return (
    <Panel
      title="Minhas tarefas"
      action={
        <>
          <span className="font-mono text-[10px] text-muted-foreground">
            {concluidas}/{minhas.length}
          </span>
          <Link
            to="/tarefas"
            className="hidden text-[11px] font-medium text-muted-foreground hover:text-foreground sm:inline"
          >
            Abrir quadro →
          </Link>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={onNova}>
            <Plus className="size-3.5" /> Nova
          </Button>
        </>
      }
      delay={160}
    >
      <div className="space-y-1 p-2">
        {minhas.length === 0 && <Empty>Nenhuma tarefa atribuída a você.</Empty>}
        {minhas.map((t) => {
          const feita = t.coluna === "Concluído";
          const p = prazoInfo(t);
          return (
            <div
              key={t.id}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 transition-colors",
                !feita && p.tone === "critical" ? "bg-[var(--critical-soft)]" : "hover:bg-accent",
              )}
            >
              <button
                aria-label={feita ? "Reabrir" : "Concluir"}
                onClick={() => alternarConclusao(t)}
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border-2",
                  feita
                    ? "border-[var(--success)] bg-[var(--success)]"
                    : "border-muted-foreground/50 hover:border-[var(--success)]",
                )}
              >
                {feita && <Check className="size-2.5 text-background" strokeWidth={4} />}
              </button>
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
              {!feita && <Chip tone={p.tone}>{p.label}</Chip>}
              <TarefaMenu t={t} onEditar={() => onAbrir(t.id)} className="-mr-1 size-7" />
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Intimacoes() {
  const { intimacoes, setIntimacoes, processos, registrar } = useApp();
  const [editando, setEditando] = useState<Intimacao | null>(null);
  const [criando, setCriando] = useState(false);
  const [apagando, setApagando] = useState<Intimacao | null>(null);
  const pendentes = intimacoes.filter((i) => !i.concluida).length;

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
      title={
        <span className="flex items-center gap-2">
          Novas intimações
          {pendentes > 0 && <Chip tone="warning">{pendentes} pendentes</Chip>}
        </span>
      }
      action={
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={nova}>
          <Plus className="size-3.5" /> Nova
        </Button>
      }
      delay={200}
    >
      <div className="divide-y divide-border">
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

function CargaEquipe() {
  const { tarefas, usuarios } = useApp();
  const dados = usuarios.map((u) => {
    const abertas = tarefas.filter((t) => t.responsavel === u.nome && t.coluna !== "Concluído");
    return {
      nome: u.nome,
      abertas: abertas.length,
      atrasadas: abertas.filter((t) => diasAte(t.prazo) < 0).length,
    };
  });
  const max = Math.max(1, ...dados.map((d) => d.abertas));
  return (
    <Panel title="Carga da equipe" delay={240}>
      <div className="space-y-3 p-4">
        {dados.map((d) => (
          <div key={d.nome} className="flex items-center gap-3">
            <Avatar nome={d.nome} />
            <span className="w-32 shrink-0 truncate text-sm">{d.nome}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(d.abertas / max) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right font-mono text-xs">{d.abertas}</span>
            {d.atrasadas > 0 && <Chip tone="critical">{d.atrasadas} atr.</Chip>}
          </div>
        ))}
      </div>
    </Panel>
  );
}
