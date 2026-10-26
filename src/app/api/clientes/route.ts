import { json, rota } from "@/server/http/rota";
import { lerBusca, lerJson, paginacao } from "@/server/http/corpo";
import { criarCliente, esquemaCriarCliente, listarClientes } from "@/server/modulos/clientes";

export const GET = rota({ modulo: "Clientes" }, async (ctx) =>
  json(await listarClientes(ctx, lerBusca(ctx.req, paginacao))),
);

export const POST = rota({ modulo: "Clientes", nivel: "editar" }, async (ctx) => {
  const { cliente, repetido } = await criarCliente(
    ctx,
    await lerJson(ctx.req, esquemaCriarCliente),
  );
  return json(cliente, repetido ? 200 : 201);
});
