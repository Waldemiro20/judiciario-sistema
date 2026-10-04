import { useMemo } from "react";
import { diasAte, docsPendentes, fmtDM, HOJE } from "./data";
import { useApp } from "./store";

export type Pendencia = {
  id: string;
  nivel: "critico" | "atencao" | "info";
  titulo: string;
  detalhe: string;
  to: string;
  params?: Record<string, string>;
};

/**
 * Gestão proativa: reúne tudo o que precisa de atenção do usuário logado.
 * No protótipo é calculado a partir dos dados de exemplo — sem automação/back-end.
 */
export function usePendencias() {
  const { tarefas, eventos, clientes, intimacoes, contratos, usuario, isAdmin } = useApp();

  return useMemo(() => {
    const lista: Pendencia[] = [];

    for (const t of tarefas) {
      if (t.coluna === "Concluído" || t.responsavel !== usuario) continue;
      const d = diasAte(t.prazo);
      if (d < 0)
        lista.push({
          id: `ta-${t.id}`,
          nivel: "critico",
          titulo: `Tarefa atrasada: ${t.titulo}`,
          detalhe: `Venceu em ${fmtDM(t.prazo)} (${-d} dia${d === -1 ? "" : "s"})`,
          to: "/tarefas",
        });
      else if (d === 0)
        lista.push({
          id: `th-${t.id}`,
          nivel: "atencao",
          titulo: `Vence hoje: ${t.titulo}`,
          detalhe: t.vinculo,
          to: "/tarefas",
        });
    }

    for (const e of eventos) {
      const d = diasAte(e.data);
      if (e.recorrencia !== "Não repete" || d < 0 || d > 1) continue;
      if (e.advogado !== usuario && !isAdmin) continue;
      lista.push({
        id: `ev-${e.id}`,
        nivel: e.tipo === "Reunião" ? "info" : "critico",
        titulo: `${e.tipo} ${d === 0 ? "hoje" : "amanhã"} às ${e.hora}`,
        detalhe: `${e.titulo} · ${e.advogado}`,
        to: e.tipo === "Audiência" ? "/audiencias" : "/agenda",
      });
    }

    for (const i of intimacoes.filter((x) => !x.lida))
      lista.push({
        id: `in-${i.id}`,
        nivel: "atencao",
        titulo: "Nova intimação não lida",
        detalhe: `${i.processo} · ${i.resumo}`,
        to: "/",
      });

    for (const c of clientes) {
      const p = docsPendentes(c);
      if (c.status === "Ativo" && p.length)
        lista.push({
          id: `cl-${c.id}`,
          nivel: "atencao",
          titulo: `Documentação pendente: ${c.nome}`,
          detalhe: `Falta: ${p.map((x) => x.nome).join(", ")}`,
          to: "/clientes/$id",
          params: { id: c.id },
        });
    }

    for (const c of contratos) {
      const d = diasAte(c.fim);
      if (d >= 0 && d <= 30)
        lista.push({
          id: `co-${c.id}`,
          nivel: "info",
          titulo: `Contrato vence em ${d} dias`,
          detalhe: `${c.titulo} · ${c.cliente}`,
          to: "/contratos",
        });
    }

    const ordem = { critico: 0, atencao: 1, info: 2 };
    return lista.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
  }, [tarefas, eventos, clientes, intimacoes, contratos, usuario, isAdmin]);
}

export { HOJE };
