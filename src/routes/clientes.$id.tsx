import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileUp,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Chip, Empty, Panel, inputCls, statusTone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { agoraCarimbo, docsPendentes, uid, type Cliente } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clientes/$id")({
  head: () => ({ meta: [{ title: "Cliente — Gestão Jurídica" }] }),
  component: ClientePage,
});

function ClientePage() {
  const { id } = Route.useParams();
  const { clientes, setClientes, processos, usuario, pode, registrar } = useApp();
  const navigate = useNavigate();
  const c = clientes.find((x) => x.id === id);
  const [novoContato, setNovoContato] = useState({ tipo: "E-mail", valor: "" });
  const [novoDoc, setNovoDoc] = useState("");
  const inputArquivo = useRef<HTMLInputElement>(null);
  const alvoUpload = useRef<string | null>(null);

  if (!c)
    return (
      <AppShell title="Cliente não encontrado">
        <Link to="/clientes" className="text-sm text-primary hover:underline">
          ← Voltar para clientes
        </Link>
      </AppShell>
    );

  const podeEditar = pode("Clientes") === "editar";
  const pend = docsPendentes(c);
  const vinculados = processos.filter(
    (p) => p.cliente === c.nome || p.partes.some((pt) => pt.nome === c.nome),
  );
  const alterar = (fn: (x: Cliente) => Cliente) =>
    setClientes((prev) => prev.map((x) => (x.id === c.id ? fn(x) : x)));

  const onArquivo = (file: File | undefined) => {
    const docId = alvoUpload.current;
    if (!file || !docId) return;
    const { data, dataCurta, hora } = agoraCarimbo();
    alterar((x) => ({
      ...x,
      documentos: x.documentos.map((d) =>
        d.id === docId ? { ...d, arquivo: file.name, enviadoEm: data, enviadoPor: usuario } : d,
      ),
      historico: [
        { quando: `${dataCurta} às ${hora}`, texto: `${file.name} enviado por ${usuario}` },
        ...x.historico,
      ],
    }));
    registrar("Criou", "Clientes", `Enviou ${file.name} para ${c.nome}`);
    toast.success("Documento anexado", { description: file.name });
    if (inputArquivo.current) inputArquivo.current.value = "";
  };

  const icone = (tipo: string) =>
    tipo === "E-mail" ? Mail : tipo === "Responsável" ? User : Phone;

  return (
    <AppShell title={c.nome} subtitle={`${c.tipo} · ${c.documento}`}>
      <input
        ref={inputArquivo}
        type="file"
        className="hidden"
        onChange={(e) => onArquivo(e.target.files?.[0])}
      />

      <Link
        to="/clientes"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Clientes
      </Link>

      {pend.length > 0 && (
        <div className="rise mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--critical)]/30 bg-[var(--critical-soft)] px-4 py-3">
          <AlertTriangle className="size-5 shrink-0 text-[var(--critical)]" />
          <div className="min-w-0 flex-1 text-sm">
            <strong className="text-[var(--critical)]">Documentação pendente.</strong> Falta anexar:{" "}
            {pend.map((d) => d.nome).join(", ")}.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <Panel>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-soft-foreground)]">
                  {c.tipo === "Pessoa Física" ? (
                    <User className="size-6" />
                  ) : (
                    <Building2 className="size-6" />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold leading-tight">{c.nome}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Chip tone={c.status === "Ativo" ? "success" : "neutral"}>{c.status}</Chip>
                    <Chip>{c.tipo === "Pessoa Física" ? "PF" : "PJ"}</Chip>
                  </div>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] text-muted-foreground">
                    {c.tipo === "Pessoa Física" ? "CPF" : "CNPJ"}
                  </dt>
                  <dd className="font-mono text-xs">{c.documento}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">
                    {c.tipo === "Pessoa Física" ? "RG" : "Inscrição estadual"}
                  </dt>
                  <dd className="font-mono text-xs">{c.documento2 || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Cliente desde</dt>
                  <dd className="font-mono text-xs">{c.desde}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Processos</dt>
                  <dd className="font-mono text-xs">{vinculados.length}</dd>
                </div>
              </dl>
            </div>
          </Panel>

          <Panel title="Contatos" delay={40}>
            <div className="divide-y divide-border">
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
                          alterar((x) => ({
                            ...x,
                            contatos: x.contatos.filter((y) => y.id !== ct.id),
                          }))
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
                  if (!novoContato.valor.trim()) return;
                  alterar((x) => ({
                    ...x,
                    contatos: [
                      ...x.contatos,
                      { id: uid(), ...novoContato, valor: novoContato.valor.trim() },
                    ],
                  }));
                  setNovoContato({ ...novoContato, valor: "" });
                }}
              >
                <select
                  className={cn(inputCls, "w-28 shrink-0")}
                  value={novoContato.tipo}
                  onChange={(e) => setNovoContato({ ...novoContato, tipo: e.target.value })}
                >
                  {["E-mail", "Celular", "Telefone", "WhatsApp", "Responsável"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <input
                  className={inputCls}
                  placeholder="Novo contato"
                  value={novoContato.valor}
                  onChange={(e) => setNovoContato({ ...novoContato, valor: e.target.value })}
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
        </div>

        <div className="space-y-5 lg:col-span-2">
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
            delay={60}
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
                  {podeEditar && (
                    <Button
                      size="sm"
                      variant={d.arquivo ? "ghost" : "default"}
                      onClick={() => {
                        alvoUpload.current = d.id;
                        inputArquivo.current?.click();
                      }}
                    >
                      {d.arquivo ? (
                        <FileUp className="size-3.5" />
                      ) : (
                        <Upload className="size-3.5" />
                      )}
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
                  const docId = uid();
                  alterar((x) => ({
                    ...x,
                    documentos: [
                      ...x.documentos,
                      { id: docId, nome: novoDoc.trim(), obrigatorio: false },
                    ],
                  }));
                  setNovoDoc("");
                  alvoUpload.current = docId;
                  inputArquivo.current?.click();
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

          <Panel title="Processos vinculados" delay={100}>
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
                  {vinculados.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => navigate({ to: "/processos/$id", params: { id: p.id } })}
                    >
                      <TableCell>
                        <div className="font-medium">{p.titulo}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {p.numero}
                        </div>
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
              {vinculados.length === 0 && <Empty>Nenhum processo vinculado.</Empty>}
            </div>
          </Panel>

          <Panel title="Histórico" delay={140}>
            <ol className="relative m-5 space-y-3 border-l border-border pl-4">
              {c.historico.length === 0 && (
                <li className="text-sm text-muted-foreground">Sem registros.</li>
              )}
              {c.historico.map((hh, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" />
                  <p className="text-sm">{hh.texto}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{hh.quando}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
