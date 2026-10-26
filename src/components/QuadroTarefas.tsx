import { Link } from "@/lib/navegacao";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Avatar, Chip, Empty } from "@/components/kit";
import { prazoInfo } from "@/components/TarefaDialog";
import { diasAte, type Coluna, type Tarefa } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const coluna = (t: Tarefa) => t.coluna as string;
export const concluida = (t: Tarefa) => coluna(t) === "Concluído";
export const atrasada = (t: Tarefa) => !concluida(t) && diasAte(t.prazo) < 0;

export const ordemTarefas = (a: Tarefa, b: Tarefa) =>
  Number(atrasada(b)) - Number(atrasada(a)) || a.prazo.localeCompare(b.prazo);

export const COLUNAS_QUADRO: {
  id: Coluna;
  titulo: string;
  dot: string;
  anterior: Coluna | null;
  proxima: Coluna | null;
}[] = [
  { id: "A Fazer", titulo: "Tarefas", dot: "bg-primary", anterior: null, proxima: "Em Andamento" },
  {
    id: "Em Andamento",
    titulo: "Desenvolvimento",
    dot: "bg-[var(--warning)]",
    anterior: "A Fazer",
    proxima: "Concluído",
  },
  {
    id: "Concluído",
    titulo: "Concluídas",
    dot: "bg-[var(--success)]",
    anterior: "Em Andamento",
    proxima: null,
  },
];

const ROTULO: Record<string, string> = {
  "A Fazer": "Tarefas",
  "Em Andamento": "Desenvolvimento",
  Concluído: "Concluídas",
};

export const listaDaColuna = (lista: Tarefa[], id: Coluna) =>
  lista.filter((t) =>
    id === "Concluído"
      ? concluida(t)
      : id === "Em Andamento"
        ? coluna(t) === "Em Andamento"
        : !concluida(t) && coluna(t) !== "Em Andamento",
  );

export function QuadroTarefas({
  lista,
  vazio = "Nada por aqui.",
  limite = MAX_ITENS,
  mostrarVinculo = true,
  onVerTudo,
  onAbrir,
  className,
}: {
  lista: Tarefa[];
  vazio?: string;
  limite?: number;
  mostrarVinculo?: boolean;
  onVerTudo?: () => void;
  onAbrir: (id: string) => void;
  className?: string;
}) {
  const { tarefas, setTarefas, registrar } = useApp();
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);

  const mover = (t: Tarefa, destino: Coluna) => {
    if (coluna(t) === (destino as string)) return;
    setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, coluna: destino } : x)));
    registrar("Editou", "Tarefas", `Moveu "${t.titulo}" para ${ROTULO[destino as string]}`);
    toast.success(`Movida para ${ROTULO[destino as string]}`);
  };

  const soltar = (destino: Coluna) => {
    const t = tarefas.find((x) => x.id === arrastando);
    setArrastando(null);
    setSobre(null);
    if (t) mover(t, destino);
  };

  return (
    <div className="@container">
      <div className={cn("grid grid-cols-1 gap-4 @2xl:grid-cols-3", className)}>
        {COLUNAS_QUADRO.map((c) => (
          <ColunaKanban
            key={c.id}
            id={c.id}
            titulo={c.titulo}
            dot={c.dot}
            anterior={c.anterior}
            proxima={c.proxima}
            lista={listaDaColuna(lista, c.id)}
            vazio={vazio}
            limite={limite}
            mostrarVinculo={mostrarVinculo}
            onVerTudo={onVerTudo}
            arrastando={arrastando}
            sobre={sobre}
            setArrastando={setArrastando}
            setSobre={setSobre}
            onSoltar={soltar}
            onMover={mover}
            onAbrir={onAbrir}
          />
        ))}
      </div>
    </div>
  );
}

const MAX_ITENS = 5;

function bordaPrioridade(t: Tarefa) {
  if (concluida(t)) return "border-l-[var(--success)]";
  if (atrasada(t)) return "border-l-[var(--critical)]";
  if (diasAte(t.prazo) <= 1) return "border-l-[var(--warning)]";
  return "border-l-transparent";
}

function VerTudo({
  onVerTudo,
  className,
  children,
}: {
  onVerTudo: (() => void) | undefined;
  className: string;
  children: ReactNode;
}) {
  if (onVerTudo)
    return (
      <button type="button" onClick={onVerTudo} className={cn("text-left", className)}>
        {children}
      </button>
    );
  return (
    <Link to="/tarefas" className={className}>
      {children}
    </Link>
  );
}

function ColunaKanban({
  id,
  titulo,
  dot,
  anterior,
  proxima,
  lista,
  vazio,
  limite,
  mostrarVinculo,
  onVerTudo,
  arrastando,
  sobre,
  setArrastando,
  setSobre,
  onSoltar,
  onMover,
  onAbrir,
}: {
  id: Coluna;
  titulo: string;
  dot: string;
  anterior: Coluna | null;
  proxima: Coluna | null;
  lista: Tarefa[];
  vazio: string;
  limite: number;
  mostrarVinculo: boolean;
  onVerTudo: (() => void) | undefined;
  arrastando: string | null;
  sobre: string | null;
  setArrastando: (id: string | null) => void;
  setSobre: (id: string | null) => void;
  onSoltar: (destino: Coluna) => void;
  onMover: (t: Tarefa, destino: Coluna) => void;
  onAbrir: (id: string) => void;
}) {
  const alvo = sobre === (id as string);
  const restantes = lista.length - limite;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!alvo) setSobre(id as string);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSobre(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onSoltar(id);
      }}
      className={cn(
        "@container/col glass-panel flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-transparent transition-colors",
        alvo && "border-primary",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 className="flex min-w-0 items-center gap-2 truncate text-sm font-semibold">
          <span className={cn("size-2.5 rounded-full", dot)} />
          {titulo}
          <span className="text-[11px] font-normal text-muted-foreground">{lista.length}</span>
        </h2>
        <VerTudo
          onVerTudo={onVerTudo}
          className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          Ver tudo →
        </VerTudo>
      </div>

      <div className="divide-y divide-border">
        {lista.length === 0 && <Empty>{vazio}</Empty>}
        {lista.slice(0, limite).map((t) => {
          const feita = concluida(t);
          const atras = atrasada(t);
          const p = prazoInfo(t);
          return (
            <div
              key={t.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", t.id);
                setArrastando(t.id);
              }}
              onDragEnd={() => {
                setArrastando(null);
                setSobre(null);
              }}
              className={cn(
                "group flex cursor-grab items-center gap-2 border-l-4 py-2.5 pl-2 pr-1.5 hover:bg-accent/50 active:cursor-grabbing",
                bordaPrioridade(t),
                arrastando === t.id && "opacity-40",
              )}
            >
              <Avatar nome={t.responsavel} />
              <button onClick={() => onAbrir(t.id)} className="min-w-0 flex-1 text-left">
                <span
                  className={cn(
                    "block truncate text-sm font-bold",
                    feita && "text-muted-foreground line-through",
                  )}
                >
                  {t.titulo}
                </span>
                {t.descricao && (
                  <span className="line-clamp-2 text-xs text-muted-foreground">{t.descricao}</span>
                )}
                {mostrarVinculo && (
                  <span className="block truncate text-[11px] text-muted-foreground/80">
                    {t.vinculo}
                  </span>
                )}
                {!feita && (
                  <span
                    className={cn(
                      "block text-[11px] @xs/col:hidden",
                      atras ? "font-semibold text-[var(--critical)]" : "text-muted-foreground",
                    )}
                  >
                    {p.label}
                  </span>
                )}
              </button>
              {!feita && (
                <Chip tone={p.tone} className="hidden shrink-0 @xs/col:inline-flex">
                  {p.label}
                </Chip>
              )}
              <div className="flex shrink-0 items-center transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0">
                {anterior && (
                  <button
                    aria-label={`Mover para ${ROTULO[anterior as string]}`}
                    onClick={() => onMover(t, anterior)}
                    className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:size-7"
                  >
                    <ArrowLeft className="size-4 sm:size-3.5" />
                  </button>
                )}
                {proxima && (
                  <button
                    aria-label={`Mover para ${ROTULO[proxima as string]}`}
                    onClick={() => onMover(t, proxima)}
                    className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:size-7"
                  >
                    <ArrowRight className="size-4 sm:size-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {restantes > 0 && (
        <VerTudo
          onVerTudo={onVerTudo}
          className="border-t border-border px-4 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          + {restantes} {restantes === 1 ? "tarefa" : "tarefas"} · Ver tudo →
        </VerTudo>
      )}

      {arrastando && (
        <div
          className={cn(
            "m-2 rounded-lg border-2 border-dashed px-3 py-3 text-center text-[11px] text-muted-foreground transition-colors",
            alvo ? "border-primary bg-[var(--brand-soft)]" : "border-border",
          )}
        >
          {alvo ? "Solte aqui" : "Arraste para cá"}
        </div>
      )}
    </div>
  );
}
