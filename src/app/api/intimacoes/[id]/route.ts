import { json, rota, semConteudo } from "@/server/http/rota";
import { idDe, lerJson } from "@/server/http/corpo";
import {
  esquemaSubstituirIntimacao,
  substituirIntimacao,
  excluirIntimacao,
} from "@/server/modulos/intimacoes";

type P = { id: string };

export const PUT = rota<P>({ modulo: "Processos", nivel: "editar" }, async (ctx, p) =>
  json(await substituirIntimacao(ctx, idDe(p), await lerJson(ctx.req, esquemaSubstituirIntimacao))),
);

export const DELETE = rota<P>({ modulo: "Processos", nivel: "editar" }, async (ctx, p) => {
  await excluirIntimacao(ctx, idDe(p));
  return semConteudo();
});
