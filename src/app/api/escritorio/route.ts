import { json, rota } from "@/server/http/rota";
import { lerJson } from "@/server/http/corpo";
import { atualizarEscritorio, esquemaEscritorio } from "@/server/modulos/conta";

export const PATCH = rota({ modulo: "Configurações", nivel: "editar" }, async (ctx) =>
  json(await atualizarEscritorio(ctx, await lerJson(ctx.req, esquemaEscritorio))),
);
