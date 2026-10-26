import { rota, semConteudo } from "@/server/http/rota";
import { cookieExpirado } from "@/server/auth/sessao";
import { logout } from "@/server/modulos/auth";

export const POST = rota({ permitirSenhaExpirada: true }, async (ctx) => {
  await logout(ctx);
  const res = semConteudo();
  res.headers.append("Set-Cookie", cookieExpirado());
  return res;
});
