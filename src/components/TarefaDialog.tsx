import { Pause, Play, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, Chip, Field, inputCls, selectCls, type Tone } from "@/components/kit";
import {
  agoraCarimbo,
  COLUNAS,
  diasAte,
  fmtDM,
  HOJE,
  minToH,
  uid,
  type Coluna,
  type Prioridade,
  type Tarefa,
} from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const prioridadeTone: Record<Prioridade, Tone> = {
  Alta: "critical",
  Média: "warning",
  Baixa: "neutral",
};
export const PRIORIDADES: Prioridade[] = ["Alta", "Média", "Baixa"];

export function prazoInfo(t: Tarefa): { label: string; tone: Tone } {
  if (t.coluna === "Concluído") return { label: fmtDM(t.prazo), tone: "success" };
  const d = diasAte(t.prazo);
  if (d < 0) return { label: `atrasada ${-d}d`, tone: "critical" };
  if (d === 0) return { label: "vence hoje", tone: "critical" };
  if (d === 1) return { label: "amanhã", tone: "warning" };
  return { label: fmtDM(t.prazo), tone: "neutral" };
}

export const minutosTotais = (t: Tarefa) => t.apontamentos.reduce((s, a) => s + a.minutos, 0);

/** Hook para alterar uma tarefa registrando histórico nominal (quem fez e quando). */
export function useAtualizarTarefa() {
  const { setTarefas, usuario, registrar } = useApp();
  return (id: string, fn: (t: Tarefa) => Tarefa, historico?: string) => {
    const { dataCurta, hora } = agoraCarimbo();
    setTarefas((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const novo = fn(t);
        if (!historico) return novo;
        return {
          ...novo,
          historico: [
            ...novo.historico,
            { id: uid(), autor: usuario, texto: historico, quando: `${dataCurta} às ${hora}` },
          ],
        };
      }),
    );
    if (historico) registrar("Editou", "Tarefas", historico);
  };
}

export function TarefaDialog({
  tarefaId,
  onOpenChange,
}: {
  tarefaId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { tarefas, usuario, processos, clientes, usuarios } = useApp();
  const t = tarefas.find((x) => x.id === tarefaId);
  const atualizar = useAtualizarTarefa();
  const [novaSub, setNovaSub] = useState("");
  const [comentario, setComentario] = useState("");
  const [rodando, setRodando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [manual, setManual] = useState("");
  const inicio = useRef<number | null>(null);

  useEffect(() => {
    setRodando(false);
    setSegundos(0);
    inicio.current = null;
  }, [tarefaId]);

  useEffect(() => {
    if (!rodando) return;
    const iv = setInterval(() => {
      if (inicio.current) setSegundos(Math.floor((Date.now() - inicio.current) / 1000));
    }, 500);
    return () => clearInterval(iv);
  }, [rodando]);

  if (!t) return null;

  const feitas = t.subtarefas.filter((s) => s.feita).length;
  const { dataCurta, hora } = agoraCarimbo();

  const apontar = (min: number, nota: string) => {
    if (min <= 0) return;
    atualizar(
      t.id,
      (x) => ({
        ...x,
        apontamentos: [
          ...x.apontamentos,
          { id: uid(), autor: usuario, minutos: min, quando: `${dataCurta} às ${hora}`, nota },
        ],
      }),
      `apontou ${minToH(min)} trabalhadas`,
    );
    toast.success(`${minToH(min)} registradas no timesheet`);
  };

  const toggleTimer = () => {
    if (rodando) {
      setRodando(false);
      const min = Math.max(1, Math.round(segundos / 60));
      apontar(min, "Cronômetro");
      setSegundos(0);
      inicio.current = null;
    } else {
      inicio.current = Date.now() - segundos * 1000;
      setRodando(true);
    }
  };

  const vinculos =
    t.vinculoTipo === "Processo"
      ? processos.map((p) => p.numero)
      : t.vinculoTipo === "Cliente"
        ? clientes.map((c) => c.nome)
        : ["Interno"];

  return (
    <Dialog open={!!t} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <Chip tone={prioridadeTone[t.prioridade]}>{t.prioridade}</Chip>
            <Chip tone={prazoInfo(t).tone}>{prazoInfo(t).label}</Chip>
            <span className="font-mono text-[11px] text-muted-foreground">
              #{t.id.toUpperCase()}
            </span>
          </div>
          <DialogTitle className="pr-6 text-left">
            <input
              value={t.titulo}
              onChange={(e) => atualizar(t.id, (x) => ({ ...x, titulo: e.target.value }))}
              className="w-full rounded-md bg-transparent text-lg font-semibold outline-none focus:bg-accent/50"
            />
          </DialogTitle>
          <DialogDescription className="sr-only">Detalhes da tarefa</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Status">
            <select
              className={selectCls}
              value={t.coluna}
              onChange={(e) =>
                atualizar(
                  t.id,
                  (x) => ({ ...x, coluna: e.target.value as Coluna }),
                  `moveu para ${e.target.value}`,
                )
              }
            >
              {COLUNAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Prioridade">
            <select
              className={selectCls}
              value={t.prioridade}
              onChange={(e) =>
                atualizar(
                  t.id,
                  (x) => ({ ...x, prioridade: e.target.value as Prioridade }),
                  `alterou a prioridade para ${e.target.value}`,
                )
              }
            >
              {PRIORIDADES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Prazo">
            <input
              type="date"
              className={inputCls}
              value={t.prazo}
              onChange={(e) =>
                e.target.value &&
                atualizar(
                  t.id,
                  (x) => ({ ...x, prazo: e.target.value }),
                  `alterou o prazo para ${fmtDM(e.target.value)}`,
                )
              }
            />
          </Field>
          <Field label="Responsável">
            <select
              className={selectCls}
              value={t.responsavel}
              onChange={(e) =>
                atualizar(
                  t.id,
                  (x) => ({ ...x, responsavel: e.target.value }),
                  `atribuiu a tarefa a ${e.target.value}`,
                )
              }
            >
              {usuarios.map((u) => (
                <option key={u.id}>{u.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Vincular a">
            <select
              className={selectCls}
              value={t.vinculoTipo}
              onChange={(e) => {
                const tipo = e.target.value as Tarefa["vinculoTipo"];
                const v =
                  tipo === "Processo"
                    ? processos[0]!.numero
                    : tipo === "Cliente"
                      ? clientes[0]!.nome
                      : "Interno";
                atualizar(
                  t.id,
                  (x) => ({ ...x, vinculoTipo: tipo, vinculo: v }),
                  `vinculou a ${v}`,
                );
              }}
            >
              <option>Processo</option>
              <option>Cliente</option>
              <option>Interno</option>
            </select>
          </Field>
          <Field label={t.vinculoTipo === "Interno" ? "Vínculo" : t.vinculoTipo}>
            <select
              className={selectCls}
              value={t.vinculo}
              disabled={t.vinculoTipo === "Interno"}
              onChange={(e) =>
                atualizar(
                  t.id,
                  (x) => ({ ...x, vinculo: e.target.value }),
                  `vinculou a ${e.target.value}`,
                )
              }
            >
              {vinculos.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Descrição">
          <textarea
            rows={2}
            className={cn(inputCls, "h-auto py-2")}
            placeholder="Detalhes, orientações…"
            value={t.descricao}
            onChange={(e) => atualizar(t.id, (x) => ({ ...x, descricao: e.target.value }))}
          />
        </Field>

        <Tabs defaultValue="checklist">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="checklist">
              Checklist{" "}
              <span className="ml-1 font-mono text-[10px] opacity-60">
                {feitas}/{t.subtarefas.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="comentarios">
              Comentários{" "}
              <span className="ml-1 font-mono text-[10px] opacity-60">{t.comentarios.length}</span>
            </TabsTrigger>
            <TabsTrigger value="tempo">Timesheet</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="space-y-2">
            {t.subtarefas.length > 0 && (
              <div className="h-1.5 overflow-hidden rounded-full bg-accent">
                <div
                  className="h-full rounded-full bg-[var(--success)] transition-all"
                  style={{ width: `${(feitas / t.subtarefas.length) * 100}%` }}
                />
              </div>
            )}
            {t.subtarefas.map((s) => (
              <div
                key={s.id}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-accent"
              >
                <Checkbox
                  checked={s.feita}
                  onCheckedChange={(v) =>
                    atualizar(
                      t.id,
                      (x) => ({
                        ...x,
                        subtarefas: x.subtarefas.map((y) =>
                          y.id === s.id ? { ...y, feita: !!v } : y,
                        ),
                      }),
                      `${v ? "concluiu" : "reabriu"} o item "${s.texto}"`,
                    )
                  }
                />
                <span
                  className={cn("flex-1 text-sm", s.feita && "text-muted-foreground line-through")}
                >
                  {s.texto}
                </span>
                <button
                  aria-label="Remover item"
                  onClick={() =>
                    atualizar(t.id, (x) => ({
                      ...x,
                      subtarefas: x.subtarefas.filter((y) => y.id !== s.id),
                    }))
                  }
                  className="opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!novaSub.trim()) return;
                atualizar(
                  t.id,
                  (x) => ({
                    ...x,
                    subtarefas: [
                      ...x.subtarefas,
                      { id: uid(), texto: novaSub.trim(), feita: false },
                    ],
                  }),
                  `adicionou o item "${novaSub.trim()}"`,
                );
                setNovaSub("");
              }}
            >
              <input
                className={inputCls}
                placeholder="Novo item do checklist"
                value={novaSub}
                onChange={(e) => setNovaSub(e.target.value)}
              />
              <Button type="submit" size="sm" variant="secondary" className="h-9">
                <Plus className="size-4" />
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="comentarios" className="space-y-3">
            {t.comentarios.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
            )}
            {t.comentarios.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <Avatar nome={c.autor} />
                <div className="min-w-0 flex-1 rounded-xl bg-accent/60 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold">{c.autor}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{c.quando}</span>
                  </div>
                  <p className="mt-0.5 text-sm">{c.texto}</p>
                </div>
              </div>
            ))}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!comentario.trim()) return;
                atualizar(
                  t.id,
                  (x) => ({
                    ...x,
                    comentarios: [
                      ...x.comentarios,
                      {
                        id: uid(),
                        autor: usuario,
                        texto: comentario.trim(),
                        quando: `${dataCurta} às ${hora}`,
                      },
                    ],
                  }),
                  "comentou na tarefa",
                );
                setComentario("");
              }}
            >
              <input
                className={inputCls}
                placeholder="Escreva um comentário para a equipe…"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
              />
              <Button type="submit" size="sm" className="h-9">
                Enviar
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="tempo" className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
              <button
                onClick={toggleTimer}
                className={cn(
                  "grid size-11 place-items-center rounded-full text-white shadow-sm transition-colors",
                  rodando ? "bg-[var(--critical)]" : "bg-[var(--success)]",
                )}
                aria-label={rodando ? "Pausar cronômetro" : "Iniciar cronômetro"}
              >
                {rodando ? <Pause className="size-5" /> : <Play className="size-5" />}
              </button>
              <div>
                <div className="font-mono text-2xl font-semibold tabular-nums">
                  {String(Math.floor(segundos / 3600)).padStart(2, "0")}:
                  {String(Math.floor((segundos % 3600) / 60)).padStart(2, "0")}:
                  {String(segundos % 60).padStart(2, "0")}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {rodando
                    ? "Cronômetro rodando — pause para registrar"
                    : "Play para começar a contar"}
                </div>
              </div>
              <form
                className="ml-auto flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  apontar(Number(manual), "Lançamento manual");
                  setManual("");
                }}
              >
                <input
                  type="number"
                  min={1}
                  className={cn(inputCls, "w-28")}
                  placeholder="minutos"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                />
                <Button type="submit" size="sm" variant="secondary" className="h-9">
                  Lançar
                </Button>
              </form>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total apontado</span>
              <span className="font-mono font-semibold text-foreground">
                {minToH(minutosTotais(t))}
              </span>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border">
              {t.apontamentos.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">Nenhum apontamento.</p>
              )}
              {t.apontamentos.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <Avatar nome={a.autor} />
                  <span className="min-w-0 flex-1 truncate">
                    {a.autor}
                    {a.nota && <span className="text-muted-foreground"> · {a.nota}</span>}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">{a.quando}</span>
                  <span className="w-14 text-right font-mono text-xs font-semibold">
                    {minToH(a.minutos)}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="historico">
            <ol className="relative space-y-3 border-l border-border pl-4">
              {[...t.historico].reverse().map((hh) => (
                <li key={hh.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" />
                  <p className="text-sm">
                    <strong>{hh.autor}</strong> {hh.texto}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">{hh.quando}</p>
                </li>
              ))}
            </ol>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function NovaTarefaDialog({
  open,
  onOpenChange,
  preset,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  preset?: Partial<Pick<Tarefa, "titulo" | "vinculoTipo" | "vinculo" | "descricao" | "prioridade">>;
}) {
  const { usuario, usuarios, processos, clientes, setTarefas, registrar } = useApp();
  const vazio = {
    titulo: "",
    descricao: "",
    prioridade: "Média" as Prioridade,
    responsavel: usuario,
    vinculoTipo: "Processo" as Tarefa["vinculoTipo"],
    vinculo: processos[0]!.numero,
    prazo: HOJE,
  };
  const [f, setF] = useState(vazio);

  useEffect(() => {
    if (open) setF({ ...vazio, ...preset });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const vinculos =
    f.vinculoTipo === "Processo"
      ? processos.map((p) => p.numero)
      : f.vinculoTipo === "Cliente"
        ? clientes.map((c) => c.nome)
        : ["Interno"];

  const salvar = () => {
    if (!f.titulo.trim()) {
      toast.error("Informe o título da tarefa");
      return;
    }
    const { dataCurta, hora } = agoraCarimbo();
    setTarefas((prev) => [
      {
        id: uid(),
        ...f,
        titulo: f.titulo.trim(),
        coluna: "A Fazer",
        subtarefas: [],
        comentarios: [],
        apontamentos: [],
        historico: [
          {
            id: uid(),
            autor: usuario,
            texto:
              f.responsavel === usuario
                ? "criou a tarefa"
                : `criou a tarefa e atribuiu a ${f.responsavel}`,
            quando: `${dataCurta} às ${hora}`,
          },
        ],
      },
      ...prev,
    ]);
    registrar("Criou", "Tarefas", `Criou a tarefa "${f.titulo.trim()}"`);
    toast.success("Tarefa criada");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>
            Crie, vincule a um processo ou cliente e delegue a alguém da equipe.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2">
            <input
              autoFocus
              className={inputCls}
              value={f.titulo}
              onChange={(e) => setF({ ...f, titulo: e.target.value })}
            />
          </Field>
          <Field label="Responsável">
            <select
              className={selectCls}
              value={f.responsavel}
              onChange={(e) => setF({ ...f, responsavel: e.target.value })}
            >
              {usuarios.map((u) => (
                <option key={u.id}>{u.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Prazo">
            <input
              type="date"
              className={inputCls}
              value={f.prazo}
              onChange={(e) => setF({ ...f, prazo: e.target.value })}
            />
          </Field>
          <Field label="Vincular a">
            <select
              className={selectCls}
              value={f.vinculoTipo}
              onChange={(e) => {
                const tipo = e.target.value as Tarefa["vinculoTipo"];
                setF({
                  ...f,
                  vinculoTipo: tipo,
                  vinculo:
                    tipo === "Processo"
                      ? processos[0]!.numero
                      : tipo === "Cliente"
                        ? clientes[0]!.nome
                        : "Interno",
                });
              }}
            >
              <option>Processo</option>
              <option>Cliente</option>
              <option>Interno</option>
            </select>
          </Field>
          <Field label={f.vinculoTipo === "Interno" ? "Vínculo" : f.vinculoTipo}>
            <select
              className={selectCls}
              value={f.vinculo}
              disabled={f.vinculoTipo === "Interno"}
              onChange={(e) => setF({ ...f, vinculo: e.target.value })}
            >
              {vinculos.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Prioridade" className="sm:col-span-2">
            <div className="flex gap-2">
              {PRIORIDADES.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setF({ ...f, prioridade: p })}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                    f.prioridade === p
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent",
                  )}
                >
                  {p === "Alta" ? "Alta / Urgente" : p}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Descrição" className="sm:col-span-2">
            <textarea
              rows={3}
              className={cn(inputCls, "h-auto py-2")}
              value={f.descricao}
              onChange={(e) => setF({ ...f, descricao: e.target.value })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar}>Criar tarefa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
