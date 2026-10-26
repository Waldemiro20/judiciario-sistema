import { json, rota } from "@/server/http/rota";
import { idDe, lerJson } from "@/server/http/corpo";
import {
  atualizarProcesso,
  esquemaAtualizarProcesso,
  obterProcesso,
} from "@/server/modulos/processos";

type P = { id: string };

export const GET = rota<P>({ modulo: "Processos" }, async (ctx, p) =>
  json(await obterProcesso(ctx, idDe(p))),
);

export const PATCH = rota<P>({ modulo: "Processos", nivel: "editar" }, async (ctx, p) =>
  json(await atualizarProcesso(ctx, idDe(p), await lerJson(ctx.req, esquemaAtualizarProcesso))),
);
