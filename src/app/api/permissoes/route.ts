import { json, rota } from "@/server/http/rota";
import { lerJson } from "@/server/http/corpo";
import { alterarPermissao, esquemaPermissao, matrizPermissoes } from "@/server/modulos/conta";

export const GET = rota({ modulo: "Configurações" }, async (ctx) =>
  json(await matrizPermissoes(ctx.usuario.escritorioId)),
);

export const PUT = rota({ modulo: "Configurações", nivel: "editar" }, async (ctx) =>
  json(await alterarPermissao(ctx, await lerJson(ctx.req, esquemaPermissao))),
);
