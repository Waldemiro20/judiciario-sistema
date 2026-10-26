import { json, rota } from "@/server/http/rota";
import { lerBusca, lerJson, paginacao } from "@/server/http/corpo";
import { criarModelo, esquemaCriarModelo, listarModelos } from "@/server/modulos/contratos";

export const GET = rota({ modulo: "Contratos e Peças" }, async (ctx) =>
  json(await listarModelos(ctx, lerBusca(ctx.req, paginacao))),
);

export const POST = rota({ modulo: "Contratos e Peças", nivel: "editar" }, async (ctx) => {
  const { modelo, repetido } = await criarModelo(ctx, await lerJson(ctx.req, esquemaCriarModelo));
  return json(modelo, repetido ? 200 : 201);
});
