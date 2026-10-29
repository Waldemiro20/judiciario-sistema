import { json, rota, semConteudo } from "@/server/http/rota";
import { idDe, lerJson } from "@/server/http/corpo";
import {
  atualizarUsuario,
  esquemaAtualizarUsuario,
  excluirUsuario,
} from "@/server/modulos/usuarios";

type P = { id: string };

export const PATCH = rota<P>({ modulo: "Configurações", nivel: "editar" }, async (ctx, p) =>
  json(await atualizarUsuario(ctx, idDe(p), await lerJson(ctx.req, esquemaAtualizarUsuario))),
);

export const DELETE = rota<P>({ modulo: "Configurações", nivel: "editar" }, async (ctx, p) => {
  await excluirUsuario(ctx, idDe(p));
  return semConteudo();
});
