import { json, rota } from "@/server/http/rota";
import { idDe, lerJson } from "@/server/http/corpo";
import { esquemaSubstituirModelo, substituirModelo } from "@/server/modulos/contratos";

type P = { id: string };

export const PUT = rota<P>({ modulo: "Contratos e Peças", nivel: "editar" }, async (ctx, p) =>
  json(await substituirModelo(ctx, idDe(p), await lerJson(ctx.req, esquemaSubstituirModelo))),
);
