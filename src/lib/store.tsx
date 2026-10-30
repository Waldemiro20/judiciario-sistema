import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { toast } from "sonner";
import {
  MODULOS,
  ROLES,
  type Cliente,
  type Contrato,
  type Documento,
  type Evento,
  type Intimacao,
  type Lancamento,
  type Log,
  type Modelo,
  type Modulo,
  type Pasta,
  type Permissao,
  type Processo,
  type Role,
  type Tarefa,
  type Usuario,
} from "./data";
import {
  api,
  ErroApi,
  LIMITE_UPLOAD,
  listarTudo,
  mensagemDe,
  MSG_LIMITE_UPLOAD,
  novaChave,
  quandoPerderSessao,
} from "./api";
import { useColecao } from "./sincronia";

type Theme = "light" | "dark";
type Set<T> = Dispatch<SetStateAction<T>>;

export type WidgetId = "resumo" | "pendencias" | "agenda" | "tarefas" | "intimacoes" | "equipe";
export type Widget = { id: WidgetId; titulo: string; visivel: boolean };

const widgetsIniciais: Widget[] = [
  { id: "resumo", titulo: "Números do escritório", visivel: true },
  { id: "pendencias", titulo: "Pendências que precisam de atenção", visivel: true },
  { id: "agenda", titulo: "Próximos prazos e audiências", visivel: true },
  { id: "tarefas", titulo: "Minhas tarefas", visivel: true },
  { id: "intimacoes", titulo: "Novas intimações", visivel: true },
  { id: "equipe", titulo: "Carga da equipe", visivel: false },
];

export type Identidade = { nomeEscritorio: string; sigla: string; cor: string };

type MapaPermissoes = Record<Modulo, Permissao>;
type MatrizPermissoes = Record<Role, MapaPermissoes>;

type Sessao = {
  usuario: { id: string; nome: string; email: string; role: Role; deveTrocarSenha: boolean };
  permissoes: MapaPermissoes;
  escritorio: Identidade & { categorias: Record<string, string[]> };
  preferencias: { tema?: Theme; widgets?: Widget[] };
};

type Resultado = { ok: true } | { ok: false; erro: string };

const semPermissao = Object.fromEntries(MODULOS.map((m) => [m, "nenhum"])) as MapaPermissoes;
const matrizVazia = Object.fromEntries(ROLES.map((r) => [r, semPermissao])) as MatrizPermissoes;

type AppState = {
  role: Role;
  isAdmin: boolean;
  usuario: string;
  theme: Theme;
  toggleTheme: () => void;
  pode: (m: Modulo) => Permissao;

  logado: boolean | null;
  carregando: boolean;
  deveTrocarSenha: boolean;
  entrar: (email: string, senha: string) => Promise<Resultado>;
  sair: () => Promise<void>;
  trocarSenha: (senhaAtual: string, novaSenha: string) => Promise<Resultado>;

  processos: Processo[];
  setProcessos: Set<Processo[]>;
  criarProcesso: (p: Omit<Processo, "id" | "versao">) => Promise<Processo | null>;
  tarefas: Tarefa[];
  setTarefas: Set<Tarefa[]>;
  eventos: Evento[];
  setEventos: Set<Evento[]>;
  clientes: Cliente[];
  setClientes: Set<Cliente[]>;
  criarCliente: (c: Omit<Cliente, "id" | "versao">) => Promise<Cliente | null>;
  documentos: Documento[];
  enviarDocumento: (
    arquivo: File,
    pasta: string,
    processo: string,
  ) => Promise<{ documento: Documento; versao: string } | null>;
  restaurarVersao: (documentoId: string, versaoId: string) => Promise<boolean>;
  pastas: Pasta[];
  criarPasta: (p: Omit<Pasta, "id">) => Promise<boolean>;
  anexarDocCliente: (clienteId: string, docId: string, arquivo: File) => Promise<boolean>;
  lancamentos: Lancamento[];
  setLancamentos: Set<Lancamento[]>;
  modelos: Modelo[];
  setModelos: Set<Modelo[]>;
  contratos: Contrato[];
  setContratos: Set<Contrato[]>;
  intimacoes: Intimacao[];
  setIntimacoes: Set<Intimacao[]>;
  usuarios: Usuario[];
  criarUsuario: (d: {
    nome: string;
    email: string;
    oab?: string;
    role: Role;
    senha?: string;
  }) => Promise<{ id: string; senha: string } | null>;
  atualizarUsuario: (id: string, d: { role?: Role; ativo?: boolean }) => Promise<boolean>;
  redefinirSenhaUsuario: (id: string, senha?: string) => Promise<string | null>;
  excluirUsuario: (id: string) => Promise<boolean>;
  permissoes: MatrizPermissoes;
  alterarPermissao: (role: Role, modulo: Modulo, nivel: Permissao) => Promise<boolean>;
  logs: Log[];
  recarregarLogs: () => Promise<void>;
  registrar: (acao: Log["acao"], modulo: string, descricao: string) => void;

  widgets: Widget[];
  setWidgets: Set<Widget[]>;
  identidade: Identidade;
  setIdentidade: Set<Identidade>;
  categorias: Record<string, string[]>;
  setCategorias: Set<Record<string, string[]>>;
};

const Ctx = createContext<AppState | null>(null);

function useAdiado(fn: (v: unknown) => void, ms: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return useCallback(
    (v: unknown) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(v), ms);
    },
    [fn, ms],
  );
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [logado, setLogado] = useState<boolean | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  const processos = useColecao<Processo>({
    caminho: "/api/processos",
    atualizar: "PATCH",
    excluir: false,
  });
  const clientes = useColecao<Cliente>({
    caminho: "/api/clientes",
    atualizar: "PATCH",
    excluir: false,
  });
  const tarefas = useColecao<Tarefa>({
    caminho: "/api/tarefas",
    atualizar: "PATCH",
    excluir: true,
  });
  const eventos = useColecao<Evento>({ caminho: "/api/eventos", atualizar: "PUT", excluir: true });
  const lancamentos = useColecao<Lancamento>({
    caminho: "/api/lancamentos",
    atualizar: "PUT",
    excluir: true,
  });
  const modelos = useColecao<Modelo>({ caminho: "/api/modelos", atualizar: "PUT", excluir: false });
  const contratos = useColecao<Contrato>({
    caminho: "/api/contratos",
    atualizar: "PUT",
    excluir: false,
  });
  const intimacoes = useColecao<Intimacao>({
    caminho: "/api/intimacoes",
    atualizar: "PUT",
    excluir: true,
  });
  const documentos = useColecao<Documento & { versao?: number }>({
    caminho: "/api/documentos",
    atualizar: null,
    excluir: false,
  });

  const colecoes = useRef({
    processos,
    clientes,
    tarefas,
    eventos,
    lancamentos,
    modelos,
    contratos,
    intimacoes,
    documentos,
  });
  colecoes.current = {
    processos,
    clientes,
    tarefas,
    eventos,
    lancamentos,
    modelos,
    contratos,
    intimacoes,
    documentos,
  };

  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [permissoes, setPermissoes] = useState<MatrizPermissoes>(matrizVazia);
  const [logs, setLogs] = useState<Log[]>([]);
  const [widgets, setWidgetsLocal] = useState(widgetsIniciais);
  const [identidade, setIdentidadeLocal] = useState<Identidade>({
    nomeEscritorio: "",
    sigla: "",
    cor: "padrao",
  });
  const [categorias, setCategoriasLocal] = useState<Record<string, string[]>>({});

  const minhasPermissoes = sessao?.permissoes ?? semPermissao;
  const role: Role = sessao?.usuario.role ?? "estagiario";

  const pode = useCallback(
    (m: Modulo): Permissao => minhasPermissoes[m] ?? "nenhum",
    [minhasPermissoes],
  );

  const limparTudo = useCallback(() => {
    for (const c of Object.values(colecoes.current)) c.limpar();
    setPastas([]);
    setUsuarios([]);
    setPermissoes(matrizVazia);
    setLogs([]);
    setSessao(null);
  }, []);

  const recarregarLogs = useCallback(async () => {
    try {
      setLogs(await listarTudo<Log>("/api/auditoria", 3));
    } catch {
      setLogs([]);
    }
  }, []);

  const carregarDados = useCallback(
    async (s: Sessao) => {
      setCarregando(true);
      const {
        processos,
        intimacoes,
        clientes,
        tarefas,
        eventos,
        lancamentos,
        modelos,
        contratos,
        documentos,
      } = colecoes.current;
      const ver = (m: Modulo) => s.permissoes[m] !== "nenhum";
      const agenda = ver("Agenda") || ver("Audiências");
      const tarefasIniciais: Promise<unknown>[] = [
        api<Usuario[]>("GET", "/api/usuarios").then(setUsuarios),
        ver("Processos") ? processos.carregar() : Promise.resolve(),
        ver("Processos") ? intimacoes.carregar() : Promise.resolve(),
        ver("Clientes") ? clientes.carregar() : Promise.resolve(),
        ver("Tarefas") ? tarefas.carregar() : Promise.resolve(),
        agenda ? eventos.carregar() : Promise.resolve(),
        ver("Financeiro") ? lancamentos.carregar() : Promise.resolve(),
        ver("Contratos e Peças")
          ? Promise.all([modelos.carregar(), contratos.carregar()])
          : Promise.resolve(),
        ver("Documentos")
          ? Promise.all([documentos.carregar(), api<Pasta[]>("GET", "/api/pastas").then(setPastas)])
          : Promise.resolve(),
        ver("Configurações")
          ? Promise.all([
              api<MatrizPermissoes>("GET", "/api/permissoes").then(setPermissoes),
              recarregarLogs(),
            ])
          : Promise.resolve(),
      ];
      const resultados = await Promise.allSettled(tarefasIniciais);
      if (resultados.some((r) => r.status === "rejected"))
        toast.error("Parte dos dados não pôde ser carregada.", {
          description: "Recarregue a página para tentar de novo.",
        });
      setCarregando(false);
    },
    [recarregarLogs],
  );

  const aplicarSessao = useCallback(
    async (s: Sessao) => {
      setSessao(s);
      setIdentidadeLocal({
        nomeEscritorio: s.escritorio.nomeEscritorio,
        sigla: s.escritorio.sigla,
        cor: s.escritorio.cor,
      });
      setCategoriasLocal(s.escritorio.categorias);
      if (s.preferencias.tema) setTheme(s.preferencias.tema);
      if (s.preferencias.widgets?.length) setWidgetsLocal(s.preferencias.widgets);
      setLogado(true);
      if (!s.usuario.deveTrocarSenha) await carregarDados(s);
    },
    [carregarDados],
  );

  useEffect(() => {
    quandoPerderSessao(() => {
      limparTudo();
      setLogado(false);
    });
    api<Sessao>("GET", "/api/auth/sessao", { silencioso401: true })
      .then(aplicarSessao)
      .catch(() => setLogado(false));
  }, [aplicarSessao, limparTudo]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset["brand"] = identidade.cor;
  }, [identidade.cor]);

  const salvarPreferencias = useCallback((corpo: unknown) => {
    void api("PATCH", "/api/preferencias", { corpo }).catch(() => undefined);
  }, []);
  const salvarPreferenciasAdiado = useAdiado(salvarPreferencias, 500);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const novo = t === "dark" ? "light" : "dark";
      salvarPreferencias({ tema: novo });
      return novo;
    });
  }, [salvarPreferencias]);

  const setWidgets = useCallback<Set<Widget[]>>(
    (acao) =>
      setWidgetsLocal((prev) => {
        const proximo = typeof acao === "function" ? acao(prev) : acao;
        salvarPreferenciasAdiado({ widgets: proximo });
        return proximo;
      }),
    [salvarPreferenciasAdiado],
  );

  const salvarEscritorio = useCallback((corpo: unknown) => {
    void api("PATCH", "/api/escritorio", { corpo }).catch((e) => toast.error(mensagemDe(e)));
  }, []);
  const salvarEscritorioAdiado = useAdiado(salvarEscritorio, 700);

  const setIdentidade = useCallback<Set<Identidade>>(
    (acao) =>
      setIdentidadeLocal((prev) => {
        const proxima = typeof acao === "function" ? acao(prev) : acao;
        if (proxima.nomeEscritorio.trim() && proxima.sigla.trim()) salvarEscritorioAdiado(proxima);
        return proxima;
      }),
    [salvarEscritorioAdiado],
  );

  const setCategorias = useCallback<Set<Record<string, string[]>>>(
    (acao) =>
      setCategoriasLocal((prev) => {
        const proximas = typeof acao === "function" ? acao(prev) : acao;
        salvarEscritorio({ categorias: proximas });
        return proximas;
      }),
    [salvarEscritorio],
  );

  const entrar = useCallback(
    async (email: string, senha: string): Promise<Resultado> => {
      try {
        const s = await api<Sessao>("POST", "/api/auth/login", {
          corpo: { email: email.trim(), senha },
          silencioso401: true,
        });
        await aplicarSessao(s);
        return { ok: true };
      } catch (e) {
        if (e instanceof ErroApi && e.codigo === "VALIDACAO")
          return { ok: false, erro: "E-mail ou senha incorretos." };
        return { ok: false, erro: mensagemDe(e) };
      }
    },
    [aplicarSessao],
  );

  const sair = useCallback(async () => {
    await api("POST", "/api/auth/logout", { silencioso401: true }).catch(() => undefined);
    limparTudo();
    setLogado(false);
  }, [limparTudo]);

  const trocarSenha = useCallback(
    async (senhaAtual: string, novaSenha: string): Promise<Resultado> => {
      try {
        const s = await api<Sessao>("POST", "/api/auth/senha", {
          corpo: { senhaAtual, novaSenha },
        });
        await aplicarSessao(s);
        return { ok: true };
      } catch (e) {
        return { ok: false, erro: mensagemDe(e) };
      }
    },
    [aplicarSessao],
  );

  const registrar = useCallback((acao: Log["acao"], modulo: string, descricao: string) => {
    if (acao !== "Exportou" && acao !== "Visualizou") return;
    if (!(MODULOS as readonly string[]).includes(modulo)) return;
    void api("POST", "/api/auditoria", {
      corpo: { acao, modulo, descricao: descricao.slice(0, 300) },
    }).catch(() => undefined);
  }, []);

  const enviarDocumento = useCallback(async (arquivo: File, pasta: string, processo: string) => {
    if (arquivo.size > LIMITE_UPLOAD) {
      toast.error(`${arquivo.name}: ${MSG_LIMITE_UPLOAD}`);
      return null;
    }
    const form = new FormData();
    form.set("arquivo", arquivo);
    form.set("pasta", pasta);
    if (processo) form.set("processo", processo);
    try {
      const r = await api<{ documento: Documento; versao: string }>("POST", "/api/documentos", {
        formulario: form,
      });
      colecoes.current.documentos.substituirLocal(r.documento.id, r.documento);
      return r;
    } catch (e) {
      toast.error(`${arquivo.name}: ${mensagemDe(e)}`);
      return null;
    }
  }, []);

  const restaurarVersao = useCallback(async (documentoId: string, versaoId: string) => {
    try {
      const d = await api<Documento>(
        "POST",
        `/api/documentos/${documentoId}/versoes/${versaoId}/restaurar`,
      );
      colecoes.current.documentos.substituirLocal(d.id, d);
      return true;
    } catch (e) {
      toast.error(mensagemDe(e));
      return false;
    }
  }, []);

  const criarPasta = useCallback(async (p: Omit<Pasta, "id">) => {
    try {
      const criada = await api<Pasta>("POST", "/api/pastas", {
        corpo: p,
        idempotencia: novaChave(),
      });
      setPastas((prev) => [...prev, criada]);
      return true;
    } catch (e) {
      toast.error(mensagemDe(e));
      return false;
    }
  }, []);

  const anexarDocCliente = useCallback(async (clienteId: string, docId: string, arquivo: File) => {
    if (arquivo.size > LIMITE_UPLOAD) {
      toast.error(`${arquivo.name}: ${MSG_LIMITE_UPLOAD}`);
      return false;
    }
    const form = new FormData();
    form.set("arquivo", arquivo);
    try {
      await colecoes.current.clientes.aguardar();
      const c = await api<Cliente>(
        "POST",
        `/api/clientes/${clienteId}/documentos/${docId}/arquivo`,
        { formulario: form },
      );
      colecoes.current.clientes.substituirLocal(c.id, c);
      return true;
    } catch (e) {
      toast.error(mensagemDe(e));
      return false;
    }
  }, []);

  const criarUsuario = useCallback(
    async (d: { nome: string; email: string; oab?: string; role: Role; senha?: string }) => {
      try {
        const r = await api<{ usuario: Usuario; senhaTemporaria: string }>(
          "POST",
          "/api/usuarios",
          { corpo: d },
        );
        setUsuarios((prev) => [...prev, r.usuario]);
        return { id: r.usuario.id, senha: r.senhaTemporaria };
      } catch (e) {
        toast.error(mensagemDe(e));
        return null;
      }
    },
    [],
  );

  const atualizarUsuario = useCallback(async (id: string, d: { role?: Role; ativo?: boolean }) => {
    try {
      const u = await api<Usuario>("PATCH", `/api/usuarios/${id}`, { corpo: d });
      setUsuarios((prev) => prev.map((x) => (x.id === id ? u : x)));
      return true;
    } catch (e) {
      toast.error(mensagemDe(e));
      return false;
    }
  }, []);

  const redefinirSenhaUsuario = useCallback(async (id: string, senha?: string) => {
    try {
      return (
        await api<{ senhaTemporaria: string }>("POST", `/api/usuarios/${id}/senha`, {
          ...(senha && { corpo: { senha } }),
        })
      ).senhaTemporaria;
    } catch (e) {
      toast.error(mensagemDe(e));
      return null;
    }
  }, []);

  const excluirUsuario = useCallback(async (id: string) => {
    try {
      await api("DELETE", `/api/usuarios/${id}`);
      setUsuarios((prev) => prev.filter((x) => x.id !== id));
      return true;
    } catch (e) {
      toast.error(mensagemDe(e));
      return false;
    }
  }, []);

  const alterarPermissao = useCallback(async (r: Role, modulo: Modulo, nivel: Permissao) => {
    try {
      setPermissoes(
        await api<MatrizPermissoes>("PUT", "/api/permissoes", {
          corpo: { role: r, modulo, nivel },
        }),
      );
      return true;
    } catch (e) {
      toast.error(mensagemDe(e));
      return false;
    }
  }, []);

  const value = useMemo<AppState>(
    () => ({
      role,
      isAdmin: role === "admin",
      usuario: sessao?.usuario.nome ?? "",
      theme,
      toggleTheme,
      pode,
      logado,
      carregando,
      deveTrocarSenha: !!sessao?.usuario.deveTrocarSenha,
      entrar,
      sair,
      trocarSenha,
      processos: processos.lista,
      setProcessos: processos.definir,
      criarProcesso: processos.criar,
      tarefas: tarefas.lista,
      setTarefas: tarefas.definir,
      eventos: eventos.lista,
      setEventos: eventos.definir,
      clientes: clientes.lista,
      setClientes: clientes.definir,
      criarCliente: clientes.criar,
      documentos: documentos.lista,
      enviarDocumento,
      restaurarVersao,
      pastas,
      criarPasta,
      anexarDocCliente,
      lancamentos: lancamentos.lista,
      setLancamentos: lancamentos.definir,
      modelos: modelos.lista,
      setModelos: modelos.definir,
      contratos: contratos.lista,
      setContratos: contratos.definir,
      intimacoes: intimacoes.lista,
      setIntimacoes: intimacoes.definir,
      usuarios,
      criarUsuario,
      atualizarUsuario,
      redefinirSenhaUsuario,
      excluirUsuario,
      permissoes,
      alterarPermissao,
      logs,
      recarregarLogs,
      registrar,
      widgets,
      setWidgets,
      identidade,
      setIdentidade,
      categorias,
      setCategorias,
    }),
    [
      role,
      sessao,
      theme,
      toggleTheme,
      pode,
      logado,
      carregando,
      entrar,
      sair,
      trocarSenha,
      processos.lista,
      processos.definir,
      processos.criar,
      tarefas.lista,
      tarefas.definir,
      eventos.lista,
      eventos.definir,
      clientes.lista,
      clientes.definir,
      clientes.criar,
      documentos.lista,
      enviarDocumento,
      restaurarVersao,
      pastas,
      criarPasta,
      anexarDocCliente,
      lancamentos.lista,
      lancamentos.definir,
      modelos.lista,
      modelos.definir,
      contratos.lista,
      contratos.definir,
      intimacoes.lista,
      intimacoes.definir,
      usuarios,
      criarUsuario,
      atualizarUsuario,
      redefinirSenhaUsuario,
      excluirUsuario,
      permissoes,
      alterarPermissao,
      logs,
      recarregarLogs,
      registrar,
      widgets,
      setWidgets,
      identidade,
      setIdentidade,
      categorias,
      setCategorias,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp precisa estar dentro de AppProvider");
  return ctx;
}
