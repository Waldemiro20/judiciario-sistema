import { json, rota } from "@/server/http/rota";
import { lerBusca, lerJson, paginacao } from "@/server/http/corpo";
import {
  criarProcesso,
  esquemaCriarProcesso,
  esquemaListarProcessos,
  listarProcessos,
} from "@/server/modulos/processos";

export const GET = rota({ modulo: "Processos" }, async (ctx) => {
  const busca = lerBusca(ctx.req, paginacao.extend(esquemaListarProcessos.shape).strict());
  return json(await listarProcessos(ctx, busca, busca));
});

export const POST = rota({ modulo: "Processos", nivel: "editar" }, async (ctx) => {
  const { processo, repetido } = await criarProcesso(
    ctx,
    await lerJson(ctx.req, esquemaCriarProcesso),
  );
  return json(processo, repetido ? 200 : 201);
});
