import { json, rota } from "@/server/http/rota";
import { lerBusca, paginacao } from "@/server/http/corpo";
import { lerUpload } from "@/server/storage/arquivos";
import { enviarDocumento, listarDocumentos } from "@/server/modulos/documentos";

export const GET = rota({ modulo: "Documentos" }, async (ctx) =>
  json(await listarDocumentos(ctx, lerBusca(ctx.req, paginacao))),
);

export const POST = rota(
  { modulo: "Documentos", nivel: "editar", limitePorMinuto: 60 },
  async (ctx) => {
    const { arquivo, campos } = await lerUpload(ctx.req);
    return json(await enviarDocumento(ctx, arquivo, campos), 201);
  },
);
