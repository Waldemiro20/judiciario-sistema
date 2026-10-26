import { json, rota } from "@/server/http/rota";
import { idDe } from "@/server/http/corpo";
import { restaurarVersao } from "@/server/modulos/documentos";

type P = { id: string; versaoId: string };

export const POST = rota<P>({ modulo: "Documentos", nivel: "editar" }, async (ctx, p) =>
  json(await restaurarVersao(ctx, idDe(p), idDe({ id: p.versaoId }))),
);
