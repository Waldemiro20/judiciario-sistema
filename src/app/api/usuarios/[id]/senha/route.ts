import { json, rota } from "@/server/http/rota";
import { idDe } from "@/server/http/corpo";
import { redefinirSenha } from "@/server/modulos/usuarios";

type P = { id: string };

export const POST = rota<P>(
  { modulo: "Configurações", nivel: "editar", limitePorMinuto: 20 },
  async (ctx, p) => json(await redefinirSenha(ctx, idDe(p))),
);
