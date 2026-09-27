import { createFileRoute } from "@tanstack/react-router";
import { Database, KeyRound, Lock, Plus, Search, ShieldCheck, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  AcessoRestrito,
  Avatar,
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
import { MODULOS, ROLE_LABEL, uid, type Log, type Permissao, type Role } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Gestão Jurídica" }] }),
  component: ConfiguracoesPage,
});

const ROLES: Role[] = ["admin", "advogado", "estagiario"];

function ConfiguracoesPage() {
  const { pode } = useApp();
  if (pode("Configurações") === "nenhum")
    return (
      <AppShell title="Configurações">
        <AcessoRestrito modulo="Configurações" />
      </AppShell>
    );

  return (
    <AppShell
      title="Configurações"
      subtitle="usuários, permissões, auditoria, personalização e segurança"
    >
      <Tabs defaultValue="usuarios">
        <TabsList className="mb-4 w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="permissoes">Perfis e permissões</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
          <TabsTrigger value="personalizacao">Personalização</TabsTrigger>
          <TabsTrigger value="seguranca">Segurança e backups</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios">
          <Usuarios />
        </TabsContent>
        <TabsContent value="permissoes">
          <Permissoes />
        </TabsContent>
        <TabsContent value="auditoria">
          <Auditoria />
        </TabsContent>
        <TabsContent value="personalizacao">
          <Personalizacao />
        </TabsContent>
        <TabsContent value="seguranca">
          <Seguranca />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Usuarios() {
  const { usuarios, setUsuarios, registrar, usuario } = useApp();
  const [novo, setNovo] = useState(false);
  const [f, setF] = useState({ nome: "", email: "", oab: "", role: "advogado" as Role });

  return (
    <Panel
      title={`${usuarios.length} usuários`}
      action={
        <Button size="sm" onClick={() => setNovo(true)}>
          <UserPlus className="size-3.5" /> Novo usuário
        </Button>
      }
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>OAB</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead>Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id} className={cn(!u.ativo && "opacity-50")}>
                <TableCell>
                  <span className="flex items-center gap-2 whitespace-nowrap font-medium">
                    <Avatar nome={u.nome} /> {u.nome}
                    {u.nome === usuario && <Chip tone="brand">você</Chip>}
                  </span>
                </TableCell>
                <TableCell className="text-xs">{u.email}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-[11px]">
                  {u.oab ?? "—"}
                </TableCell>
                <TableCell>
                  <select
                    className={cn(selectCls, "h-8 w-auto text-xs")}
                    value={u.role}
                    disabled={u.nome === usuario}
                    onChange={(e) => {
                      setUsuarios((prev) =>
                        prev.map((x) =>
                          x.id === u.id ? { ...x, role: e.target.value as Role } : x,
                        ),
                      );
                      registrar(
                        "Editou",
                        "Configurações",
                        `Alterou o perfil de ${u.nome} para ${ROLE_LABEL[e.target.value as Role]}`,
                      );
                      toast.success("Perfil atualizado");
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                  {u.ultimoAcesso}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={u.ativo}
                    disabled={u.nome === usuario}
                    onCheckedChange={(v) => {
                      setUsuarios((prev) =>
                        prev.map((x) => (x.id === u.id ? { ...x, ativo: v } : x)),
                      );
                      registrar(
                        "Editou",
                        "Configurações",
                        `${v ? "Ativou" : "Desativou"} o usuário ${u.nome}`,
                      );
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={novo} onOpenChange={setNovo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>
              Um convite de acesso será enviado por e-mail (no sistema final).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Nome">
              <input
                className={inputCls}
                value={f.nome}
                onChange={(e) => setF({ ...f, nome: e.target.value })}
              />
            </Field>
            <Field label="E-mail">
              <input
                className={inputCls}
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
            </Field>
            <Field label="OAB (opcional)">
              <input
                className={inputCls}
                value={f.oab}
                onChange={(e) => setF({ ...f, oab: e.target.value })}
              />
            </Field>
            <Field label="Perfil">
              <select
                className={selectCls}
                value={f.role}
                onChange={(e) => setF({ ...f, role: e.target.value as Role })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNovo(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!f.nome.trim() || !f.email.trim()) {
                  toast.error("Informe nome e e-mail");
                  return;
                }
                setUsuarios((prev) => [
                  ...prev,
                  {
                    id: uid(),
                    nome: f.nome.trim(),
                    email: f.email.trim(),
                    ...(f.oab.trim() && { oab: f.oab.trim() }),
                    role: f.role,
                    ativo: true,
                    ultimoAcesso: "—",
                  },
                ]);
                registrar(
                  "Criou",
                  "Configurações",
                  `Criou o usuário ${f.nome.trim()} (${ROLE_LABEL[f.role]})`,
                );
                toast.success("Usuário criado");
                setF({ nome: "", email: "", oab: "", role: "advogado" });
                setNovo(false);
              }}
            >
              Criar usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

const permTone: Record<Permissao, string> = {
  editar: "bg-[var(--success-soft)] text-[var(--success)]",
  ver: "bg-[var(--brand-soft)] text-[var(--brand-soft-foreground)]",
  nenhum: "bg-accent text-muted-foreground",
};
const permLabel: Record<Permissao, string> = {
  editar: "Ver e editar",
  ver: "Somente ver",
  nenhum: "Sem acesso",
};

function Permissoes() {
  const { permissoes, setPermissoes, registrar } = useApp();
  return (
    <Panel title="Matriz de permissões por perfil">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Módulo</TableHead>
              {ROLES.map((r) => (
                <TableHead key={r} className="text-center">
                  {ROLE_LABEL[r]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {MODULOS.map((m) => (
              <TableRow key={m}>
                <TableCell className="whitespace-nowrap font-medium">
                  {m}
                  {m === "Financeiro" && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-[var(--warning)]">
                      <Lock className="size-3" /> regra fixa
                    </span>
                  )}
                </TableCell>
                {ROLES.map((r) => {
                  const travado = r === "admin" || m === "Financeiro";
                  const v: Permissao =
                    m === "Financeiro" ? (r === "admin" ? "editar" : "nenhum") : permissoes[r][m];
                  return (
                    <TableCell key={r} className="text-center">
                      {travado ? (
                        <span
                          className={cn(
                            "inline-block rounded-md px-2 py-1 text-[11px] font-semibold",
                            permTone[v],
                          )}
                        >
                          {permLabel[v]}
                        </span>
                      ) : (
                        <select
                          value={v}
                          onChange={(e) => {
                            const nv = e.target.value as Permissao;
                            setPermissoes((prev) => ({ ...prev, [r]: { ...prev[r], [m]: nv } }));
                            registrar(
                              "Editou",
                              "Configurações",
                              `Permissão de ${ROLE_LABEL[r]} em ${m}: ${permLabel[nv]}`,
                            );
                          }}
                          className={cn(
                            "rounded-md border-0 px-2 py-1 text-[11px] font-semibold outline-none",
                            permTone[v],
                          )}
                        >
                          {(["editar", "ver", "nenhum"] as Permissao[]).map((p) => (
                            <option key={p} value={p}>
                              {permLabel[p]}
                            </option>
                          ))}
                        </select>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="p-3">
        <NotaPrototipo>
          O Financeiro (honorários a receber) é exclusivo do Advogado Administrador por regra de
          negócio e não pode ser liberado a outros perfis. Troque o perfil no canto superior direito
          para ver o sistema como cada um.
        </NotaPrototipo>
      </div>
    </Panel>
  );
}

const acaoTone: Record<Log["acao"], Tone> = {
  Criou: "success",
  Editou: "brand",
  Excluiu: "critical",
  Visualizou: "neutral",
  Login: "neutral",
  Exportou: "warning",
};

function Auditoria() {
  const { logs, usuarios } = useApp();
  const [quem, setQuem] = useState("Todos");
  const [modulo, setModulo] = useState("Todos");
  const [busca, setBusca] = useState("");
  const modulos = useMemo(() => [...new Set(logs.map((l) => l.modulo))], [logs]);
  const lista = logs.filter(
    (l) =>
      (quem === "Todos" || l.usuario === quem) &&
      (modulo === "Todos" || l.modulo === modulo) &&
      (!busca || l.descricao.toLowerCase().includes(busca.toLowerCase())),
  );

  return (
    <Panel
      title="Log de auditoria — quem fez o quê"
      action={
        <span className="font-mono text-[10px] text-muted-foreground">
          {lista.length} de {logs.length}
        </span>
      }
    >
      <div className="flex flex-wrap gap-2 border-b border-border p-3">
        <div className="relative w-full min-w-0 sm:w-auto sm:flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={cn(inputCls, "pl-9")}
            placeholder="Buscar ação…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className={cn(selectCls, "w-auto")}
          value={quem}
          onChange={(e) => setQuem(e.target.value)}
        >
          <option value="Todos">Todos os usuários</option>
          {usuarios.map((u) => (
            <option key={u.id}>{u.nome}</option>
          ))}
        </select>
        <select
          className={cn(selectCls, "w-auto")}
          value={modulo}
          onChange={(e) => setModulo(e.target.value)}
        >
          <option value="Todos">Todos os módulos</option>
          {modulos.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data e hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap font-mono text-[11px]">
                  {l.quando}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">{l.usuario}</TableCell>
                <TableCell>
                  <Chip tone={acaoTone[l.acao]}>{l.acao}</Chip>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">{l.modulo}</TableCell>
                <TableCell className="min-w-[240px] text-sm">{l.descricao}</TableCell>
                <TableCell className="font-mono text-[11px] text-muted-foreground">
                  {l.ip}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {lista.length === 0 && <Empty>Nenhum registro.</Empty>}
      </div>
      <div className="p-3">
        <NotaPrototipo>
          Faça qualquer ação no sistema (mover uma tarefa, registrar movimentação, enviar documento)
          e ela aparece aqui com seu nome.
        </NotaPrototipo>
      </div>
    </Panel>
  );
}

const CORES = [
  { id: "padrao", nome: "Azul marinho", swatch: "oklch(0.363 0.068 265)" },
  { id: "vinho", nome: "Vinho", swatch: "oklch(0.42 0.13 15)" },
  { id: "verde", nome: "Verde", swatch: "oklch(0.45 0.09 165)" },
  { id: "grafite", nome: "Grafite", swatch: "oklch(0.3 0.01 260)" },
];

function Personalizacao() {
  const { identidade, setIdentidade, categorias, setCategorias, registrar } = useApp();
  const [novos, setNovos] = useState<Record<string, string>>({});

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Identidade visual">
        <div className="space-y-4 p-5">
          <Field label="Nome do escritório">
            <input
              className={inputCls}
              value={identidade.nomeEscritorio}
              onChange={(e) => setIdentidade({ ...identidade, nomeEscritorio: e.target.value })}
            />
          </Field>
          <Field label="Sigla (aparece no logotipo)">
            <input
              className={cn(inputCls, "w-24 font-bold uppercase")}
              maxLength={3}
              value={identidade.sigla}
              onChange={(e) =>
                setIdentidade({ ...identidade, sigla: e.target.value.toUpperCase() })
              }
            />
          </Field>
          <Field label="Cor principal">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CORES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setIdentidade({ ...identidade, cor: c.id });
                    registrar("Editou", "Configurações", `Alterou a cor principal para ${c.nome}`);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs",
                    identidade.cor === c.id
                      ? "border-primary ring-2 ring-ring"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <span className="size-4 rounded-full" style={{ background: c.swatch }} />
                  {c.nome}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Logotipo">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-accent">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  toast.success("Logotipo carregado (pré-visualização no sistema final)")
                }
              />
              <Plus className="size-4" /> Enviar imagem (PNG ou SVG)
            </label>
          </Field>
        </div>
      </Panel>

      <Panel title="Categorias" delay={60}>
        <div className="space-y-5 p-5">
          {Object.entries(categorias).map(([grupo, itens]) => (
            <div key={grupo}>
              <div className="mb-2 text-xs font-semibold">{grupo}</div>
              <div className="flex flex-wrap gap-1.5">
                {itens.map((i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs"
                  >
                    {i}
                    <button
                      aria-label={`Remover ${i}`}
                      onClick={() =>
                        setCategorias((c) => ({ ...c, [grupo]: itens.filter((x) => x !== i) }))
                      }
                      className="opacity-50 hover:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <form
                  className="inline-flex"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = (novos[grupo] ?? "").trim();
                    if (!v) return;
                    setCategorias((c) => ({ ...c, [grupo]: [...itens, v] }));
                    setNovos((n) => ({ ...n, [grupo]: "" }));
                  }}
                >
                  <input
                    className="h-7 w-28 rounded-md border border-dashed border-border bg-transparent px-2 text-xs outline-none focus:border-primary"
                    placeholder="+ adicionar"
                    value={novos[grupo] ?? ""}
                    onChange={(e) => setNovos((n) => ({ ...n, [grupo]: e.target.value }))}
                  />
                </form>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Seguranca() {
  const { registrar } = useApp();
  const [diario, setDiario] = useState(true);
  const [cripto, setCripto] = useState(true);
  const [doisFatores, setDoisFatores] = useState(false);
  const [backups, setBackups] = useState([
    { quando: "09/04/2024 03:00", tamanho: "1,84 GB", status: "Concluído" },
    { quando: "08/04/2024 03:00", tamanho: "1,83 GB", status: "Concluído" },
    { quando: "07/04/2024 03:00", tamanho: "1,83 GB", status: "Concluído" },
    { quando: "06/04/2024 03:00", tamanho: "1,82 GB", status: "Concluído" },
  ]);

  const Linha = ({
    icon: Icon,
    titulo,
    desc,
    checked,
    onChange,
  }: {
    icon: typeof Lock;
    titulo: string;
    desc: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <label className="flex items-center gap-3 px-4 py-3">
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{titulo}</span>
        <span className="block text-[11px] text-muted-foreground">{desc}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Proteção">
        <div className="divide-y divide-border">
          <Linha
            icon={Database}
            titulo="Backup automático diário"
            desc="Todos os dias às 03:00, com retenção de 30 dias"
            checked={diario}
            onChange={setDiario}
          />
          <Linha
            icon={Lock}
            titulo="Criptografia de documentos confidenciais"
            desc="Arquivos das pastas confidenciais ficam criptografados"
            checked={cripto}
            onChange={setCripto}
          />
          <Linha
            icon={KeyRound}
            titulo="Verificação em duas etapas"
            desc="Exigir código no login de todos os usuários"
            checked={doisFatores}
            onChange={setDoisFatores}
          />
        </div>
        <div className="p-3">
          <NotaPrototipo>
            Protótipo: estas opções são apenas visuais. Backups e criptografia serão feitos no
            servidor.
          </NotaPrototipo>
        </div>
      </Panel>
      <Panel
        title="Últimos backups"
        delay={60}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setBackups((b) => [
                { quando: "09/04/2024 agora", tamanho: "1,84 GB", status: "Concluído" },
                ...b,
              ]);
              registrar("Criou", "Configurações", "Executou backup manual");
              toast.success("Backup concluído (simulado)");
            }}
          >
            <ShieldCheck className="size-3.5" /> Fazer backup agora
          </Button>
        }
      >
        <div className="divide-y divide-border">
          {backups.map((b, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <Database className="size-4 text-muted-foreground" />
              <span className="flex-1 font-mono text-xs">{b.quando}</span>
              <span className="font-mono text-xs text-muted-foreground">{b.tamanho}</span>
              <Chip tone="success">{b.status}</Chip>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
