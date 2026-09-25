import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  documentosIniciais,
  tarefasIniciais,
  USUARIO_ATUAL,
  type Documento,
  type Role,
  type Tarefa,
} from "./data";

type Theme = "light" | "dark";

type AppState = {
  role: Role;
  setRole: (r: Role) => void;
  isAdmin: boolean;
  theme: Theme;
  toggleTheme: () => void;
  usuario: string;
  tarefas: Tarefa[];
  setTarefas: React.Dispatch<React.SetStateAction<Tarefa[]>>;
  documentos: Documento[];
  setDocumentos: React.Dispatch<React.SetStateAction<Documento[]>>;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("socio");
  const [theme, setTheme] = useState<Theme>("light");
  const [tarefas, setTarefas] = useState<Tarefa[]>(tarefasIniciais);
  const [documentos, setDocumentos] = useState<Documento[]>(documentosIniciais);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    [],
  );

  const value = useMemo(
    () => ({
      role,
      setRole,
      isAdmin: role === "socio",
      theme,
      toggleTheme,
      usuario: USUARIO_ATUAL,
      tarefas,
      setTarefas,
      documentos,
      setDocumentos,
    }),
    [role, theme, toggleTheme, tarefas, documentos],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp precisa estar dentro de AppProvider");
  return ctx;
}
