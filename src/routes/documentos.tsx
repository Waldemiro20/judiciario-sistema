import { createFileRoute } from "@tanstack/react-router";
import {
  Copy,
  Download,
  FileText,
  Folder,
  FolderLock,
  FolderPlus,
  History,
  Lock,
  RotateCcw,
  Search,
  Share2,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  Avatar,
  Chip,
  Empty,
  Field,
  Panel,
  Segmented,
  inputCls,
  selectCls,
} from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { agoraCarimbo, uid, type Documento } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/documentos")({
  head: () => ({ meta: [{ title: "Documentos — Gestão Jurídica" }] }),
  component: DocumentosPage,
});

const tamanho = (b: number) =>
  b > 1024 * 1024
    ? `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`
    : `${Math.max(1, Math.round(b / 1024))} KB`;

function DocumentosPage() {
  const {
    documentos,
    setDocumentos,
    pastas,
    setPastas,
    processos,
    usuario,
    usuarios,
    isAdmin,
    registrar,
    pode,
  } = useApp();
  const [pasta, setPasta] = useState<string>("Todas");
  const [busca, setBusca] = useState("");
  const [modoBusca, setModoBusca] = useState<"Nome" | "Conteúdo">("Nome");
  const [processo, setProcesso] = useState("Todos");
  const [aberto, setAberto] = useState<string | null>(null);
  const [novaPasta, setNovaPasta] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [destinoUpload, setDestinoUpload] = useState({
    pasta: "Petições",
    processo: processos[0]!.numero,
  });
  const input = useRef<HTMLInputElement>(null);
  const podeEditar = pode("Documentos") === "editar";

  const temAcesso = (nome: string) => {
    const p = pastas.find((x) => x.nome === nome);
    return !p?.confidencial || isAdmin || p.acesso.includes(usuario);
  };

  const lista = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return documentos.filter((d) => {
      if (!temAcesso(d.pasta)) return false;
      if (pasta !== "Todas" && d.pasta !== pasta) return false;
      if (processo !== "Todos" && d.processo !== processo) return false;
      if (!q) return true;
      return modoBusca === "Nome"
        ? d.nome.toLowerCase().includes(q)
        : `${d.nome} ${d.conteudo}`.toLowerCase().includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentos, pasta, processo, busca, modoBusca, pastas, usuario, isAdmin]);

  const enviar = (files: FileList | null) => {
    if (!files?.length) return;
    const destino = pasta !== "Todas" ? pasta : destinoUpload.pasta;
    const proc = processo !== "Todos" ? processo : destinoUpload.processo;
    const { data, hora } = agoraCarimbo();
    const quando = `${data} às ${hora}`;
    setDocumentos((prev) => {
      let novos = [...prev];
      for (const f of Array.from(files)) {
        const existente = novos.find((d) => d.nome === f.name && d.pasta === destino);
        if (existente) {
          const versao = `V${existente.versoes.length + 1}`;
          novos = novos.map((d) =>
            d.id === existente.id
              ? {
                  ...d,
                  versoes: [
                    ...d.versoes,
                    { versao, autor: usuario, quando, tamanho: tamanho(f.size) },
                  ],
                }
              : d,
          );
          toast.success(`Nova versão ${versao} de ${f.name}`, {
            description: "As versões anteriores foram mantidas.",
          });
          registrar("Criou", "Documentos", `Enviou ${f.name} (${versao})`);
        } else {
          novos = [
            {
              id: uid(),
              nome: f.name,
              pasta: destino,
              processo: proc,
              conteudo: "",
              versoes: [{ versao: "V1", autor: usuario, quando, tamanho: tamanho(f.size) }],
            },
            ...novos,
          ];
          toast.success(`${f.name} enviado para ${destino}`);
          registrar("Criou", "Documentos", `Enviou ${f.name} (V1)`);
        }
      }
      return novos;
    });
    if (input.current) input.current.value = "";
  };

  const doc = documentos.find((d) => d.id === aberto);

  return (
    <AppShell title="Documentos" subtitle="GED — pastas, versões, busca e controle de acesso">
      <input
        ref={input}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => enviar(e.target.files)}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
        <Panel
          title="Pastas"
          action={
            podeEditar && (
              <button
                onClick={() => setNovaPasta(true)}
                aria-label="Nova pasta"
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <FolderPlus className="size-4" />
              </button>
            )
          }
          className="self-start"
        >
          <div className="space-y-0.5 p-2">
            {[{ nome: "Todas", confidencial: false, acesso: [] as string[] }, ...pastas].map(
              (p) => {
                const bloqueada = p.nome !== "Todas" && !temAcesso(p.nome);
                const n =
                  p.nome === "Todas"
                    ? documentos.filter((d) => temAcesso(d.pasta)).length
                    : documentos.filter((d) => d.pasta === p.nome).length;
                const Icon = p.confidencial ? FolderLock : Folder;
                return (
                  <button
                    key={p.nome}
                    disabled={bloqueada}
                    onClick={() => setPasta(p.nome)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (bloqueada || p.nome === "Todas") return;
                      setPasta(p.nome);
                      setTimeout(() => enviar(e.dataTransfer.files));
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      pasta === p.nome
                        ? "bg-[var(--brand-soft)] font-medium text-[var(--brand-soft-foreground)]"
                        : "hover:bg-accent",
                      bloqueada && "cursor-not-allowed opacity-50 hover:bg-transparent",
                    )}
                  >
                    <Icon
                      className={cn("size-4 shrink-0", p.confidencial && "text-[var(--warning)]")}
                    />
                    <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                    {bloqueada ? (
                      <Lock className="size-3" />
                    ) : (
                      <span className="font-mono text-[10px] text-muted-foreground">{n}</span>
                    )}
                  </button>
                );
              },
            )}
          </div>
        </Panel>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full min-w-0 sm:w-auto sm:flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={cn(inputCls, "pl-9")}
                placeholder={
                  modoBusca === "Nome"
                    ? "Buscar pelo nome do arquivo…"
                    : "Buscar palavras dentro do documento…"
                }
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <Segmented
              value={modoBusca}
              onChange={setModoBusca}
              options={["Nome", "Conteúdo"] as const}
            />
            <select
              className={cn(selectCls, "w-auto max-w-[240px]")}
              value={processo}
              onChange={(e) => setProcesso(e.target.value)}
            >
              <option value="Todos">Todos os processos</option>
              {processos.map((p) => (
                <option key={p.id} value={p.numero}>
                  {p.numero}
                </option>
              ))}
            </select>
          </div>

          {podeEditar && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setArrastando(true);
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(e) => {
                e.preventDefault();
                setArrastando(false);
                enviar(e.dataTransfer.files);
              }}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-4 transition-colors",
                arrastando ? "border-primary bg-[var(--brand-soft)]" : "border-border",
              )}
            >
              <Upload className="size-5 text-muted-foreground" />
              <div className="min-w-0 flex-1 text-sm">
                <strong>Arraste arquivos aqui</strong> ou{" "}
                <button
                  className="text-primary hover:underline"
                  onClick={() => input.current?.click()}
                >
                  selecione do computador
                </button>
                <div className="text-[11px] text-muted-foreground">
                  Mesmo nome na mesma pasta cria uma nova versão (V2, V3…) sem apagar a anterior.
                </div>
              </div>
              {pasta === "Todas" && (
                <select
                  className={cn(selectCls, "w-auto")}
                  value={destinoUpload.pasta}
                  onChange={(e) => setDestinoUpload({ ...destinoUpload, pasta: e.target.value })}
                >
                  {pastas
                    .filter((p) => temAcesso(p.nome))
                    .map((p) => (
                      <option key={p.nome}>{p.nome}</option>
                    ))}
                </select>
              )}
              {processo === "Todos" && (
                <select
                  className={cn(selectCls, "w-auto max-w-[200px]")}
                  value={destinoUpload.processo}
                  onChange={(e) => setDestinoUpload({ ...destinoUpload, processo: e.target.value })}
                >
                  {processos.map((p) => (
                    <option key={p.id} value={p.numero}>
                      {p.numero}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <Panel>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Pasta</TableHead>
                    <TableHead>Processo</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Última alteração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((d) => {
                    const ult = d.versoes[d.versoes.length - 1]!;
                    const confidencial = pastas.find((p) => p.nome === d.pasta)?.confidencial;
                    return (
                      <TableRow
                        key={d.id}
                        className="cursor-pointer"
                        onClick={() => setAberto(d.id)}
                      >
                        <TableCell className="min-w-[240px]">
                          <span className="flex items-center gap-2 font-medium">
                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                            {d.nome}
                            {confidencial && <Lock className="size-3 text-[var(--warning)]" />}
                          </span>
                          {modoBusca === "Conteúdo" &&
                            busca &&
                            d.conteudo.toLowerCase().includes(busca.toLowerCase()) && (
                              <span className="ml-6 block text-[11px] text-muted-foreground">
                                …encontrado no texto: "
                                <mark className="rounded bg-[var(--warning-soft)] px-0.5 text-foreground">
                                  {busca}
                                </mark>
                                "
                              </span>
                            )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{d.pasta}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                          {d.processo}
                        </TableCell>
                        <TableCell>
                          <Chip tone={d.versoes.length > 1 ? "brand" : "neutral"}>
                            {ult.versao}
                          </Chip>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {ult.autor}
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {ult.quando}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {lista.length === 0 && <Empty>Nenhum documento encontrado.</Empty>}
            </div>
          </Panel>
        </div>
      </div>

      <DocumentoDialog doc={doc} onClose={() => setAberto(null)} />

      <NovaPastaDialog
        open={novaPasta}
        onOpenChange={setNovaPasta}
        usuarios={usuarios.map((u) => u.nome)}
        onCriar={(p) => {
          setPastas((prev) => [...prev, p]);
          registrar(
            "Criou",
            "Documentos",
            `Criou a pasta ${p.nome}${p.confidencial ? " (confidencial)" : ""}`,
          );
          toast.success(`Pasta "${p.nome}" criada`);
        }}
      />
    </AppShell>
  );
}

function DocumentoDialog({ doc, onClose }: { doc: Documento | undefined; onClose: () => void }) {
  const { usuarios, usuario, setDocumentos, registrar, pode } = useApp();
  const [compartilhar, setCompartilhar] = useState<string[]>([]);
  const podeEditar = pode("Documentos") === "editar";
  if (!doc) return null;
  const link = `https://escritorio.app/ged/${doc.id}`;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6 text-left">
            <FileText className="size-5 shrink-0" /> <span className="truncate">{doc.nome}</span>
          </DialogTitle>
          <DialogDescription className="text-left font-mono text-xs">
            {doc.pasta} · {doc.processo}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="versoes">
          <TabsList>
            <TabsTrigger value="versoes">
              <History className="mr-1 size-3.5" /> Versões
            </TabsTrigger>
            <TabsTrigger value="compartilhar">
              <Share2 className="mr-1 size-3.5" /> Compartilhar
            </TabsTrigger>
          </TabsList>
          <TabsContent value="versoes">
            <div className="divide-y divide-border rounded-xl border border-border">
              {[...doc.versoes].reverse().map((v, i) => (
                <div key={v.versao} className="flex items-center gap-3 px-3 py-2.5">
                  <Chip tone={i === 0 ? "brand" : "neutral"}>{v.versao}</Chip>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">
                      {v.autor}{" "}
                      {i === 0 && (
                        <span className="text-[11px] text-muted-foreground">· atual</span>
                      )}
                    </span>
                    <span className="block font-mono text-[10px] text-muted-foreground">
                      {v.quando} · {v.tamanho}
                    </span>
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label="Baixar"
                    onClick={() => toast.info(`Download de ${v.versao} (simulado no protótipo)`)}
                  >
                    <Download className="size-4" />
                  </Button>
                  {i > 0 && podeEditar && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => {
                        const { data, hora } = agoraCarimbo();
                        const nova = `V${doc.versoes.length + 1}`;
                        setDocumentos((prev) =>
                          prev.map((d) =>
                            d.id === doc.id
                              ? {
                                  ...d,
                                  versoes: [
                                    ...d.versoes,
                                    {
                                      ...v,
                                      versao: nova,
                                      autor: usuario,
                                      quando: `${data} às ${hora}`,
                                    },
                                  ],
                                }
                              : d,
                          ),
                        );
                        registrar(
                          "Editou",
                          "Documentos",
                          `Restaurou ${v.versao} de ${doc.nome} como ${nova}`,
                        );
                        toast.success(`${v.versao} restaurada como ${nova}`);
                      }}
                    >
                      <RotateCcw className="size-3.5" /> Restaurar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="compartilhar" className="space-y-3">
            <Field label="Link interno (somente usuários do escritório)">
              <div className="flex gap-2">
                <input readOnly className={cn(inputCls, "font-mono text-xs")} value={link} />
                <Button
                  variant="secondary"
                  className="h-9 shrink-0"
                  onClick={() => {
                    navigator.clipboard?.writeText(link).catch(() => undefined);
                    toast.success("Link copiado");
                  }}
                >
                  <Copy className="size-4" /> Copiar
                </Button>
              </div>
            </Field>
            <Field label="Notificar pessoas da equipe">
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {usuarios
                  .filter((u) => u.nome !== usuario)
                  .map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <Checkbox
                        checked={compartilhar.includes(u.nome)}
                        onCheckedChange={(v) =>
                          setCompartilhar((x) =>
                            v ? [...x, u.nome] : x.filter((y) => y !== u.nome),
                          )
                        }
                      />
                      <Avatar nome={u.nome} className="size-6" />
                      {u.nome}
                    </label>
                  ))}
              </div>
            </Field>
            <Button
              className="w-full"
              disabled={!compartilhar.length}
              onClick={() => {
                registrar(
                  "Editou",
                  "Documentos",
                  `Compartilhou ${doc.nome} com ${compartilhar.join(", ")}`,
                );
                toast.success(`Compartilhado com ${compartilhar.length} pessoa(s)`);
                setCompartilhar([]);
              }}
            >
              <Share2 className="size-4" /> Compartilhar
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function NovaPastaDialog({
  open,
  onOpenChange,
  usuarios,
  onCriar,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  usuarios: string[];
  onCriar: (p: { nome: string; confidencial: boolean; acesso: string[] }) => void;
}) {
  const [nome, setNome] = useState("");
  const [confidencial, setConfidencial] = useState(false);
  const [acesso, setAcesso] = useState<string[]>([]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova pasta</DialogTitle>
          <DialogDescription>
            Pastas confidenciais ficam bloqueadas para quem não estiver na lista.
          </DialogDescription>
        </DialogHeader>
        <Field label="Nome da pasta">
          <input
            autoFocus
            className={inputCls}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </Field>
        <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
          <span className="flex items-center gap-2">
            <FolderLock className="size-4 text-[var(--warning)]" /> Pasta confidencial
          </span>
          <Switch checked={confidencial} onCheckedChange={setConfidencial} />
        </label>
        {confidencial && (
          <Field label="Quem pode acessar (administradores sempre acessam)">
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {usuarios.map((u) => (
                <label
                  key={u}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={acesso.includes(u)}
                    onCheckedChange={(v) =>
                      setAcesso((x) => (v ? [...x, u] : x.filter((y) => y !== u)))
                    }
                  />
                  {u}
                </label>
              ))}
            </div>
          </Field>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!nome.trim()) return;
              onCriar({ nome: nome.trim(), confidencial, acesso });
              setNome("");
              setConfidencial(false);
              setAcesso([]);
              onOpenChange(false);
            }}
          >
            Criar pasta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
