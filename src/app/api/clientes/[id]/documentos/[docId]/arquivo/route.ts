import { rota, json } from "@/server/http/rota";
import { idDe } from "@/server/http/corpo";
import { lerUpload, respostaArquivo } from "@/server/storage/arquivos";
import { anexarDocPessoal, baixarDocPessoal } from "@/server/modulos/documentos";
import { obterCliente } from "@/server/modulos/clientes";

type P = { id: string; docId: string };

export const GET = rota<P>({ modulo: "Clientes" }, async (ctx, p) => {
  const a = await baixarDocPessoal(ctx, idDe(p), idDe({ id: p.docId }));
  return respostaArquivo(a.nome, a.mime, a.dados);
});

export const POST = rota<P>(
  { modulo: "Clientes", nivel: "editar", limitePorMinuto: 60 },
  async (ctx, p) => {
    const clienteId = idDe(p);
    const { arquivo } = await lerUpload(ctx.req);
    await anexarDocPessoal(ctx, clienteId, idDe({ id: p.docId }), arquivo);
    return json(await obterCliente(ctx, clienteId));
  },
);
