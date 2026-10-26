import { json, rota } from "@/server/http/rota";
import { lerBusca, lerJson, paginacao } from "@/server/http/corpo";
import {
  criarEvento,
  esquemaCriarEvento,
  exigirAgendaOuAudiencias,
  listarEventos,
} from "@/server/modulos/eventos";

export const GET = rota({}, async (ctx) => {
  exigirAgendaOuAudiencias(ctx);
  return json(await listarEventos(ctx, lerBusca(ctx.req, paginacao)));
});

export const POST = rota({}, async (ctx) => {
  const { evento, repetido } = await criarEvento(ctx, await lerJson(ctx.req, esquemaCriarEvento));
  return json(evento, repetido ? 200 : 201);
});
