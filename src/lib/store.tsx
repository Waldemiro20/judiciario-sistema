import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  agoraCarimbo,
  clientesIniciais,
  contratosIniciais,
  documentosIniciais,
  eventosIniciais,
  intimacoesIniciais,
  lancamentosIniciais,
  logsIniciais,
  modelosIniciais,
  pastasIniciais,
  PERFIS_DEMO,
  permissoesIniciais,
  processosIniciais,
  tarefasIniciais,
  uid,
  USUARIOS,
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

/** Credenciais fixas do protótipo (sem back-end). */
export const LOGIN_DEMO = { email: "admin123@gmail.com", senha: "admin123" };
const CHAVE_SESSAO = "gestao-juridica:logado";

type AppState = {
  role: Role;
  isAdmin: boolean;
  usuario: string;
  trocarPerfil: (nome: string) => void;
  theme: Theme;
  toggleTheme: () => void;
  pode: (m: Modulo) => Permissao;

  /** null enquanto a sessão ainda não foi lida do navegador. */
  logado: boolean | null;
  entrar: (email: string, senha: string) => boolean;
  sair: () => void;

  processos: Processo[];
  setProcessos: Set<Processo[]>;
  tarefas: Tarefa[];
  setTarefas: Set<Tarefa[]>;
  eventos: Evento[];
  setEventos: Set<Evento[]>;
  clientes: Cliente[];
  setClientes: Set<Cliente[]>;
  documentos: Documento[];
  setDocumentos: Set<Documento[]>;
  pastas: Pasta[];
  setPastas: Set<Pasta[]>;
  lancamentos: Lancamento[];
  setLancamentos: Set<Lancamento[]>;
  modelos: Modelo[];
  setModelos: Set<Modelo[]>;
  contratos: Contrato[];
  setContratos: Set<Contrato[]>;
  intimacoes: Intimacao[];
  setIntimacoes: Set<Intimacao[]>;
  usuarios: Usuario[];
  setUsuarios: Set<Usuario[]>;
  permissoes: Record<Role, Record<Modulo, Permissao>>;
  setPermissoes: Set<Record<Role, Record<Modulo, Permissao>>>;
  logs: Log[];
  registrar: (acao: Log["acao"], modulo: string, descricao: string) => void;

  widgets: Widget[];
  setWidgets: Set<Widget[]>;
  identidade: Identidade;
  setIdentidade: Set<Identidade>;
  categorias: Record<string, string[]>;
  setCategorias: Set<Record<string, string[]>>;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState(PERFIS_DEMO[0]!.nome);
  const [role, setRole] = useState<Role>(PERFIS_DEMO[0]!.role);
  const [theme, setTheme] = useState<Theme>("light");
  const [logado, setLogado] = useState<boolean | null>(null);

  const [processos, setProcessos] = useState(processosIniciais);
  const [tarefas, setTarefas] = useState(tarefasIniciais);
  const [eventos, setEventos] = useState(eventosIniciais);
  const [clientes, setClientes] = useState(clientesIniciais);
  const [documentos, setDocumentos] = useState(documentosIniciais);
  const [pastas, setPastas] = useState(pastasIniciais);
  const [lancamentos, setLancamentos] = useState(lancamentosIniciais);
  const [modelos, setModelos] = useState(modelosIniciais);
  const [contratos, setContratos] = useState(contratosIniciais);
  const [intimacoes, setIntimacoes] = useState(intimacoesIniciais);
  const [usuarios, setUsuarios] = useState(USUARIOS);
  const [permissoes, setPermissoes] = useState(permissoesIniciais);
  const [logs, setLogs] = useState(logsIniciais);
  const [widgets, setWidgets] = useState(widgetsIniciais);
  const [identidade, setIdentidade] = useState<Identidade>({
    nomeEscritorio: "Lacerda & Voss Advogados",
    sigla: "LV",
    cor: "padrao",
  });
  const [categorias, setCategorias] = useState<Record<string, string[]>>({
    "Áreas de atuação": ["Direito Civil", "Criminal", "Previdenciário", "Família", "Consumidor"],
    "Tipos de compromisso": ["Audiência", "Reunião", "Prazo"],
    "Categorias financeiras": ["Honorários", "Custas", "Despesas fixas"],
    "Pastas de documentos": ["Petições", "Provas", "Contratos", "Pareceres"],
  });

  // A sessão fica guardada só na aba atual do navegador (sessionStorage).
  useEffect(() => {
    try {
      setLogado(sessionStorage.getItem(CHAVE_SESSAO) === "1");
    } catch {
      setLogado(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset["brand"] = identidade.cor;
  }, [identidade.cor]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  const registrar = useCallback(
    (acao: Log["acao"], modulo: string, descricao: string) => {
      const { data, hora } = agoraCarimbo();
      setLogs((prev) => [
        {
          id: uid(),
          usuario,
          acao,
          modulo,
          descricao,
          ip: "189.44.12.30",
          quando: `${data} ${hora}`,
        },
        ...prev,
      ]);
    },
    [usuario],
  );

  const trocarPerfil = useCallback(
    (nome: string) => {
      const u = usuarios.find((x) => x.nome === nome);
      if (!u) return;
      setUsuario(u.nome);
      setRole(u.role);
    },
    [usuarios],
  );

  const entrar = useCallback((email: string, senha: string) => {
    const ok = email.trim().toLowerCase() === LOGIN_DEMO.email && senha === LOGIN_DEMO.senha;
    if (!ok) return false;
    const admin = PERFIS_DEMO[0]!;
    setUsuario(admin.nome);
    setRole(admin.role);
    setLogado(true);
    try {
      sessionStorage.setItem(CHAVE_SESSAO, "1");
    } catch {
      /* sem armazenamento: sessão só em memória */
    }
    const { data, hora } = agoraCarimbo();
    setLogs((prev) => [
      {
        id: uid(),
        usuario: admin.nome,
        acao: "Login",
        modulo: "Sistema",
        descricao: "Acesso ao sistema",
        ip: "189.44.12.30",
        quando: `${data} ${hora}`,
      },
      ...prev,
    ]);
    return true;
  }, []);

  const sair = useCallback(() => {
    setLogado(false);
    try {
      sessionStorage.removeItem(CHAVE_SESSAO);
    } catch {
      /* ignora */
    }
  }, []);

  const pode = useCallback(
    (m: Modulo): Permissao => {
      // Regra de negócio: Financeiro é exclusivo do Advogado Administrador.
      if (m === "Financeiro") return role === "admin" ? "editar" : "nenhum";
      return permissoes[role][m];
    },
    [role, permissoes],
  );

  const value = useMemo<AppState>(
    () => ({
      role,
      isAdmin: role === "admin",
      usuario,
      trocarPerfil,
      theme,
      toggleTheme,
      pode,
      logado,
      entrar,
      sair,
      processos,
      setProcessos,
      tarefas,
      setTarefas,
      eventos,
      setEventos,
      clientes,
      setClientes,
      documentos,
      setDocumentos,
      pastas,
      setPastas,
      lancamentos,
      setLancamentos,
      modelos,
      setModelos,
      contratos,
      setContratos,
      intimacoes,
      setIntimacoes,
      usuarios,
      setUsuarios,
      permissoes,
      setPermissoes,
      logs,
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
      usuario,
      trocarPerfil,
      theme,
      toggleTheme,
      pode,
      logado,
      entrar,
      sair,
      processos,
      tarefas,
      eventos,
      clientes,
      documentos,
      pastas,
      lancamentos,
      modelos,
      contratos,
      intimacoes,
      usuarios,
      permissoes,
      logs,
      registrar,
      widgets,
      identidade,
      categorias,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp precisa estar dentro de AppProvider");
  return ctx;
}
