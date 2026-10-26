import { json, rota } from "@/server/http/rota";
import { idDe, lerJson } from "@/server/http/corpo";
import { esquemaSubstituirContrato, substituirContrato } from "@/server/modulos/contratos";

type P = { id: string };

export const PUT = rota<P>({ modulo: "Contratos e Peças", nivel: "editar" }, async (ctx, p) =>
  json(await substituirContrato(ctx, idDe(p), await lerJson(ctx.req, esquemaSubstituirContrato))),
);
