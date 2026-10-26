import { z } from "zod";
import { json, rota } from "@/server/http/rota";
import { lerBusca, lerJson, paginacao } from "@/server/http/corpo";
import {
  criarLancamentos,
  esquemaCriarLancamento,
  esquemaCriarLancamentos,
  listarLancamentos,
} from "@/server/modulos/financeiro";

export const GET = rota({ modulo: "Financeiro" }, async (ctx) =>
  json(await listarLancamentos(ctx, lerBusca(ctx.req, paginacao))),
);

export const POST = rota({ modulo: "Financeiro", nivel: "editar" }, async (ctx) => {
  const corpo = await lerJson(
    ctx.req,
    z.union([esquemaCriarLancamentos, esquemaCriarLancamento]),
    512 * 1024,
  );
  const lista = "lancamentos" in corpo ? corpo.lancamentos : [corpo];
  const { lancamentos, repetido } = await criarLancamentos(ctx, lista);
  return json("lancamentos" in corpo ? { lancamentos } : lancamentos[0], repetido ? 200 : 201);
});
