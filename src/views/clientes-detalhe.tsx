"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Link, useNavigate } from "@/lib/navegacao";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  FileText,
  FileUp,
  HandCoins,
  Mail,
  MapPin,
  NotebookPen,
  Pencil,
  Phone,
  Plus,
  Save,
  Trash2,
  Upload,
  User,
  Wallet,
  type LucideIcon,
  Download,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  Chip,
  Empty,
  Field,
  Panel,
  inputCls,
  selectCls,
  statusTone,
  type Tone,
} from "@/components/kit";
import {
  EditarLancamentoDialog,
  lerValor,
  NovoLancamentoDialog,
  NovoLancamentoForm,
  situacaoTone,
  useAcoesLancamento,
} from "@/components/LancamentoDialog";
import { ordemTarefas, QuadroTarefas } from "@/components/QuadroTarefas";
import { NovaTarefaDialog, TarefaDialog } from "@/components/TarefaDialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  agoraCarimbo,
  brl,
  diasAte,
  docsPendentes,
  fmtDMY,
  HOJE,
  recebidoDe,
  saldoDe,
  uid,
  type Cliente,
  type Contrato,
  type Lancamento,
} from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

const ABAS = ["cadastro", "processos", "documentos", "contratos", "tarefas", "financeiro"] as const;
type Aba = (typeof ABAS)[number];

function ClientePage() {
  const { id } = useParams<{ id: string }>();
  const busca = useSearchParams().get("aba");
  const aba: Aba = ABAS.includes(busca as Aba) ? (busca as Aba) : "cadastro";
  const navigate = useNavigate();
  const { carregando, clientes, setClientes, processos, tarefas, lancamentos, contratos, pode } =
    useApp();
  const c = clientes.find((x) => x.id === id);
  const [tarefaAberta, setTarefaAberta] = useState<string | null>(null);
  const [criarTarefa, setCriarTarefa] = useState(false);

  const tarefasCliente = useMemo(
    () => tarefas.filter((t) => t.clienteId === id).sort(ordemTarefas),
    [tarefas, id],
  );

  if (!c && carregando) return <AppShell title="Carregando…">{null}</AppShell>;
  if (!c)
    return (
      <AppShell title="Cliente não encontrado">
        <Link to="/clientes" className="text-sm text-primary hover:underline">
          ← Voltar para clientes
        </Link>
      </AppShell>
    );

  const podeEditar = pode("Clientes") === "editar";
  const verFinanceiro = pode("Financeiro") !== "nenhum";
  const pend = docsPendentes(c);
  const vinculados = processos.filter(
    (p) => p.cliente === c.nome || p.partes.some((pt) => pt.nome === c.nome),
  );
  const contratosCliente = contratos.filter((x) => x.cliente === c.nome);
  const lancamentosCliente = lancamentos.filter((l) => l.clienteId === c.id);
  const alterar = (fn: (x: Cliente) => Cliente) =>
    setClientes((prev) => prev.map((x) => (x.id === c.id ? fn(x) : x)));
  const irPara = (a: Aba) =>
    navigate({ search: a === "cadastro" ? {} : { aba: a }, replace: true, resetScroll: false });

  const contagem = (n: number) =>
    n > 0 && <span className="ml-1 text-[10px] font-normal text-muted-foreground">{n}</span>;

  return (
    <AppShell title={c.nome} subtitle={`${c.tipo} · ${c.documento}`}>
      <Link
        to="/clientes"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Clientes
      </Link>

      <Tabs
        value={aba === "financeiro" && !verFinanceiro ? "cadastro" : aba}
        onValueChange={(v) => irPara(v as Aba)}
      >
        <TabsList className="mb-4 w-full max-w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="cadastro">Dados do Cadastro</TabsTrigger>
          <TabsTrigger value="processos">Processos{contagem(vinculados.length)}</TabsTrigger>
          <TabsTrigger value="documentos">
            Documentos
            {pend.length > 0 && (
              <span className="ml-1.5 size-1.5 rounded-full bg-[var(--critical)]" />
            )}
          </TabsTrigger>
          <TabsTrigger value="contratos">Contratos{contagem(contratosCliente.length)}</TabsTrigger>
          <TabsTrigger value="tarefas">Tarefas{contagem(tarefasCliente.length)}</TabsTrigger>
          {verFinanceiro && <TabsTrigger value="financeiro">Financeiro</TabsTrigger>}
        </TabsList>

        {pend.length > 0 && (
          <button
            type="button"
            onClick={() => irPara("documentos")}
            className="rise mb-5 flex w-full flex-wrap items-center gap-3 rounded-2xl border border-[var(--critical)]/30 bg-[var(--critical-soft)] px-4 py-3 text-left"
          >
            <AlertTriangle className="size-5 shrink-0 text-[var(--critical)]" />
            <div className="min-w-0 flex-1 text-sm">
              <strong className="text-[var(--critical)]">Documentação pendente.</strong> Falta
              anexar: {pend.map((d) => d.nome).join(", ")}.
            </div>
          </button>
        )}

        <TabsContent value="cadastro">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-1">
              <CardCadastro c={c} nProcessos={vinculados.length} />
              <CardContatos c={c} podeEditar={podeEditar} alterar={alterar} />
              <CardEnderecos c={c} />
            </div>

            <div className="min-w-0 space-y-5 lg:col-span-2">
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold tracking-tight">Tarefas do cliente</h2>
                  <Button size="sm" variant="secondary" onClick={() => setCriarTarefa(true)}>
                    <Plus className="size-3.5" /> Nova tarefa
                  </Button>
                </div>
                <QuadroTarefas
                  lista={tarefasCliente}
                  limite={3}
                  mostrarVinculo={false}
                  onVerTudo={() => irPara("tarefas")}
                  onAbrir={setTarefaAberta}
                />
              </section>
              <CardDescricaoCaso c={c} podeEditar={podeEditar} alterar={alterar} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="processos">
          <AbaProcessos lista={vinculados} />
        </TabsContent>

        <TabsContent value="documentos">
          <AbaDocumentos c={c} podeEditar={podeEditar} alterar={alterar} />
        </TabsContent>

        <TabsContent value="contratos">
          <AbaContratos c={c} lista={contratosCliente} podeEditar={podeEditar} />
        </TabsContent>

        <TabsContent value="tarefas">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Tarefas vinculadas a {c.nome} e aos processos dele(a).
              </p>
              <Button size="sm" onClick={() => setCriarTarefa(true)}>
                <Plus className="size-3.5" /> Nova tarefa
              </Button>
            </div>
            <QuadroTarefas
              lista={tarefasCliente}
              limite={Infinity}
              mostrarVinculo
              vazio="Nenhuma tarefa aqui."
              onVerTudo={() => irPara("tarefas")}
              onAbrir={setTarefaAberta}
            />
          </div>
        </TabsContent>

        {verFinanceiro && (
          <TabsContent value="financeiro">
            <AbaFinanceiro c={c} lista={lancamentosCliente} />
          </TabsContent>
        )}
      </Tabs>

      <TarefaDialog tarefaId={tarefaAberta} onOpenChange={(o) => !o && setTarefaAberta(null)} />
      <NovaTarefaDialog
        open={criarTarefa}
        onOpenChange={setCriarTarefa}
        preset={{ vinculoTipo: "Cliente", vinculo: c.nome }}
      />
    </AppShell>
  );
}

type Alterar = (fn: (x: Cliente) => Cliente) => void;

function CardCadastro({ c, nProcessos }: { c: Cliente; nProcessos: number }) {
  const pf = c.tipo === "Pessoa Física";
  return (
    <Panel>
      <div className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-soft-foreground)]">
            {pf ? <User className="size-6" /> : <Building2 className="size-6" />}
          </span>
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground">{pf ? "Nome" : "Razão social"}</div>
            <div className="font-semibold leading-tight">{c.nome}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Chip tone={c.status === "Ativo" ? "success" : "neutral"}>{c.status}</Chip>
              <Chip>{pf ? "PF" : "PJ"}</Chip>
            </div>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[11px] text-muted-foreground">{pf ? "CPF" : "CNPJ"}</dt>
            <dd className="font-mono text-xs">{c.documento}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">
              {pf ? "RG" : "Inscrição estadual"}
            </dt>
            <dd className="font-mono text-xs">{c.documento2 || "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Cliente desde</dt>
            <dd className="font-mono text-xs">{c.desde}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Processos vinculados</dt>
            <dd className="font-mono text-xs">{nProcessos}</dd>
          </div>
        </dl>
      </div>
    </Panel>
  );
}

function CardContatos({
  c,
  podeEditar,
  alterar,
}: {
  c: Cliente;
  podeEditar: boolean;
  alterar: Alterar;
}) {
  const [novo, setNovo] = useState({ tipo: "E-mail", valor: "" });
  const icone = (tipo: string) =>
    tipo === "E-mail" ? Mail : tipo === "Responsável" ? User : Phone;

  return (
    <Panel title="Contatos" delay={40}>
      <div className="divide-y divide-border">
        {c.contatos.length === 0 && <Empty>Nenhum contato.</Empty>}
        {c.contatos.map((ct) => {
          const Icon = icone(ct.tipo);
          return (
            <div key={ct.id} className="group flex items-center gap-3 px-4 py-2.5">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] text-muted-foreground">{ct.tipo}</span>
                <span className="block truncate text-sm">{ct.valor}</span>
              </span>
              {podeEditar && (
                <button
                  aria-label="Remover contato"
                  className="opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
                  onClick={() =>
                    alterar((x) => ({ ...x, contatos: x.contatos.filter((y) => y.id !== ct.id) }))
                  }
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {podeEditar && (
        <form
          className="flex gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!novo.valor.trim()) return;
            alterar((x) => ({
              ...x,
              contatos: [...x.contatos, { id: uid(), ...novo, valor: novo.valor.trim() }],
            }));
            setNovo({ ...novo, valor: "" });
          }}
        >
          <select
            className={cn(inputCls, "w-28 shrink-0")}
            value={novo.tipo}
            onChange={(e) => setNovo({ ...novo, tipo: e.target.value })}
          >
            {["E-mail", "Celular", "Telefone", "WhatsApp", "Responsável"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input
            className={inputCls}
            placeholder="Novo contato"
            value={novo.valor}
            onChange={(e) => setNovo({ ...novo, valor: e.target.value })}
          />
          <Button
            type="submit"
            size="icon"
            variant="secondary"
            className="shrink-0"
            aria-label="Adicionar"
          >
            <Plus className="size-4" />
          </Button>
        </form>
      )}
    </Panel>
  );
}

function CardEnderecos({ c }: { c: Cliente }) {
  return (
    <Panel title="Endereços" delay={80}>
      <div className="divide-y divide-border">
        {c.enderecos.length === 0 && <Empty>Nenhum endereço.</Empty>}
        {c.enderecos.map((en) => (
          <div key={en.id} className="flex items-start gap-3 px-4 py-2.5">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 text-sm">
              <span className="block text-[11px] text-muted-foreground">{en.rotulo}</span>
              {en.logradouro}
              <span className="block text-xs text-muted-foreground">
                {en.cidade} · CEP {en.cep}
              </span>
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CardDescricaoCaso({
  c,
  podeEditar,
  alterar,
}: {
  c: Cliente;
  podeEditar: boolean;
  alterar: Alterar;
}) {
  const { usuario, registrar } = useApp();
  const salvo = c.descricaoCaso ?? "";
  const [texto, setTexto] = useState(salvo);
  const alterado = texto !== salvo;

  useEffect(() => setTexto(c.descricaoCaso ?? ""), [c.id, c.descricaoCaso]);

  const salvar = () => {
    const { data, hora } = agoraCarimbo();
    alterar((x) => ({
      ...x,
      descricaoCaso: texto.trim(),
      descricaoCasoEm: `${data} às ${hora} por ${usuario}`,
    }));
    registrar("Editou", "Clientes", `Atualizou a descrição do caso de ${c.nome}`);
    toast.success("Descrição do caso salva");
  };

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <NotebookPen className="size-4 text-muted-foreground" />
          Descrição do Caso / Observações do Cliente
        </span>
      }
      delay={120}
    >
      <div className="space-y-3 p-4">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          readOnly={!podeEditar}
          rows={7}
          placeholder="Resumo do caso, estratégia, pontos de atenção, combinados com o cliente…"
          className="min-h-36 resize-y bg-background/60 text-sm leading-relaxed"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
              e.preventDefault();
              if (alterado) salvar();
            }
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {alterado
              ? "Alterações não salvas"
              : c.descricaoCasoEm
                ? `Última atualização em ${c.descricaoCasoEm}`
                : "Nenhuma observação registrada ainda."}
          </span>
          {podeEditar && (
            <div className="flex gap-2">
              {alterado && (
                <Button size="sm" variant="ghost" onClick={() => setTexto(salvo)}>
                  Descartar
                </Button>
              )}
              <Button size="sm" disabled={!alterado} onClick={salvar}>
                <Save className="size-3.5" /> Salvar
              </Button>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function AbaProcessos({ lista }: { lista: ReturnType<typeof useApp>["processos"] }) {
  const navigate = useNavigate();
  return (
    <Panel title="Processos vinculados">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Processo</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer"
                onClick={() => navigate({ to: "/processos/$id", params: { id: p.id } })}
              >
                <TableCell>
                  <div className="font-medium">{p.titulo}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{p.numero}</div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">{p.area}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{p.fase}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{p.responsavel}</TableCell>
                <TableCell>
                  <Chip tone={statusTone[p.status]}>{p.status}</Chip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {lista.length === 0 && <Empty>Nenhum processo vinculado.</Empty>}
      </div>
    </Panel>
  );
}

function AbaDocumentos({
  c,
  podeEditar,
  alterar,
}: {
  c: Cliente;
  podeEditar: boolean;
  alterar: Alterar;
}) {
  const { documentos, processos, anexarDocCliente } = useApp();
  const [novoDoc, setNovoDoc] = useState("");
  const inputArquivo = useRef<HTMLInputElement>(null);
  const alvoUpload = useRef<string | null>(null);
  const pend = docsPendentes(c);
  const numeros = processos.filter((p) => p.cliente === c.nome).map((p) => p.numero);
  const docsProcessos = documentos.filter((d) => numeros.includes(d.processo));

  const onArquivo = async (file: File | undefined) => {
    const docId = alvoUpload.current;
    if (inputArquivo.current) inputArquivo.current.value = "";
    if (!file || !docId) return;
    if (await anexarDocCliente(c.id, docId, file))
      toast.success("Documento anexado", { description: file.name });
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <input
        ref={inputArquivo}
        type="file"
        className="hidden"
        onChange={(e) => void onArquivo(e.target.files?.[0])}
      />
      <Panel
        title={
          <span className="flex items-center gap-2">
            Documentos pessoais
            {pend.length > 0 ? (
              <Chip tone="critical">
                {pend.length} pendente{pend.length > 1 ? "s" : ""}
              </Chip>
            ) : (
              <Chip tone="success">Completa</Chip>
            )}
          </span>
        }
      >
        <div className="divide-y divide-border">
          {c.documentos.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              {d.arquivo ? (
                <CheckCircle2 className="size-5 shrink-0 text-[var(--success)]" />
              ) : (
                <AlertTriangle className="size-5 shrink-0 text-[var(--critical)]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {d.nome}
                  {d.obrigatorio && (
                    <span className="text-[10px] font-normal text-muted-foreground">
                      obrigatório
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {d.arquivo
                    ? `${d.arquivo} · enviado por ${d.enviadoPor} em ${d.enviadoEm}`
                    : "Não anexado"}
                </div>
              </div>
              {d.arquivo && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={`/api/clientes/${c.id}/documentos/${d.id}/arquivo`} download>
                    <Download className="size-3.5" /> Baixar
                  </a>
                </Button>
              )}
              {podeEditar && (
                <Button
                  size="sm"
                  variant={d.arquivo ? "ghost" : "default"}
                  onClick={() => {
                    alvoUpload.current = d.id;
                    inputArquivo.current?.click();
                  }}
                >
                  {d.arquivo ? <FileUp className="size-3.5" /> : <Upload className="size-3.5" />}
                  {d.arquivo ? "Substituir" : "Anexar"}
                </Button>
              )}
            </div>
          ))}
        </div>
        {podeEditar && (
          <form
            className="flex gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!novoDoc.trim()) return;
              alterar((x) => ({
                ...x,
                documentos: [
                  ...x.documentos,
                  { id: uid(), nome: novoDoc.trim(), obrigatorio: false },
                ],
              }));
              setNovoDoc("");
              toast.success("Documento adicionado à lista", {
                description: "Use “Anexar” para enviar o arquivo.",
              });
            }}
          >
            <input
              className={inputCls}
              placeholder="Outro documento (ex.: certidão de casamento)"
              value={novoDoc}
              onChange={(e) => setNovoDoc(e.target.value)}
            />
            <Button type="submit" variant="secondary" className="h-9 shrink-0">
              <Plus className="size-4" /> Adicionar
            </Button>
          </form>
        )}
      </Panel>

      <Panel title="Documentos dos processos" delay={60}>
        <div className="divide-y divide-border">
          {docsProcessos.length === 0 && (
            <Empty>Nenhum documento nos processos deste cliente.</Empty>
          )}
          {docsProcessos.map((d) => {
            const ultima = d.versoes[d.versoes.length - 1];
            return (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{d.nome}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {d.pasta} · <span className="font-mono">{d.processo}</span>
                  </div>
                </div>
                {ultima && (
                  <span className="shrink-0 text-right text-[11px] text-muted-foreground">
                    <span className="font-mono">{ultima.versao}</span>
                    <span className="block">{ultima.quando}</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

const assinaturaTone: Record<Contrato["assinatura"], Tone> = {
  "Não enviado": "neutral",
  "Aguardando assinatura": "warning",
  Assinado: "success",
};

function AbaContratos({
  c,
  lista,
  podeEditar,
}: {
  c: Cliente;
  lista: Contrato[];
  podeEditar: boolean;
}) {
  const { setContratos, registrar } = useApp();
  const [novo, setNovo] = useState(false);
  const ordenados = [...lista].sort((a, b) => a.fim.localeCompare(b.fim));

  const assinar = (ct: Contrato, assinatura: Contrato["assinatura"]) => {
    setContratos((prev) => prev.map((x) => (x.id === ct.id ? { ...x, assinatura } : x)));
    registrar("Editou", "Contratos", `${ct.titulo} — ${c.nome}: ${assinatura}`);
    toast.success(assinatura);
  };

  return (
    <Panel
      title="Contratos do cliente"
      action={
        podeEditar && (
          <Button size="sm" onClick={() => setNovo(true)}>
            <Plus className="size-3.5" /> Novo contrato
          </Button>
        )
      }
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contrato</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Assinatura</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenados.map((ct) => {
              const d = diasAte(ct.fim);
              const tone: Tone = d < 0 ? "critical" : d <= 30 ? "warning" : "neutral";
              return (
                <TableRow key={ct.id}>
                  <TableCell className="min-w-[200px] font-medium">{ct.titulo}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                    {fmtDMY(ct.inicio)} – {fmtDMY(ct.fim)}
                  </TableCell>
                  <TableCell>
                    <Chip tone={tone}>
                      {d < 0
                        ? `vencido há ${-d}d`
                        : d <= 30
                          ? `vence em ${d}d`
                          : `${Math.round(d / 30)} meses`}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip tone={assinaturaTone[ct.assinatura]}>{ct.assinatura}</Chip>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono text-xs">
                    {ct.valor ? brl(ct.valor) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {podeEditar && ct.assinatura === "Não enviado" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => assinar(ct, "Aguardando assinatura")}
                      >
                        Enviar p/ assinatura
                      </Button>
                    )}
                    {podeEditar && ct.assinatura === "Aguardando assinatura" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => assinar(ct, "Assinado")}
                      >
                        Marcar assinado
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {ordenados.length === 0 && <Empty>Nenhum contrato para este cliente.</Empty>}
      </div>
      <NovoContratoDialog cliente={c.nome} open={novo} onOpenChange={setNovo} />
    </Panel>
  );
}

function NovoContratoDialog({
  cliente,
  open,
  onOpenChange,
}: {
  cliente: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { setContratos, registrar } = useApp();
  const vazio = { titulo: "Contrato de honorários", inicio: HOJE, fim: "", valor: "" };
  const [f, setF] = useState(vazio);

  useEffect(() => {
    if (open) setF(vazio);
  }, [open]);

  const salvar = () => {
    if (!f.titulo.trim() || !f.fim) {
      toast.error("Informe título e data de término");
      return;
    }
    setContratos((prev) => [
      {
        id: uid(),
        titulo: f.titulo.trim(),
        cliente,
        inicio: f.inicio,
        fim: f.fim,
        valor: lerValor(f.valor) || 0,
        assinatura: "Não enviado",
      },
      ...prev,
    ]);
    registrar("Criou", "Contratos", `Criou "${f.titulo.trim()}" para ${cliente}`);
    toast.success("Contrato criado");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo contrato</DialogTitle>
          <DialogDescription>{cliente}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Título" className="col-span-2">
            <input
              autoFocus
              className={inputCls}
              value={f.titulo}
              onChange={(e) => setF({ ...f, titulo: e.target.value })}
            />
          </Field>
          <Field label="Início">
            <input
              type="date"
              className={inputCls}
              value={f.inicio}
              onChange={(e) => setF({ ...f, inicio: e.target.value })}
            />
          </Field>
          <Field label="Término">
            <input
              type="date"
              className={inputCls}
              value={f.fim}
              onChange={(e) => setF({ ...f, fim: e.target.value })}
            />
          </Field>
          <Field label="Valor (R$)" className="col-span-2">
            <input
              className={cn(inputCls, "font-mono")}
              inputMode="decimal"
              value={f.valor}
              onChange={(e) => setF({ ...f, valor: e.target.value })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar}>Criar contrato</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AbaFinanceiro({ c, lista }: { c: Cliente; lista: Lancamento[] }) {
  const [novo, setNovo] = useState<Lancamento["tipo"] | null>(null);
  const [editando, setEditando] = useState<Lancamento | null>(null);
  const [filtro, setFiltro] = useState<"Todos" | "Em aberto" | "Pagos">("Todos");
  const [excluindo, setExcluindo] = useState<Lancamento | null>(null);
  const { excluir } = useAcoesLancamento();

  const honorarios = lista.filter((l) => l.tipo === "Receber");
  const despesas = lista.filter((l) => l.tipo === "Pagar");
  const preAcordado = honorarios.reduce((s, l) => s + l.valor, 0);
  const recebido = honorarios.reduce((s, l) => s + recebidoDe(l), 0);
  const aReceber = preAcordado - recebido;
  const atrasado = honorarios
    .filter(
      (l) => l.situacao !== "Pago" && (l.situacao === "Atrasado" || diasAte(l.vencimento) < 0),
    )
    .reduce((s, l) => s + saldoDe(l), 0);
  const pct = preAcordado ? Math.round((recebido / preAcordado) * 100) : 0;

  const visiveis = lista
    .filter((l) =>
      filtro === "Todos"
        ? true
        : filtro === "Pagos"
          ? l.situacao === "Pago"
          : l.situacao !== "Pago",
    )
    .sort(
      (a, b) =>
        Number(a.situacao === "Pago") - Number(b.situacao === "Pago") ||
        a.vencimento.localeCompare(b.vencimento),
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {honorarios.length} lançamento{honorarios.length === 1 ? "" : "s"} de honorários · totais
          sincronizados com o{" "}
          <Link to="/financeiro" className="font-medium text-foreground hover:underline">
            Financeiro geral
          </Link>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setNovo("Pagar")}>
            <Plus className="size-3.5" /> Despesa / custas
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CardTotal
          icone={Wallet}
          rotulo="Valor pré-acordado total"
          valor={brl(preAcordado)}
          nota="soma de todos os acordos"
        />
        <CardTotal
          icone={CheckCircle2}
          rotulo="Valor recebido total"
          valor={brl(recebido)}
          nota={`${pct}% do pré-acordado`}
          tom="success"
          delay={60}
        >
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent">
            <div
              className="h-full rounded-full bg-[var(--success)] transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardTotal>
        <CardTotal
          icone={HandCoins}
          rotulo="Falta receber (saldo restante)"
          valor={brl(aReceber)}
          nota={atrasado > 0 ? `${brl(atrasado)} em atraso` : "pré-acordado − recebido"}
          tom={atrasado > 0 ? "critical" : "brand"}
          delay={120}
        />
      </section>

      <Panel title="Novo lançamento" bodyClassName="p-4" delay={60}>
        <NovoLancamentoForm tipo="Receber" clienteFixo={c.nome} />
      </Panel>

      <Panel
        title={
          <span className="flex items-center gap-2">
            Lançamentos
            <span className="hidden text-[11px] font-normal text-muted-foreground sm:inline">
              {honorarios.length} honorário{honorarios.length === 1 ? "" : "s"} · {despesas.length}{" "}
              despesa{despesas.length === 1 ? "" : "s"}
            </span>
          </span>
        }
        action={
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-accent p-0.5 text-xs font-medium">
            {(["Todos", "Em aberto", "Pagos"] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setFiltro(o)}
                className={cn(
                  "whitespace-nowrap rounded-md px-2.5 py-1.5 transition-colors",
                  filtro === o
                    ? "glass-soft text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {o}
              </button>
            ))}
          </div>
        }
        delay={60}
      >
        {visiveis.length === 0 && <Empty>Nenhum lançamento.</Empty>}

        {visiveis.length > 0 && (
          <div className="hidden grid-cols-[88px_minmax(0,1fr)_120px_120px_120px_176px] items-center gap-4 border-b border-border bg-accent/30 px-5 py-2 text-[11px] font-medium text-muted-foreground md:grid">
            <span>Data</span>
            <span>Descrição</span>
            <span className="text-right">Pré-acordado</span>
            <span className="text-right">Recebido</span>
            <span>Situação</span>
            <span className="text-right">Ações</span>
          </div>
        )}

        <ul className="divide-y divide-border">
          {visiveis.map((l) => (
            <LinhaLancamento
              key={l.id}
              l={l}
              onEditar={() => setEditando(l)}
              onExcluir={() => setExcluindo(l)}
            />
          ))}
        </ul>
      </Panel>

      <NovoLancamentoDialog tipo={novo} clienteFixo={c.nome} onClose={() => setNovo(null)} />
      <EditarLancamentoDialog lancamento={editando} onClose={() => setEditando(null)} />
      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {excluindo && (
                <>
                  <strong className="text-foreground">{excluindo.descricao}</strong> (
                  {brl(excluindo.valor)}) será removido daqui e do Financeiro geral. Não dá para
                  desfazer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--critical)] text-white hover:bg-[var(--critical)]/90"
              onClick={() => excluindo && excluir(excluindo)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CardTotal({
  icone: Icone,
  rotulo,
  valor,
  nota,
  tom,
  delay = 0,
  children,
}: {
  icone: LucideIcon;
  rotulo: string;
  valor: string;
  nota: string;
  tom?: Tone;
  delay?: number;
  children?: ReactNode;
}) {
  const cor =
    tom === "success"
      ? "text-[var(--success)]"
      : tom === "critical"
        ? "text-[var(--critical)]"
        : tom === "brand"
          ? "text-primary"
          : "text-foreground";
  const fundo =
    tom === "success"
      ? "bg-[var(--success-soft)] text-[var(--success)]"
      : tom === "critical"
        ? "bg-[var(--critical-soft)] text-[var(--critical)]"
        : "bg-[var(--brand-soft)] text-[var(--brand-soft-foreground)]";
  return (
    <div
      className={cn(
        "glass-panel rise rounded-2xl p-5",
        tom === "critical" && "ring-1 ring-[var(--critical)]/25",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", fundo)}>
          <Icone className="size-4" />
        </span>
        <span className="truncate text-xs font-medium text-muted-foreground">{rotulo}</span>
      </div>
      <div className={cn("mt-3 truncate font-mono text-2xl font-bold tracking-tight", cor)}>
        {valor}
      </div>
      <div className="mt-1 truncate text-[11px] text-muted-foreground">{nota}</div>
      {children}
    </div>
  );
}

function LinhaLancamento({
  l,
  onEditar,
  onExcluir,
}: {
  l: Lancamento;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const receita = l.tipo === "Receber";
  const pago = l.situacao === "Pago";
  const rec = recebidoDe(l);
  const pct = l.valor ? Math.round((rec / l.valor) * 100) : 0;
  const d = diasAte(l.vencimento);
  const vencido = !pago && d < 0;
  const situacao: Lancamento["situacao"] = vencido ? "Atrasado" : l.situacao;
  const [dia, mes, ano] = fmtDMY(l.vencimento).split("/");

  return (
    <li className="group grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-accent/40 md:grid-cols-[88px_minmax(0,1fr)_120px_120px_120px_176px]">
      <div className="row-span-2 flex flex-col items-center justify-center rounded-xl border border-border bg-background/50 py-1.5 md:row-span-1 md:flex-row md:justify-start md:gap-1.5 md:border-0 md:bg-transparent md:py-0">
        <CalendarDays className="hidden size-3.5 text-muted-foreground md:block" />
        <span className="font-mono text-base font-bold leading-none md:hidden">{dia}</span>
        <span className="font-mono text-[10px] uppercase text-muted-foreground md:hidden">
          {mesCurto(mes)}
        </span>
        <span className="hidden font-mono text-xs md:inline">
          {dia}/{mes}/{ano?.slice(2)}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              receita ? "bg-[var(--success)]" : "bg-muted-foreground",
            )}
          />
          <span className="truncate text-sm font-semibold">{l.descricao}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-3.5 text-[11px] text-muted-foreground">
          <span>{receita ? l.modelo : `Despesa · ${l.categoria}`}</span>
          {l.parcela && <span className="font-mono">parcela {l.parcela}</span>}
          {l.processo && <span className="truncate font-mono">{l.processo}</span>}
        </div>
        {receita && !pago && rec > 0 && (
          <div className="mt-1.5 ml-3.5 h-1 max-w-48 overflow-hidden rounded-full bg-accent">
            <div className="h-full rounded-full bg-[var(--success)]" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      <div className="text-right md:contents">
        <div className="font-mono text-sm font-semibold md:text-right">
          {!receita && "− "}
          {brl(l.valor)}
        </div>
        <div className="font-mono text-[11px] text-[var(--success)] md:text-right md:text-sm">
          {receita ? rec > 0 ? brl(rec) : <span className="text-muted-foreground">—</span> : null}
        </div>
      </div>

      <div className="col-start-2 col-end-4 flex items-center justify-between gap-2 md:col-auto md:justify-start">
        <Chip tone={situacaoTone[situacao]}>
          {pago ? <Check className="size-3" /> : null}
          {situacao}
        </Chip>
        {!pago && (
          <span className="whitespace-nowrap text-[10px] text-muted-foreground md:hidden">
            {d === 0 ? "vence hoje" : d > 0 ? `em ${d}d` : `há ${-d}d`}
          </span>
        )}
        <div className="md:hidden">
          <AcoesLancamento l={l} onEditar={onEditar} onExcluir={onExcluir} />
        </div>
      </div>
      <div className="hidden justify-end md:flex">
        <AcoesLancamento l={l} onEditar={onEditar} onExcluir={onExcluir} />
      </div>
    </li>
  );
}

function AcoesLancamento({
  l,
  onEditar,
  onExcluir,
}: {
  l: Lancamento;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 px-2 text-xs sm:px-2.5"
        aria-label={`Editar ${l.descricao}`}
        onClick={onEditar}
      >
        <Pencil className="size-3.5" />
        <span className="hidden sm:inline">Editar</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 border-[var(--critical)]/30 px-2 text-xs sm:px-2.5 text-[var(--critical)] hover:bg-[var(--critical-soft)] hover:text-[var(--critical)]"
        aria-label={`Excluir ${l.descricao}`}
        onClick={onExcluir}
      >
        <Trash2 className="size-3.5" />
        <span className="hidden sm:inline">Excluir</span>
      </Button>
    </div>
  );
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mesCurto = (mm: string | undefined) => MESES[Number(mm) - 1] ?? mm;

export default ClientePage;
