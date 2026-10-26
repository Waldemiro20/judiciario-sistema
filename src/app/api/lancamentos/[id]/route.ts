import { json, rota, semConteudo } from "@/server/http/rota";
import { idDe, lerJson } from "@/server/http/corpo";
import {
  esquemaSubstituirLancamento,
  substituirLancamento,
  excluirLancamento,
} from "@/server/modulos/financeiro";

type P = { id: string };

export const PUT = rota<P>({ modulo: "Financeiro", nivel: "editar" }, async (ctx, p) =>
  json(
    await substituirLancamento(ctx, idDe(p), await lerJson(ctx.req, esquemaSubstituirLancamento)),
  ),
);

export const DELETE = rota<P>({ modulo: "Financeiro", nivel: "editar" }, async (ctx, p) => {
  await excluirLancamento(ctx, idDe(p));
  return semConteudo();
});
