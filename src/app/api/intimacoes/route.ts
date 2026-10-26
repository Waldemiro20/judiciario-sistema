import { json, rota } from "@/server/http/rota";
import { lerBusca, lerJson, paginacao } from "@/server/http/corpo";
import {
  criarIntimacao,
  esquemaCriarIntimacao,
  listarIntimacoes,
} from "@/server/modulos/intimacoes";

export const GET = rota({ modulo: "Processos" }, async (ctx) =>
  json(await listarIntimacoes(ctx, lerBusca(ctx.req, paginacao))),
);

export const POST = rota({ modulo: "Processos", nivel: "editar" }, async (ctx) => {
  const { intimacao, repetido } = await criarIntimacao(
    ctx,
    await lerJson(ctx.req, esquemaCriarIntimacao),
  );
  return json(intimacao, repetido ? 200 : 201);
});
