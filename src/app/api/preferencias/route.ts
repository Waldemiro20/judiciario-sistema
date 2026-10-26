import { json, rota } from "@/server/http/rota";
import { lerJson } from "@/server/http/corpo";
import { atualizarPreferencias, esquemaPreferencias } from "@/server/modulos/conta";

export const PATCH = rota({}, async (ctx) =>
  json(await atualizarPreferencias(ctx, await lerJson(ctx.req, esquemaPreferencias, 16 * 1024))),
);
