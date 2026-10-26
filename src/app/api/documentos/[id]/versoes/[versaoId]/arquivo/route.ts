import { rota } from "@/server/http/rota";
import { idDe } from "@/server/http/corpo";
import { respostaArquivo } from "@/server/storage/arquivos";
import { baixarVersao } from "@/server/modulos/documentos";

type P = { id: string; versaoId: string };

export const GET = rota<P>({ modulo: "Documentos" }, async (ctx, p) => {
  const a = await baixarVersao(ctx, idDe(p), idDe({ id: p.versaoId }));
  return respostaArquivo(a.nome, a.mime, a.dados);
});
