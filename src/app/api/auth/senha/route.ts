import { json, rota } from "@/server/http/rota";
import { lerJson } from "@/server/http/corpo";
import { cookieSessao } from "@/server/auth/sessao";
import { dadosSessao } from "@/server/modulos/conta";
import { esquemaTrocaSenha, trocarSenha } from "@/server/modulos/auth";

export const POST = rota({ permitirSenhaExpirada: true, limitePorMinuto: 20 }, async (ctx) => {
  const { token, usuario } = await trocarSenha(
    ctx,
    await lerJson(ctx.req, esquemaTrocaSenha, 4096),
  );
  const res = json(await dadosSessao(usuario));
  res.headers.append("Set-Cookie", cookieSessao(token));
  return res;
});
