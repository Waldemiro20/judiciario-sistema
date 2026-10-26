import { json, rota, semConteudo } from "@/server/http/rota";
import { idDe, lerJson } from "@/server/http/corpo";
import {
  atualizarTarefa,
  esquemaAtualizarTarefa,
  excluirTarefa,
  obterTarefa,
} from "@/server/modulos/tarefas";

type P = { id: string };

export const GET = rota<P>({ modulo: "Tarefas" }, async (ctx, p) =>
  json(await obterTarefa(ctx, idDe(p))),
);

export const PATCH = rota<P>({ modulo: "Tarefas", nivel: "editar" }, async (ctx, p) =>
  json(await atualizarTarefa(ctx, idDe(p), await lerJson(ctx.req, esquemaAtualizarTarefa))),
);

export const DELETE = rota<P>({ modulo: "Tarefas", nivel: "editar" }, async (ctx, p) => {
  await excluirTarefa(ctx, idDe(p));
  return semConteudo();
});
