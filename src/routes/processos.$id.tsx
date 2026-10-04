import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Crown, FileText, Pencil, Plus, Save, UserMinus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  Avatar,
  Chip,
  Empty,
  Field,
  Panel,
  inputCls,
  selectCls,
  statusTone,
  type Tone,
} from "@/components/kit";
import { NovaTarefaDialog, prazoInfo, TarefaDialog, TarefaMenu } from "@/components/TarefaDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tipoTone } from "@/lib/agenda";
import {
  agoraCarimbo,
  AREAS,
  brl,
  fmtDMY,
  STATUS_PROCESSO,
  uid,
  type Area,
  type Processo,
  type ProcessStatus,
  type Risco,
} from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/processos/$id")({
  head: () => ({ meta: [{ title: "Processo — Gestão Jurídica" }] }),
  component: ProcessoPage,
});

const riscoTone: Record<Risco, Tone> = {
  Provável: "critical",
  Possível: "warning",
  Remoto: "success",
};

const ACOES_RAPIDAS = [
  "juntou documento",
  "informou ao cliente",
  "protocolou petição",
  "despachou com o juiz",
  "realizou audiência",
  "fez carga dos autos",
];

function ProcessoPage() {
  const { id } = Route.useParams();
  const {
    processos,
    setProcessos,
    usuario,
    usuarios,
    tarefas,
    eventos,
    documentos,
    pode,
    registrar,
    clientes,
  } = useApp();
  const p = processos.find((x) => x.id === id);
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<Processo | null>(null);
  const [acao, setAcao] = useState("");
  const [complemento, setComplemento] = useState("");
  const [tarefaAberta, setTarefaAberta] = useState<string | null>(null);
  const [novaTarefa, setNovaTarefa] = useState(false);
  const [novoMembro, setNovoMembro] = useState("");

  if (!p)
    return (
      <AppShell title="Processo não encontrado">
        <Link to="/processos" className="text-sm text-primary hover:underline">
          ← Voltar para processos
        </Link>
      </AppShell>
    );

  const podeEditar = pode("Processos") === "editar";
  const cliente = clientes.find((c) => c.nome === p.cliente);

  /** Aplica mudança e grava no histórico quem fez e quando (regra de negócio de logs). */
  const alterar = (fn: (x: Processo) => Processo, mov?: string) => {
    const { data, hora } = agoraCarimbo();
    setProcessos((prev) =>
      prev.map((x) => {
        if (x.id !== p.id) return x;
        const n = fn(x);
        return mov
          ? {
              ...n,
              movimentacoes: [
                ...n.movimentacoes,
                { id: uid(), autor: usuario, acao: mov, data, hora },
              ],
            }
          : n;
      }),
    );
    if (mov) registrar("Editou", "Processos", `${p.numero}: ${mov}`);
  };

  const salvarEdicao = () => {
    if (!rascunho) return;
    const mudou = (
      [
        "vara",
        "tribunal",
        "juiz",
        "fase",
        "valorCausa",
        "area",
        "parteContraria",
        "risco",
        "titulo",
      ] as const
    ).filter((k) => rascunho[k] !== p[k]);
    alterar(
      () => rascunho,
      mudou.length ? `atualizou os dados do processo (${mudou.join(", ")})` : undefined,
    );
    setEditando(false);
    toast.success("Dados salvos");
  };

  const registrarMov = () => {
    const texto = [acao, complemento.trim()].filter(Boolean).join(" ");
    if (!texto) {
      toast.error("Descreva a movimentação");
      return;
    }
    alterar((x) => x, texto);
    setAcao("");
    setComplemento("");
    toast.success("Movimentação registrada no histórico");
  };

  const tarefasProc = tarefas.filter((t) => t.vinculo === p.numero);
  const eventosProc = eventos
    .filter((e) => e.processo === p.numero)
    .sort((a, b) => a.data.localeCompare(b.data));
  const docsProc = documentos.filter((d) => d.processo === p.numero);
  const d = editando && rascunho ? rascunho : p;
  const setD = <K extends keyof Processo>(k: K, v: Processo[K]) =>
    setRascunho((r) => (r ? { ...r, [k]: v } : r));

  return (
    <AppShell title={p.titulo} subtitle={p.numero}>
      <Link
        to="/processos"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Processos
      </Link>

      <div className="glass-panel rise mb-5 flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={statusTone[p.status]}>{p.status}</Chip>
            <Chip tone="brand">{p.area}</Chip>
            <Chip tone={riscoTone[p.risco]}>Risco {p.risco.toLowerCase()}</Chip>
          </div>
          <div className="mt-2 font-mono text-sm">{p.numero}</div>
          <div className="text-xs text-muted-foreground">
            Cliente:{" "}
            {cliente ? (
              <Link
                to="/clientes/$id"
                params={{ id: cliente.id }}
                className="text-primary hover:underline"
              >
                {p.cliente}
              </Link>
            ) : (
              p.cliente
            )}{" "}
            · Distribuído em {p.distribuicao}
          </div>
        </div>
        {podeEditar && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={cn(selectCls, "w-auto")}
              value={p.status}
              onChange={(e) => {
                alterar(
                  (x) => ({ ...x, status: e.target.value as ProcessStatus }),
                  `alterou o status para ${e.target.value}`,
                );
                toast.success(`Status alterado para ${e.target.value}`);
              }}
            >
              {STATUS_PROCESSO.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Tabs defaultValue="dados">
        <TabsList className="mb-4 w-full max-w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="dados">Detalhes</TabsTrigger>
          <TabsTrigger value="historico">
            Histórico{" "}
            <span className="ml-1 font-mono text-[10px] opacity-60">{p.movimentacoes.length}</span>
          </TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="tarefas">
            Tarefas{" "}
            <span className="ml-1 font-mono text-[10px] opacity-60">{tarefasProc.length}</span>
          </TabsTrigger>
          <TabsTrigger value="agenda">Prazos e audiências</TabsTrigger>
          <TabsTrigger value="docs">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Panel
            title="Detalhamento do processo"
            action={
              podeEditar &&
              (editando ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setEditando(false)}>
                    <X className="size-3.5" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={salvarEdicao}>
                    <Save className="size-3.5" /> Salvar
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRascunho(p);
                    setEditando(true);
                  }}
                >
                  <Pencil className="size-3.5" /> Editar
                </Button>
              ))
            }
          >
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <Campo
                label="Título / Ação"
                editando={editando}
                valor={d.titulo}
                onChange={(v) => setD("titulo", v)}
              />
              <Campo
                label="Vara"
                editando={editando}
                valor={d.vara}
                onChange={(v) => setD("vara", v)}
              />
              <Campo
                label="Tribunal"
                editando={editando}
                valor={d.tribunal}
                onChange={(v) => setD("tribunal", v)}
              />
              <Campo
                label="Juiz"
                editando={editando}
                valor={d.juiz}
                onChange={(v) => setD("juiz", v)}
              />
              <Campo
                label="Fase processual"
                editando={editando}
                valor={d.fase}
                onChange={(v) => setD("fase", v)}
              />
              <Field label="Área">
                {editando ? (
                  <select
                    className={selectCls}
                    value={d.area}
                    onChange={(e) => setD("area", e.target.value as Area)}
                  >
                    {AREAS.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm font-medium">{d.area}</span>
                )}
              </Field>
              <Field label="Valor da causa">
                {editando ? (
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    value={d.valorCausa}
                    onChange={(e) =>
                      setD("valorCausa", Number(e.target.value.replace(/\D/g, "")) || 0)
                    }
                  />
                ) : (
                  <span className="font-mono text-sm font-medium">
                    {d.valorCausa ? brl(d.valorCausa) : "Sem valor"}
                  </span>
                )}
              </Field>
              <Field label="Risco de perda (provisão)">
                {editando ? (
                  <select
                    className={selectCls}
                    value={d.risco}
                    onChange={(e) => setD("risco", e.target.value as Risco)}
                  >
                    <option>Provável</option>
                    <option>Possível</option>
                    <option>Remoto</option>
                  </select>
                ) : (
                  <span>
                    <Chip tone={riscoTone[d.risco]}>{d.risco}</Chip>
                  </span>
                )}
              </Field>
              <Campo
                label="Parte contrária"
                editando={editando}
                valor={d.parteContraria}
                onChange={(v) => setD("parteContraria", v)}
              />
            </div>
            <div className="border-t border-border p-5">
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Partes envolvidas
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {p.partes.map((pt) => (
                  <div
                    key={pt.nome}
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2"
                  >
                    <Chip tone={pt.polo === "Autor" ? "brand" : "neutral"}>{pt.polo}</Chip>
                    <span className="text-sm">{pt.nome}</span>
                    {pt.nome === p.cliente && (
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        nosso cliente
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="historico">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <Panel title="Histórico de movimentações" className="lg:col-span-3">
              <ol className="relative m-5 space-y-5 border-l-2 border-border pl-6">
                {[...p.movimentacoes].reverse().map((m) => (
                  <li key={m.id} className="relative">
                    <span className="absolute -left-[37px] top-0">
                      <Avatar nome={m.autor} className="size-6 text-[9px]" />
                    </span>
                    <p className="text-sm leading-snug">
                      <strong>{m.autor.split(" ")[0]}</strong> {m.acao}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {m.data} às {m.hora} · {m.autor}
                    </p>
                  </li>
                ))}
              </ol>
            </Panel>
            {podeEditar && (
              <Panel title="Registrar movimentação" className="lg:col-span-2" delay={60}>
                <div className="space-y-3 p-4">
                  <p className="text-xs text-muted-foreground">
                    Fica registrado em seu nome (<strong>{usuario}</strong>) com data e hora.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ACOES_RAPIDAS.map((a) => (
                      <button
                        key={a}
                        onClick={() => setAcao(a)}
                        className={cn(
                          "rounded-md border px-2 py-1 text-[11px] transition-colors",
                          acao === a
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-accent",
                        )}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    className={cn(inputCls, "h-auto py-2")}
                    placeholder={
                      acao ? `Complemento (ex.: "a data da perícia")` : "Descreva o que foi feito…"
                    }
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                  />
                  {(acao || complemento) && (
                    <div className="rounded-lg bg-accent/60 px-3 py-2 text-xs">
                      Prévia: <strong>{usuario.split(" ")[0]}</strong>{" "}
                      {[acao, complemento.trim()].filter(Boolean).join(" ")} — 09/04/2024
                    </div>
                  )}
                  <Button className="w-full" onClick={registrarMov}>
                    <Plus className="size-4" /> Registrar no histórico
                  </Button>
                </div>
              </Panel>
            )}
          </div>
        </TabsContent>

        <TabsContent value="equipe">
          <Panel title="Equipe envolvida">
            <div className="divide-y divide-border">
              {p.equipe.map((n) => {
                const u = usuarios.find((x) => x.nome === n);
                const principal = p.responsavel === n;
                return (
                  <div key={n} className="flex items-center gap-3 px-4 py-3">
                    <Avatar nome={n} className="size-8" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{n}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {u?.oab ?? "Estagiário(a)"}
                      </div>
                    </div>
                    {principal ? (
                      <Chip tone="brand">
                        <Crown className="size-3" /> Responsável principal
                      </Chip>
                    ) : (
                      podeEditar && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() =>
                              alterar(
                                (x) => ({ ...x, responsavel: n }),
                                `definiu ${n} como responsável principal`,
                              )
                            }
                          >
                            Tornar principal
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label="Remover da equipe"
                            onClick={() =>
                              alterar(
                                (x) => ({ ...x, equipe: x.equipe.filter((y) => y !== n) }),
                                `removeu ${n} da equipe`,
                              )
                            }
                          >
                            <UserMinus className="size-4" />
                          </Button>
                        </>
                      )
                    )}
                  </div>
                );
              })}
            </div>
            {podeEditar && (
              <div className="flex gap-2 border-t border-border p-4">
                <select
                  className={selectCls}
                  value={novoMembro}
                  onChange={(e) => setNovoMembro(e.target.value)}
                >
                  <option value="">Adicionar membro…</option>
                  {usuarios
                    .filter((u) => !p.equipe.includes(u.nome))
                    .map((u) => (
                      <option key={u.id}>{u.nome}</option>
                    ))}
                </select>
                <Button
                  onClick={() => {
                    if (!novoMembro) return;
                    alterar(
                      (x) => ({ ...x, equipe: [...x.equipe, novoMembro] }),
                      `adicionou ${novoMembro} à equipe`,
                    );
                    setNovoMembro("");
                  }}
                >
                  <Plus className="size-4" /> Adicionar
                </Button>
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="tarefas">
          <Panel
            title="Tarefas vinculadas"
            action={
              <Button size="sm" onClick={() => setNovaTarefa(true)}>
                <Plus className="size-3.5" /> Nova tarefa
              </Button>
            }
          >
            <div className="divide-y divide-border">
              {tarefasProc.length === 0 && <Empty>Nenhuma tarefa vinculada.</Empty>}
              {tarefasProc.map((t) => {
                const pz = prazoInfo(t);
                return (
                  <div
                    key={t.id}
                    className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
                  >
                    <button
                      onClick={() => setTarefaAberta(t.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Avatar nome={t.responsavel} />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm font-medium",
                            t.coluna === "Concluído" && "text-muted-foreground line-through",
                          )}
                        >
                          {t.titulo}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {t.responsavel} · {t.coluna}
                        </span>
                      </span>
                      <Chip tone={pz.tone}>{pz.label}</Chip>
                    </button>
                    <TarefaMenu t={t} onEditar={() => setTarefaAberta(t.id)} />
                  </div>
                );
              })}
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="agenda">
          <Panel title="Prazos e audiências do processo">
            <div className="divide-y divide-border">
              {eventosProc.length === 0 && <Empty>Nenhum compromisso vinculado.</Empty>}
              {eventosProc.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn("size-2 shrink-0 rounded-full", tipoTone[e.tipo].dot)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{e.titulo}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {e.tipo} · {e.local} · {e.advogado}
                    </span>
                  </span>
                  <span className="font-mono text-xs">
                    {fmtDMY(e.data)} {e.hora}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="docs">
          <Panel
            title="Documentos do processo"
            action={
              <Link
                to="/documentos"
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Abrir GED →
              </Link>
            }
          >
            <div className="divide-y divide-border">
              {docsProc.length === 0 && <Empty>Nenhum documento.</Empty>}
              {docsProc.map((doc) => {
                const ult = doc.versoes[doc.versoes.length - 1]!;
                return (
                  <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{doc.nome}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {doc.pasta} · {ult.versao} por {ult.autor} em {ult.quando}
                      </span>
                    </span>
                    <Chip>{doc.versoes.length} versões</Chip>
                  </div>
                );
              })}
            </div>
          </Panel>
        </TabsContent>
      </Tabs>

      <TarefaDialog tarefaId={tarefaAberta} onOpenChange={(o) => !o && setTarefaAberta(null)} />
      <NovaTarefaDialog
        open={novaTarefa}
        onOpenChange={setNovaTarefa}
        preset={{ vinculoTipo: "Processo", vinculo: p.numero }}
      />
    </AppShell>
  );
}

function Campo({
  label,
  valor,
  editando,
  onChange,
}: {
  label: string;
  valor: string;
  editando: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      {editando ? (
        <input className={inputCls} value={valor} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <span className="text-sm font-medium">{valor || "—"}</span>
      )}
    </Field>
  );
}
