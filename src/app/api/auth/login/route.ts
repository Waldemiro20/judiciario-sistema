import { json, rotaPublica } from "@/server/http/rota";
import { lerJson } from "@/server/http/corpo";
import { cookieSessao } from "@/server/auth/sessao";
import { dadosSessao } from "@/server/modulos/conta";
import { esquemaLogin, login } from "@/server/modulos/auth";

export const POST = rotaPublica({ limitePorMinuto: 30 }, async (ctx) => {
  const { token, usuario } = await login(ctx, await lerJson(ctx.req, esquemaLogin, 4096));
  const res = json(await dadosSessao(usuario));
  res.headers.append("Set-Cookie", cookieSessao(token));
  return res;
});
