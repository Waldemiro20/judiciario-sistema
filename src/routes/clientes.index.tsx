import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Building2, Plus, Search, ShieldCheck, Trash2, User } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Chip, Empty, Field, Panel, Segmented, inputCls, selectCls } from "@/components/kit";
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
import { docsPendentes, uid, type Cliente, type Contato, type Endereco } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clientes/")({
  head: () => ({ meta: [{ title: "Clientes — Gestão Jurídica" }] }),
  component: ClientesPage,
});

function ClientesPage() {
  const { clientes, processos, pode } = useApp();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<"Todos" | "Pessoa Física" | "Pessoa Jurídica">("Todos");
  const [soPendentes, setSoPendentes] = useState(false);
  const [novo, setNovo] = useState(false);
  const [conflito, setConflito] = useState(false);

  const lista = useMemo(
    () =>
      clientes.filter((c) => {
        if (tipo !== "Todos" && c.tipo !== tipo) return false;
        if (soPendentes && docsPendentes(c).length === 0) return false;
        const q = busca.toLowerCase().trim();
        if (!q) return true;
        const qd = q.replace(/\D/g, "");
        return (
          c.nome.toLowerCase().includes(q) ||
          (qd.length > 2 && c.documento.replace(/\D/g, "").includes(qd)) ||
          c.contatos.some((x) => x.valor.toLowerCase().includes(q))
        );
      }),
    [clientes, busca, tipo, soPendentes],
  );

  const pendentes = clientes.filter((c) => docsPendentes(c).length > 0).length;

  return (
    <AppShell title="Clientes" subtitle="cadastro completo, documentos e vínculos com processos">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-0 sm:w-auto sm:flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={cn(inputCls, "pl-9")}
            placeholder="Nome, CPF/CNPJ, e-mail, telefone…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Segmented
          value={tipo}
          onChange={setTipo}
          options={[
            { value: "Todos", label: "Todos" },
            { value: "Pessoa Física", label: "PF" },
            { value: "Pessoa Jurídica", label: "PJ" },
          ]}
        />
        <button
          onClick={() => setSoPendentes((v) => !v)}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors",
            soPendentes
              ? "border-[var(--critical)] bg-[var(--critical-soft)] text-[var(--critical)]"
              : "border-border hover:bg-accent",
          )}
        >
          <AlertTriangle className="size-3.5" /> Documentação pendente
          <span className="font-mono text-[10px]">{pendentes}</span>
        </button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setConflito(true)}>
            <ShieldCheck className="size-4" /> Conflito de interesses
          </Button>
          {pode("Clientes") === "editar" && (
            <Button onClick={() => setNovo(true)}>
              <Plus className="size-4" /> Novo cliente
            </Button>
          )}
        </div>
      </div>

      <Panel>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>CPF / CNPJ</TableHead>
                <TableHead>Contato principal</TableHead>
                <TableHead>Processos</TableHead>
                <TableHead>Documentação</TableHead>
                <TableHead>Desde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((c) => {
                const pend = docsPendentes(c);
                const nProc = processos.filter((p) => p.cliente === c.nome).length;
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: "/clientes/$id", params: { id: c.id } })}
                  >
                    <TableCell className="min-w-[220px]">
                      <div className="flex items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-muted-foreground">
                          {c.tipo === "Pessoa Física" ? (
                            <User className="size-4" />
                          ) : (
                            <Building2 className="size-4" />
                          )}
                        </span>
                        <span>
                          <span className="flex items-center gap-2 font-medium">
                            {c.nome}
                            {c.status === "Inativo" && <Chip>Inativo</Chip>}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{c.tipo}</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {c.documento}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {c.contatos[0]?.valor ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{nProc}</TableCell>
                    <TableCell>
                      {pend.length ? (
                        <Chip tone="critical">
                          <AlertTriangle className="size-3" /> {pend.length} pendente
                          {pend.length > 1 ? "s" : ""}
                        </Chip>
                      ) : (
                        <Chip tone="success">Completa</Chip>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.desde}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {lista.length === 0 && <Empty>Nenhum cliente encontrado.</Empty>}
        </div>
      </Panel>

      <NovoClienteDialog open={novo} onOpenChange={setNovo} />
      <ConflitoDialog open={conflito} onOpenChange={setConflito} />
    </AppShell>
  );
}

function NovoClienteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { setClientes, registrar } = useApp();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<Cliente["tipo"]>("Pessoa Física");
  const [nome, setNome] = useState("");
  const [doc1, setDoc1] = useState("");
  const [doc2, setDoc2] = useState("");
  const [contatos, setContatos] = useState<Contato[]>([{ id: uid(), tipo: "Celular", valor: "" }]);
  const [enderecos, setEnderecos] = useState<Endereco[]>([
    { id: uid(), rotulo: "Principal", logradouro: "", cidade: "", cep: "" },
  ]);
  const pf = tipo === "Pessoa Física";

  const limpar = () => {
    setNome("");
    setDoc1("");
    setDoc2("");
    setContatos([{ id: uid(), tipo: "Celular", valor: "" }]);
    setEnderecos([{ id: uid(), rotulo: "Principal", logradouro: "", cidade: "", cep: "" }]);
  };

  const salvar = () => {
    if (!nome.trim() || !doc1.trim()) {
      toast.error(`Informe o nome e o ${pf ? "CPF" : "CNPJ"}`);
      return;
    }
    const id = uid();
    const docs = pf
      ? [
          { id: "rg", nome: "RG ou CNH", obrigatorio: true },
          { id: "end", nome: "Comprovante de endereço", obrigatorio: true },
          { id: "proc", nome: "Procuração", obrigatorio: true },
        ]
      : [
          { id: "cs", nome: "Contrato social", obrigatorio: true },
          { id: "cnpj", nome: "Cartão CNPJ", obrigatorio: true },
          { id: "proc", nome: "Procuração", obrigatorio: true },
        ];
    setClientes((prev) => [
      {
        id,
        nome: nome.trim(),
        tipo,
        documento: doc1.trim(),
        documento2: doc2.trim(),
        desde: "04/2024",
        status: "Ativo",
        contatos: contatos.filter((c) => c.valor.trim()),
        enderecos: enderecos.filter((e) => e.logradouro.trim()),
        documentos: docs,
        historico: [],
      },
      ...prev,
    ]);
    registrar("Criou", "Clientes", `Cadastrou o cliente ${nome.trim()}`);
    toast.success("Cliente cadastrado", {
      description: "Documentos obrigatórios marcados como pendentes.",
    });
    onOpenChange(false);
    limpar();
    navigate({ to: "/clientes/$id", params: { id } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>
            Pessoa física ou jurídica, com quantos contatos e endereços forem necessários.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          {(["Pessoa Física", "Pessoa Jurídica"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold",
                tipo === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent",
              )}
            >
              {t === "Pessoa Física" ? (
                <User className="size-4" />
              ) : (
                <Building2 className="size-4" />
              )}
              {t}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={pf ? "Nome completo" : "Razão social"} className="sm:col-span-2">
            <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} />
          </Field>
          <Field label={pf ? "CPF" : "CNPJ"}>
            <input
              className={cn(inputCls, "font-mono")}
              placeholder={pf ? "000.000.000-00" : "00.000.000/0000-00"}
              value={doc1}
              onChange={(e) => setDoc1(e.target.value)}
            />
          </Field>
          <Field label={pf ? "RG" : "Inscrição estadual"}>
            <input
              className={cn(inputCls, "font-mono")}
              value={doc2}
              onChange={(e) => setDoc2(e.target.value)}
            />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold">Contatos</h4>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setContatos((c) => [...c, { id: uid(), tipo: "E-mail", valor: "" }])}
            >
              <Plus className="size-3.5" /> Adicionar contato
            </Button>
          </div>
          <div className="space-y-2">
            {contatos.map((c) => (
              <div key={c.id} className="flex gap-2">
                <select
                  className={cn(selectCls, "w-36 shrink-0")}
                  value={c.tipo}
                  onChange={(e) =>
                    setContatos((cs) =>
                      cs.map((x) => (x.id === c.id ? { ...x, tipo: e.target.value } : x)),
                    )
                  }
                >
                  {["Celular", "Telefone", "E-mail", "WhatsApp", "Responsável"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <input
                  className={inputCls}
                  value={c.valor}
                  onChange={(e) =>
                    setContatos((cs) =>
                      cs.map((x) => (x.id === c.id ? { ...x, valor: e.target.value } : x)),
                    )
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  aria-label="Remover"
                  onClick={() => setContatos((cs) => cs.filter((x) => x.id !== c.id))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold">Endereços</h4>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() =>
                setEnderecos((e) => [
                  ...e,
                  { id: uid(), rotulo: "Outro", logradouro: "", cidade: "", cep: "" },
                ])
              }
            >
              <Plus className="size-3.5" /> Adicionar endereço
            </Button>
          </div>
          <div className="space-y-2">
            {enderecos.map((en) => {
              const upd = (k: keyof Endereco, v: string) =>
                setEnderecos((es) => es.map((x) => (x.id === en.id ? { ...x, [k]: v } : x)));
              return (
                <div
                  key={en.id}
                  className="grid gap-2 rounded-xl border border-border p-2 sm:grid-cols-[110px_1fr_140px_110px_auto]"
                >
                  <input
                    className={inputCls}
                    placeholder="Rótulo"
                    value={en.rotulo}
                    onChange={(e) => upd("rotulo", e.target.value)}
                  />
                  <input
                    className={inputCls}
                    placeholder="Logradouro, nº"
                    value={en.logradouro}
                    onChange={(e) => upd("logradouro", e.target.value)}
                  />
                  <input
                    className={inputCls}
                    placeholder="Cidade/UF"
                    value={en.cidade}
                    onChange={(e) => upd("cidade", e.target.value)}
                  />
                  <input
                    className={inputCls}
                    placeholder="CEP"
                    value={en.cep}
                    onChange={(e) => upd("cep", e.target.value)}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remover"
                    onClick={() => setEnderecos((es) => es.filter((x) => x.id !== en.id))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar}>Cadastrar cliente</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConflitoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { clientes, processos } = useApp();
  const [q, setQ] = useState("");
  const termo = q.trim().toLowerCase();
  const qd = termo.replace(/\D/g, "");

  const comoCliente =
    termo.length > 2
      ? clientes.filter(
          (c) =>
            c.nome.toLowerCase().includes(termo) ||
            (qd.length > 3 && c.documento.replace(/\D/g, "").includes(qd)),
        )
      : [];
  const comoContraria =
    termo.length > 2 ? processos.filter((p) => p.parteContraria.toLowerCase().includes(termo)) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pesquisa de conflito de interesses</DialogTitle>
          <DialogDescription>
            Antes de aceitar uma nova causa, verifique se a parte contrária é ou já foi cliente do
            escritório.
          </DialogDescription>
        </DialogHeader>
        <input
          autoFocus
          className={inputCls}
          placeholder="Nome ou CPF/CNPJ da parte contrária"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {termo.length > 2 && (
          <div className="space-y-3">
            {comoCliente.length === 0 && comoContraria.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl bg-[var(--success-soft)] px-3 py-3 text-sm text-[var(--success)]">
                <ShieldCheck className="size-4" /> Nenhum conflito encontrado na base.
              </div>
            ) : (
              <>
                {comoCliente.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-[var(--critical)]/40 bg-[var(--critical-soft)] px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2 font-semibold text-[var(--critical)]">
                      <AlertTriangle className="size-4" /> Conflito: é{" "}
                      {c.status === "Ativo" ? "cliente atual" : "ex-cliente"}
                    </div>
                    <div className="mt-0.5">
                      {c.nome} · <span className="font-mono text-xs">{c.documento}</span>
                    </div>
                  </div>
                ))}
                {comoContraria.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-[var(--warning)]/40 bg-[var(--warning-soft)] px-3 py-2 text-sm"
                  >
                    <div className="font-semibold text-[var(--warning)]">
                      Já figura como parte contrária
                    </div>
                    <div className="mt-0.5">
                      {p.parteContraria} em <span className="font-mono text-xs">{p.numero}</span>{" "}
                      (cliente: {p.cliente})
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
