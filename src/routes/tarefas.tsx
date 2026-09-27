import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare, Clock, MessageSquare, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Avatar, Chip, Empty, Panel, Segmented, inputCls, selectCls } from "@/components/kit";
import {
  minutosTotais,
  NovaTarefaDialog,
  prazoInfo,
  PRIORIDADES,
  prioridadeTone,
  TarefaDialog,
  useAtualizarTarefa,
} from "@/components/TarefaDialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { COLUNAS, minToH, type Coluna, type Tarefa } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Gestão Jurídica" }] }),
  component: TarefasPage,
});

const colunaCor: Record<Coluna, string> = {
  "A Fazer": "bg-muted-foreground/60",
  "Em Andamento": "bg-[var(--warning)]",
  Concluído: "bg-[var(--success)]",
};

function TarefasPage() {
  const { tarefas, usuario, usuarios } = useApp();
  const atualizar = useAtualizarTarefa();
  const [vista, setVista] = useState<"Quadro" | "Lista" | "Timesheet">("Quadro");
  const [quem, setQuem] = useState<string>("Minhas");
  const [prioridade, setPrioridade] = useState<string>("Todas");
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState<string | null>(null);
  const [nova, setNova] = useState(false);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<Coluna | null>(null);

  const filtradas = useMemo(
    () =>
      tarefas.filter((t) => {
        if (quem === "Minhas" && t.responsavel !== usuario) return false;
        if (quem !== "Minhas" && quem !== "Todos" && t.responsavel !== quem) return false;
        if (prioridade !== "Todas" && t.prioridade !== prioridade) return false;
        if (
          busca &&
          !`${t.titulo} ${t.vinculo} ${t.descricao}`.toLowerCase().includes(busca.toLowerCase())
        )
          return false;
        return true;
      }),
    [tarefas, quem, prioridade, busca, usuario],
  );

  const soltar = (col: Coluna) => {
    const t = tarefas.find((x) => x.id === arrastando);
    setArrastando(null);
    setSobre(null);
    if (!t || t.coluna === col) return;
    atualizar(t.id, (x) => ({ ...x, coluna: col }), `moveu para ${col}`);
  };

  return (
    <AppShell title="Tarefas" subtitle="criação, delegação, checklists e controle de tempo">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Segmented
          value={vista}
          onChange={setVista}
          options={["Quadro", "Lista", "Timesheet"] as const}
        />
        <div className="relative w-full min-w-0 sm:w-auto sm:flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={cn(inputCls, "pl-9")}
            placeholder="Buscar tarefa…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className={cn(selectCls, "w-auto")}
          value={quem}
          onChange={(e) => setQuem(e.target.value)}
        >
          <option value="Minhas">Minhas tarefas</option>
          <option value="Todos">Toda a equipe</option>
          {usuarios.map((u) => (
            <option key={u.id}>{u.nome}</option>
          ))}
        </select>
        <select
          className={cn(selectCls, "w-auto")}
          value={prioridade}
          onChange={(e) => setPrioridade(e.target.value)}
        >
          <option value="Todas">Todas as prioridades</option>
          {PRIORIDADES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <Button className="ml-auto" onClick={() => setNova(true)}>
          <Plus className="size-4" /> Nova tarefa
        </Button>
      </div>

      {vista === "Quadro" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUNAS.map((col, ci) => {
            const itens = filtradas
              .filter((t) => t.coluna === col)
              .sort(
                (a, b) =>
                  PRIORIDADES.indexOf(a.prioridade) - PRIORIDADES.indexOf(b.prioridade) ||
                  a.prazo.localeCompare(b.prazo),
              );
            return (
              <div
                key={col}
                onDragOver={(e) => {
                  e.preventDefault();
                  setSobre(col);
                }}
                onDragLeave={() => setSobre(null)}
                onDrop={() => soltar(col)}
                className={cn(
                  "glass-panel rise flex min-h-[300px] flex-col rounded-2xl transition-shadow",
                  sobre === col && "ring-2 ring-primary/40",
                )}
                style={{ animationDelay: `${ci * 60}ms` }}
              >
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <span className={cn("size-2 rounded-full", colunaCor[col])} />
                  <h2 className="text-sm font-semibold">{col}</h2>
                  <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                    {itens.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 p-2">
                  {itens.map((t) => (
                    <CartaoTarefa
                      key={t.id}
                      t={t}
                      onClick={() => setAberta(t.id)}
                      onDragStart={() => setArrastando(t.id)}
                      arrastando={arrastando === t.id}
                    />
                  ))}
                  {itens.length === 0 && (
                    <div className="grid h-24 place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                      Arraste tarefas para cá
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {vista === "Lista" && (
        <Panel>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarefa</TableHead>
                  <TableHead>Vínculo</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...filtradas]
                  .sort((a, b) => a.prazo.localeCompare(b.prazo))
                  .map((t) => {
                    const p = prazoInfo(t);
                    return (
                      <TableRow
                        key={t.id}
                        className="cursor-pointer"
                        onClick={() => setAberta(t.id)}
                      >
                        <TableCell className="max-w-[260px] truncate font-medium">
                          {t.titulo}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {t.vinculo}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2 whitespace-nowrap text-xs">
                            <Avatar nome={t.responsavel} className="size-6" />
                            {t.responsavel}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Chip tone={prioridadeTone[t.prioridade]}>{t.prioridade}</Chip>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 whitespace-nowrap text-xs">
                            <span className={cn("size-2 rounded-full", colunaCor[t.coluna])} />
                            {t.coluna}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Chip tone={p.tone}>{p.label}</Chip>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {minToH(minutosTotais(t))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
            {filtradas.length === 0 && <Empty>Nenhuma tarefa encontrada com esses filtros.</Empty>}
          </div>
        </Panel>
      )}

      {vista === "Timesheet" && <Timesheet tarefas={filtradas} onAbrir={setAberta} />}

      <TarefaDialog tarefaId={aberta} onOpenChange={(o) => !o && setAberta(null)} />
      <NovaTarefaDialog open={nova} onOpenChange={setNova} />
    </AppShell>
  );
}

function CartaoTarefa({
  t,
  onClick,
  onDragStart,
  arrastando,
}: {
  t: Tarefa;
  onClick: () => void;
  onDragStart: () => void;
  arrastando: boolean;
}) {
  const p = prazoInfo(t);
  const feitas = t.subtarefas.filter((s) => s.feita).length;
  const min = minutosTotais(t);
  return (
    <button
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        "w-full cursor-grab rounded-xl border border-border bg-background/70 p-3 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md active:cursor-grabbing",
        arrastando && "opacity-40",
        t.coluna !== "Concluído" &&
          p.tone === "critical" &&
          "border-l-4 border-l-[var(--critical)]",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Chip tone={prioridadeTone[t.prioridade]}>{t.prioridade}</Chip>
        <Chip tone={p.tone}>{p.label}</Chip>
      </div>
      <div
        className={cn(
          "mt-2 text-sm font-medium leading-snug",
          t.coluna === "Concluído" && "text-muted-foreground line-through",
        )}
      >
        {t.titulo}
      </div>
      <div className="mt-1 truncate text-[11px] text-muted-foreground">
        {t.vinculoTipo !== "Interno" && <span className="font-medium">{t.vinculoTipo}: </span>}
        {t.vinculo}
      </div>
      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
        {t.subtarefas.length > 0 && (
          <span
            className={cn(
              "flex items-center gap-1",
              feitas === t.subtarefas.length && "text-[var(--success)]",
            )}
          >
            <CheckSquare className="size-3.5" />
            {feitas}/{t.subtarefas.length}
          </span>
        )}
        {t.comentarios.length > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3.5" />
            {t.comentarios.length}
          </span>
        )}
        {min > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {minToH(min)}
          </span>
        )}
        <Avatar nome={t.responsavel} className="ml-auto size-6" />
      </div>
    </button>
  );
}

function Timesheet({ tarefas, onAbrir }: { tarefas: Tarefa[]; onAbrir: (id: string) => void }) {
  const linhas = tarefas.flatMap((t) => t.apontamentos.map((a) => ({ ...a, tarefa: t })));
  const porPessoa = new Map<string, number>();
  for (const l of linhas) porPessoa.set(l.autor, (porPessoa.get(l.autor) ?? 0) + l.minutos);
  const total = linhas.reduce((s, l) => s + l.minutos, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel title="Horas por pessoa" className="lg:col-span-1">
        <div className="space-y-3 p-4">
          {[...porPessoa.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([nome, min]) => (
              <div key={nome}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Avatar nome={nome} className="size-6" />
                    {nome}
                  </span>
                  <span className="font-mono text-xs font-semibold">{minToH(min)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-accent">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(min / Math.max(1, total)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          {linhas.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem apontamentos.</p>
          )}
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
            <span>Total</span>
            <span className="font-mono">{minToH(total)}</span>
          </div>
        </div>
      </Panel>
      <Panel title="Apontamentos" className="lg:col-span-2">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Quem</TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead className="text-right">Tempo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => (
                <TableRow
                  key={l.id}
                  className="cursor-pointer"
                  onClick={() => onAbrir(l.tarefa.id)}
                >
                  <TableCell className="whitespace-nowrap font-mono text-xs">{l.quando}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{l.autor}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-sm">
                    {l.tarefa.titulo}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.nota || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">
                    {minToH(l.minutos)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          Abra uma tarefa e use o botão ▶ para cronometrar, ou lance os minutos manualmente.
        </p>
      </Panel>
    </div>
  );
}
