import { json, rota } from "@/server/http/rota";
import { lerJson } from "@/server/http/corpo";
import { criarPasta, esquemaCriarPasta, listarPastas } from "@/server/modulos/documentos";

export const GET = rota({ modulo: "Documentos" }, async (ctx) => json(await listarPastas(ctx)));

export const POST = rota({ modulo: "Documentos", nivel: "editar" }, async (ctx) =>
  json(await criarPasta(ctx, await lerJson(ctx.req, esquemaCriarPasta)), 201),
);
