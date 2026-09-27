import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  FileDown,
  FilePlus2,
  FileSignature,
  FileText,
  Send,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  Chip,
  Empty,
  Field,
  NotaPrototipo,
  Panel,
  inputCls,
  selectCls,
  type Tone,
} from "@/components/kit";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { brl, diasAte, fmtDMY, uid, type Contrato } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contratos")({
  head: () => ({ meta: [{ title: "Contratos e Peças — Gestão Jurídica" }] }),
  component: ContratosPage,
});

const assinaturaTone: Record<Contrato["assinatura"], Tone> = {
  Assinado: "success",
  "Aguardando assinatura": "warning",
  "Não enviado": "neutral",
};

function destacar(texto: string) {
  return texto.split(/(\{[A-Z_]+\})/g).map((parte, i) =>
    /^\{[A-Z_]+\}$/.test(parte) ? (
      <mark
        key={i}
        className="rounded bg-[var(--brand-soft)] px-1 font-mono text-[11px] text-[var(--brand-soft-foreground)]"
      >
        {parte}
      </mark>
    ) : (
      <span key={i}>{parte}</span>
    ),
  );
}

function ContratosPage() {
  const [aba, setAba] = useState("modelos");
  const [modeloGerar, setModeloGerar] = useState<string | null>(null);
  return (
    <AppShell
      title="Contratos e Peças"
      subtitle="modelos do escritório, geração de documentos e assinatura eletrônica"
    >
      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="mb-4 w-full max-w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="modelos">Biblioteca de modelos</TabsTrigger>
          <TabsTrigger value="gerar">Gerar documento</TabsTrigger>
          <TabsTrigger value="contratos">Contratos e vencimentos</TabsTrigger>
        </TabsList>
        <TabsContent value="modelos">
          <Biblioteca
            onUsar={(id) => {
              setModeloGerar(id);
              setAba("gerar");
            }}
          />
        </TabsContent>
        <TabsContent value="gerar">
          <Gerador modeloInicial={modeloGerar} />
        </TabsContent>
        <TabsContent value="contratos">
          <Contratos />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Biblioteca({ onUsar }: { onUsar: (id: string) => void }) {
  const { modelos, setModelos, registrar, pode } = useApp();
  const [sel, setSel] = useState(modelos[0]?.id ?? "");
  const [cat, setCat] = useState("Todos");
  const input = useRef<HTMLInputElement>(null);
  const atual = modelos.find((m) => m.id === sel);
  const lista = modelos.filter((m) => cat === "Todos" || m.categoria === cat);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      <input
        ref={input}
        type="file"
        accept=".docx,.doc"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const id = uid();
          setModelos((prev) => [
            ...prev,
            {
              id,
              nome: f.name.replace(/\.docx?$/, ""),
              categoria: "Peças",
              tags: ["{NOME_DO_CLIENTE}"],
              corpo: `Modelo importado de ${f.name}.\n\nCliente: {NOME_DO_CLIENTE}`,
              atualizado: "09/04/2024",
            },
          ]);
          setSel(id);
          registrar("Criou", "Contratos e Peças", `Importou o modelo ${f.name}`);
          toast.success("Modelo adicionado à biblioteca");
          e.target.value = "";
        }}
      />
      <Panel
        title="Modelos"
        className="lg:col-span-2"
        action={
          pode("Contratos e Peças") === "editar" && (
            <Button size="sm" variant="outline" onClick={() => input.current?.click()}>
              <Upload className="size-3.5" /> Importar .docx
            </Button>
          )
        }
      >
        <div className="flex gap-1 border-b border-border px-3 py-2">
          {["Todos", "Contratos", "Peças", "Procurações"].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "rounded-md px-2 py-1 text-xs",
                cat === c
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="divide-y divide-border">
          {lista.map((m) => (
            <button
              key={m.id}
              onClick={() => setSel(m.id)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left",
                sel === m.id ? "bg-[var(--brand-soft)]" : "hover:bg-accent",
              )}
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{m.nome}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {m.categoria} · {m.tags.length} variáveis · atualizado {m.atualizado}
                </span>
              </span>
            </button>
          ))}
        </div>
      </Panel>
      <Panel
        title={atual?.nome ?? "Pré-visualização"}
        className="lg:col-span-3"
        delay={60}
        action={
          atual && (
            <Button size="sm" onClick={() => onUsar(atual.id)}>
              <FilePlus2 className="size-3.5" /> Usar modelo
            </Button>
          )
        }
      >
        {atual ? (
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap gap-1.5">
              {atual.tags.map((t) => (
                <Chip key={t} tone="brand" className="font-mono">
                  {t}
                </Chip>
              ))}
            </div>
            <div className="whitespace-pre-wrap rounded-xl border border-border bg-background/70 p-5 font-serif text-sm leading-relaxed">
              {destacar(atual.corpo)}
            </div>
          </div>
        ) : (
          <Empty>Selecione um modelo.</Empty>
        )}
      </Panel>
    </div>
  );
}

function Gerador({ modeloInicial }: { modeloInicial: string | null }) {
  const { modelos, clientes, processos, registrar, setContratos } = useApp();
  const [modeloId, setModeloId] = useState(modeloInicial ?? modelos[0]!.id);
  const [clienteId, setClienteId] = useState(clientes[0]!.id);
  const [processoNum, setProcessoNum] = useState("");
  const [manuais, setManuais] = useState<Record<string, string>>({});
  const [assinar, setAssinar] = useState(false);

  const modelo = modelos.find((m) => m.id === modeloId) ?? modelos[0]!;
  const cliente = clientes.find((c) => c.id === clienteId)!;
  const procs = processos.filter((p) => p.cliente === cliente.nome);
  const proc = procs.find((p) => p.numero === processoNum) ?? procs[0];

  const automaticos = useMemo<Record<string, string>>(() => {
    const end = cliente.enderecos[0];
    return {
      "{NOME_DO_CLIENTE}": cliente.nome,
      "{CPF_CNPJ}": cliente.documento,
      "{ENDERECO}": end ? `${end.logradouro}, ${end.cidade}, CEP ${end.cep}` : "",
      ...(proc && {
        "{NUMERO_PROCESSO}": proc.numero,
        "{VARA}": `${proc.vara.toUpperCase()} — ${proc.tribunal}`,
        "{PARTE_CONTRARIA}": proc.parteContraria,
      }),
    };
  }, [cliente, proc]);

  const valor = (tag: string) => manuais[tag] ?? automaticos[tag] ?? "";
  const faltando = modelo.tags.filter((t) => !valor(t));
  const texto = modelo.corpo.replace(/\{[A-Z_]+\}/g, (t) => valor(t) || t);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      <Panel title="Dados" className="self-start lg:col-span-2">
        <div className="space-y-3 p-4">
          <Field label="Modelo">
            <select
              className={selectCls}
              value={modelo.id}
              onChange={(e) => setModeloId(e.target.value)}
            >
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cliente">
            <select
              className={selectCls}
              value={clienteId}
              onChange={(e) => {
                setClienteId(e.target.value);
                setProcessoNum("");
                setManuais({});
              }}
            >
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Field>
          {procs.length > 0 && (
            <Field label="Processo">
              <select
                className={selectCls}
                value={proc?.numero ?? ""}
                onChange={(e) => setProcessoNum(e.target.value)}
              >
                {procs.map((p) => (
                  <option key={p.id}>{p.numero}</option>
                ))}
              </select>
            </Field>
          )}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="text-xs font-semibold">Variáveis do modelo</div>
            {modelo.tags.map((t) => (
              <Field
                key={t}
                label={t}
                hint={
                  automaticos[t] && manuais[t] === undefined ? "preenchido do cadastro" : undefined
                }
              >
                <input
                  className={cn(inputCls, !valor(t) && "border-[var(--warning)]")}
                  value={valor(t)}
                  onChange={(e) => setManuais((m) => ({ ...m, [t]: e.target.value }))}
                />
              </Field>
            ))}
          </div>
        </div>
      </Panel>
      <Panel
        title="Documento gerado"
        className="lg:col-span-3"
        delay={60}
        action={
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={faltando.length > 0}
              onClick={() => {
                registrar(
                  "Criou",
                  "Contratos e Peças",
                  `Gerou "${modelo.nome}" para ${cliente.nome}`,
                );
                toast.success("PDF gerado (simulado)", {
                  description: `${modelo.nome} — ${cliente.nome}`,
                });
              }}
            >
              <FileDown className="size-3.5" /> Gerar PDF
            </Button>
            <Button size="sm" disabled={faltando.length > 0} onClick={() => setAssinar(true)}>
              <FileSignature className="size-3.5" /> Enviar p/ assinatura
            </Button>
          </>
        }
      >
        <div className="space-y-3 p-5">
          {faltando.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--warning-soft)] px-3 py-2 text-xs text-[var(--warning)]">
              <AlertTriangle className="size-4" /> Preencha: {faltando.join(", ")}
            </div>
          )}
          <div className="min-h-[320px] whitespace-pre-wrap rounded-xl border border-border bg-background p-6 font-serif text-sm leading-relaxed shadow-inner">
            {destacar(texto)}
          </div>
        </div>
      </Panel>
      <AssinaturaDialog
        open={assinar}
        onOpenChange={setAssinar}
        titulo={modelo.nome}
        cliente={cliente.nome}
        onEnviado={(provedor) => {
          if (modelo.categoria === "Contratos")
            setContratos((prev) => [
              {
                id: uid(),
                titulo: modelo.nome,
                cliente: cliente.nome,
                inicio: "2024-04-09",
                fim: "2025-04-09",
                valor: 0,
                assinatura: "Aguardando assinatura",
                provedor,
              },
              ...prev,
            ]);
        }}
      />
    </div>
  );
}

function AssinaturaDialog({
  open,
  onOpenChange,
  titulo,
  cliente,
  onEnviado,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  titulo: string;
  cliente: string;
  onEnviado: (provedor: string) => void;
}) {
  const { clientes, registrar } = useApp();
  const [provedor, setProvedor] = useState("ZapSign");
  const c = clientes.find((x) => x.nome === cliente);
  const email = c?.contatos.find((x) => x.tipo === "E-mail")?.valor ?? "";
  const [destino, setDestino] = useState(email);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar para assinatura eletrônica</DialogTitle>
          <DialogDescription>
            {titulo} — {cliente}
          </DialogDescription>
        </DialogHeader>
        <Field label="Provedor">
          <div className="grid grid-cols-2 gap-2">
            {["ZapSign", "DocuSign"].map((p) => (
              <button
                key={p}
                onClick={() => setProvedor(p)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-semibold",
                  provedor === p
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </Field>
        <Field label="E-mail do signatário">
          <input
            className={inputCls}
            value={destino || email}
            onChange={(e) => setDestino(e.target.value)}
          />
        </Field>
        <NotaPrototipo>
          Protótipo: o envio real depende da integração com o provedor escolhido.
        </NotaPrototipo>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              registrar(
                "Criou",
                "Contratos e Peças",
                `Enviou "${titulo}" para assinatura via ${provedor}`,
              );
              onEnviado(provedor);
              toast.success(`Enviado via ${provedor} (simulado)`, {
                description: destino || email,
              });
              onOpenChange(false);
            }}
          >
            <Send className="size-4" /> Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Contratos() {
  const { contratos, setContratos } = useApp();
  const [enviar, setEnviar] = useState<Contrato | null>(null);
  const lista = [...contratos].sort((a, b) => a.fim.localeCompare(b.fim));

  return (
    <Panel title="Contratos de honorários">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contrato</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Assinatura</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((c) => {
              const d = diasAte(c.fim);
              const tone: Tone = d < 0 ? "critical" : d <= 30 ? "warning" : "neutral";
              return (
                <TableRow key={c.id}>
                  <TableCell className="min-w-[200px] font-medium">{c.titulo}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{c.cliente}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                    {fmtDMY(c.inicio)} – {fmtDMY(c.fim)}
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
                    <Chip tone={assinaturaTone[c.assinatura]}>{c.assinatura}</Chip>
                    {c.provedor && (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        via {c.provedor}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono text-xs">
                    {c.valor ? brl(c.valor) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.assinatura === "Não enviado" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setEnviar(c)}
                      >
                        <Send className="size-3.5" /> Enviar
                      </Button>
                    )}
                    {c.assinatura === "Aguardando assinatura" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => {
                          setContratos((prev) =>
                            prev.map((x) => (x.id === c.id ? { ...x, assinatura: "Assinado" } : x)),
                          );
                          toast.success("Marcado como assinado (simulação do retorno do provedor)");
                        }}
                      >
                        Simular assinatura
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {enviar && (
        <AssinaturaDialog
          open
          onOpenChange={(o) => !o && setEnviar(null)}
          titulo={enviar.titulo}
          cliente={enviar.cliente}
          onEnviado={(provedor) =>
            setContratos((prev) =>
              prev.map((x) =>
                x.id === enviar.id ? { ...x, assinatura: "Aguardando assinatura", provedor } : x,
              ),
            )
          }
        />
      )}
    </Panel>
  );
}
