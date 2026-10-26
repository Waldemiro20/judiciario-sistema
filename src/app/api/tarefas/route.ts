import { json, rota } from "@/server/http/rota";
import { lerBusca, lerJson, paginacao } from "@/server/http/corpo";
import { criarTarefa, esquemaCriarTarefa, listarTarefas } from "@/server/modulos/tarefas";

export const GET = rota({ modulo: "Tarefas" }, async (ctx) =>
  json(await listarTarefas(ctx, lerBusca(ctx.req, paginacao))),
);

export const POST = rota({ modulo: "Tarefas", nivel: "editar" }, async (ctx) => {
  const { tarefa, repetido } = await criarTarefa(ctx, await lerJson(ctx.req, esquemaCriarTarefa));
  return json(tarefa, repetido ? 200 : 201);
});
