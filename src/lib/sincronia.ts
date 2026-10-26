import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { api, ErroApi, listarTudo, mensagemDe, novaChave } from "./api";

type Item = { id: string; versao?: number };

export type ConfigColecao<T> = {
  caminho: string;
  atualizar: "PATCH" | "PUT" | null;
  excluir: boolean;
};

export function useColecao<T extends Item>(cfg: ConfigColecao<T>) {
  const [lista, setLista] = useState<T[]>([]);
  const atual = useRef<T[]>([]);
  const fila = useRef<Promise<void>>(Promise.resolve());
  const ids = useRef(new Map<string, string>());
  const versoes = useRef(new Map<string, number>());
  const removidos = useRef(new Set<string>());

  const gravar = useCallback((proxima: T[]) => {
    atual.current = proxima;
    setLista(proxima);
  }, []);

  const lembrar = useCallback((itens: T[]) => {
    for (const i of itens) if (i.versao !== undefined) versoes.current.set(i.id, i.versao);
  }, []);

  const carregar = useCallback(async () => {
    const itens = await listarTudo<T>(cfg.caminho);
    lembrar(itens);
    gravar(itens);
    return itens;
  }, [cfg.caminho, gravar, lembrar]);

  const limpar = useCallback(() => {
    ids.current.clear();
    versoes.current.clear();
    gravar([]);
  }, [gravar]);

  const substituirLocal = useCallback(
    (idLocal: string, item: T) => {
      lembrar([item]);
      if (removidos.current.has(idLocal)) return;
      const lista = atual.current;
      const mesmo = (x: T) => x.id === idLocal || x.id === item.id;
      gravar(lista.some(mesmo) ? lista.map((x) => (mesmo(x) ? item : x)) : [item, ...lista]);
    },
    [gravar, lembrar],
  );

  const removerLocal = useCallback(
    (id: string) => gravar(atual.current.filter((x) => x.id !== id)),
    [gravar],
  );

  const falhou = useCallback(
    (e: unknown) => {
      toast.error(
        mensagemDe(e),
        e instanceof ErroApi && e.codigo === "VERSAO_DESATUALIZADA"
          ? { description: "Os dados foram recarregados." }
          : undefined,
      );
      void carregar().catch(() => undefined);
    },
    [carregar],
  );

  const enfileirar = useCallback((tarefa: () => Promise<void>) => {
    fila.current = fila.current.then(tarefa, tarefa);
  }, []);

  const definir = useCallback<Dispatch<SetStateAction<T[]>>>(
    (acao) => {
      const anterior = atual.current;
      const proxima = typeof acao === "function" ? (acao as (p: T[]) => T[])(anterior) : acao;
      gravar(proxima);
      const antes = new Map(anterior.map((x) => [x.id, x]));
      const depois = new Map(proxima.map((x) => [x.id, x]));

      for (const item of proxima) {
        const velho = antes.get(item.id);
        if (!velho) {
          const chave = novaChave();
          enfileirar(async () => {
            try {
              const { id: _id, versao: _v, ...corpo } = item;
              const criado = await api<T>("POST", cfg.caminho, { corpo, idempotencia: chave });
              ids.current.set(item.id, criado.id);
              substituirLocal(item.id, criado);
            } catch (e) {
              removerLocal(item.id);
              falhou(e);
            }
          });
        } else if (
          velho !== item &&
          cfg.atualizar &&
          JSON.stringify(velho) !== JSON.stringify(item)
        ) {
          enfileirar(async () => {
            const id = ids.current.get(item.id) ?? item.id;
            try {
              const versao = versoes.current.get(id) ?? item.versao;
              const salvo = await api<T>(cfg.atualizar!, `${cfg.caminho}/${id}`, {
                corpo: { ...item, id, versao },
              });
              substituirLocal(item.id, salvo);
            } catch (e) {
              falhou(e);
            }
          });
        }
      }

      for (const velho of anterior) {
        if (depois.has(velho.id) || !cfg.excluir) continue;
        removidos.current.add(velho.id);
        enfileirar(async () => {
          const id = ids.current.get(velho.id) ?? velho.id;
          try {
            await api("DELETE", `${cfg.caminho}/${id}`);
          } catch (e) {
            falhou(e);
          }
        });
      }
    },
    [
      cfg.atualizar,
      cfg.caminho,
      cfg.excluir,
      enfileirar,
      falhou,
      gravar,
      removerLocal,
      substituirLocal,
    ],
  );

  const criar = useCallback(
    async (item: Omit<T, "id" | "versao">) => {
      try {
        const criado = await api<T>("POST", cfg.caminho, {
          corpo: item,
          idempotencia: novaChave(),
        });
        substituirLocal(criado.id, criado);
        return criado;
      } catch (e) {
        toast.error(mensagemDe(e));
        return null;
      }
    },
    [cfg.caminho, substituirLocal],
  );

  return { lista, definir, carregar, limpar, substituirLocal, gravar, criar };
}
