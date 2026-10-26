import { json, rota } from "@/server/http/rota";
import { dadosSessao } from "@/server/modulos/conta";

export const GET = rota({ permitirSenhaExpirada: true }, async (ctx) =>
  json(await dadosSessao(ctx.usuario, ctx.permissoes)),
);
