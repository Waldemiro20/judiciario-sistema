import { json, rota } from "@/server/http/rota";
import { idDe, lerJson } from "@/server/http/corpo";
import { atualizarUsuario, esquemaAtualizarUsuario } from "@/server/modulos/usuarios";

type P = { id: string };

export const PATCH = rota<P>({ modulo: "Configurações", nivel: "editar" }, async (ctx, p) =>
  json(await atualizarUsuario(ctx, idDe(p), await lerJson(ctx.req, esquemaAtualizarUsuario))),
);
