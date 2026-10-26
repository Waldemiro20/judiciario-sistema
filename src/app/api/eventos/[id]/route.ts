import { json, rota, semConteudo } from "@/server/http/rota";
import { idDe, lerJson } from "@/server/http/corpo";
import {
  esquemaSubstituirEvento,
  excluirEvento,
  exigirAgendaOuAudiencias,
  obterEvento,
  substituirEvento,
} from "@/server/modulos/eventos";

type P = { id: string };

export const GET = rota<P>({}, async (ctx, p) => {
  exigirAgendaOuAudiencias(ctx);
  return json(await obterEvento(ctx, idDe(p)));
});

export const PUT = rota<P>({}, async (ctx, p) =>
  json(await substituirEvento(ctx, idDe(p), await lerJson(ctx.req, esquemaSubstituirEvento))),
);

export const DELETE = rota<P>({}, async (ctx, p) => {
  await excluirEvento(ctx, idDe(p));
  return semConteudo();
});
