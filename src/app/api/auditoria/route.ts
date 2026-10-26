import { json, rota, semConteudo } from "@/server/http/rota";
import { lerBusca, lerJson, paginacao } from "@/server/http/corpo";
import {
  esquemaEventoCliente,
  esquemaListarAuditoria,
  listarAuditoria,
  registrarEventoCliente,
} from "@/server/modulos/usuarios";

export const GET = rota({ modulo: "Configurações" }, async (ctx) => {
  const busca = lerBusca(ctx.req, paginacao.extend(esquemaListarAuditoria.shape).strict());
  return json(await listarAuditoria(ctx, busca, busca));
});

export const POST = rota({ limitePorMinuto: 60 }, async (ctx) => {
  await registrarEventoCliente(ctx, await lerJson(ctx.req, esquemaEventoCliente, 4096));
  return semConteudo();
});
