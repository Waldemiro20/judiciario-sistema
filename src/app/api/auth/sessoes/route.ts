import { rota, semConteudo } from "@/server/http/rota";
import { encerrarOutrasSessoes } from "@/server/modulos/auth";

export const DELETE = rota({ permitirSenhaExpirada: true }, async (ctx) => {
  await encerrarOutrasSessoes(ctx);
  return semConteudo();
});
