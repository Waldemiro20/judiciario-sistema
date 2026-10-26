import { json, rota } from "@/server/http/rota";
import { lerJson } from "@/server/http/corpo";
import { criarUsuario, esquemaCriarUsuario, listarUsuarios } from "@/server/modulos/usuarios";

export const GET = rota({}, async (ctx) => json(await listarUsuarios(ctx)));

export const POST = rota({ modulo: "Configurações", nivel: "editar" }, async (ctx) =>
  json(await criarUsuario(ctx, await lerJson(ctx.req, esquemaCriarUsuario)), 201),
);
