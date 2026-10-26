import { json, rota } from "@/server/http/rota";
import { lerBusca, lerJson, paginacao } from "@/server/http/corpo";
import { criarContrato, esquemaCriarContrato, listarContratos } from "@/server/modulos/contratos";

export const GET = rota({ modulo: "Contratos e Peças" }, async (ctx) =>
  json(await listarContratos(ctx, lerBusca(ctx.req, paginacao))),
);

export const POST = rota({ modulo: "Contratos e Peças", nivel: "editar" }, async (ctx) => {
  const { contrato, repetido } = await criarContrato(
    ctx,
    await lerJson(ctx.req, esquemaCriarContrato),
  );
  return json(contrato, repetido ? 200 : 201);
});
