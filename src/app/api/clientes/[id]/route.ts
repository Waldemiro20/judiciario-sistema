import { json, rota, semConteudo } from "@/server/http/rota";
import { idDe, lerJson } from "@/server/http/corpo";
import {
  atualizarCliente,
  esquemaAtualizarCliente,
  excluirCliente,
  obterCliente,
} from "@/server/modulos/clientes";

type P = { id: string };

export const GET = rota<P>({ modulo: "Clientes" }, async (ctx, p) =>
  json(await obterCliente(ctx, idDe(p))),
);

export const PATCH = rota<P>({ modulo: "Clientes", nivel: "editar" }, async (ctx, p) =>
  json(await atualizarCliente(ctx, idDe(p), await lerJson(ctx.req, esquemaAtualizarCliente))),
);

export const DELETE = rota<P>({ modulo: "Clientes", nivel: "editar" }, async (ctx, p) => {
  await excluirCliente(ctx, idDe(p));
  return semConteudo();
});
