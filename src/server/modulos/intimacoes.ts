import { z } from "zod";
import type { Intimacao } from "@/lib/data";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "../db";
import { erro } from "../http/erros";
import { processoOpcionalVisivel, processoVisivel } from "../authz/acesso";
import type { Contexto } from "../http/rota";
import type { Paginacao } from "../http/corpo";
import { curtoAs } from "../formato";
import { textoObrigatorio, versao } from "../validacao";
import { criarIdempotente, garantirAtualizado, pagina, pular } from "./comum";

const intimacao = z
  .object({
    processo: textoObrigatorio(40).refine(
      (s) => /^[0-9.\-/ ]+$/.test(s),
      "Número de processo inválido.",
    ),
    resumo: textoObrigatorio(2000),
    prazoDias: z.number().int().min(0).max(365),
    lida: z.boolean(),
    concluida: z.boolean().optional(),
  })
  .strip();

export const esquemaCriarIntimacao = intimacao;
export const esquemaSubstituirIntimacao = intimacao.extend({ versao });

function paraFront(i: Prisma.IntimacaoGetPayload<object>): Intimacao {
  return {
    id: i.id,
    processo: i.processoNumero,
    resumo: i.resumo,
    recebida: curtoAs(i.recebidaEm),
    prazoDias: i.prazoDias,
    lida: i.lida,
    ...(i.concluida && { concluida: true }),
    versao: i.versao,
  };
}

const visivel = (ctx: Contexto): Prisma.IntimacaoWhereInput => ({
  escritorioId: ctx.usuario.escritorioId,
  excluidoEm: null,
  ...processoOpcionalVisivel(ctx.usuario),
});

async function vincularProcesso(tx: Tx, ctx: Contexto, numero: string) {
  const sigilosoInacessivel = await tx.processo.findFirst({
    where: { escritorioId: ctx.usuario.escritorioId, numero, NOT: processoVisivel(ctx.usuario) },
    select: { id: true },
  });
  if (sigilosoInacessivel)
    throw erro.validacao("Processo não encontrado.", [
      { campo: "processo", mensagem: "Processo não encontrado." },
    ]);
  const p = await tx.processo.findFirst({
    where: { ...processoVisivel(ctx.usuario), numero },
    select: { id: true },
  });
  return p?.id ?? null;
}

export async function listarIntimacoes(ctx: Contexto, p: Paginacao) {
  const where = visivel(ctx);
  const [linhas, total] = await Promise.all([
    db().intimacao.findMany({
      where,
      orderBy: [{ recebidaEm: "desc" }, { id: "asc" }],
      ...pular(p),
    }),
    db().intimacao.count({ where }),
  ]);
  return pagina(linhas.map(paraFront), total, p);
}

async function obter(ctx: Contexto, id: string) {
  const i = await db().intimacao.findFirst({ where: { id, ...visivel(ctx) } });
  if (!i) throw erro.naoEncontrado();
  return paraFront(i);
}

export async function criarIntimacao(ctx: Contexto, d: z.infer<typeof intimacao>) {
  const { id, repetido } = await criarIdempotente(ctx, "intimacao", async (tx) => {
    const i = await tx.intimacao.create({
      data: {
        escritorioId: ctx.usuario.escritorioId,
        processoNumero: d.processo,
        processoId: await vincularProcesso(tx, ctx, d.processo),
        resumo: d.resumo,
        prazoDias: d.prazoDias,
        lida: d.lida,
        concluida: d.concluida ?? false,
      },
    });
    await ctx.auditarTx(tx, {
      acao: "Criou",
      modulo: "Intimações",
      descricao: `Cadastrou intimação do processo ${i.processoNumero}`,
      recursoTipo: "Intimacao",
      recursoId: i.id,
    });
    return i.id;
  });
  return { intimacao: await obter(ctx, id), repetido };
}

export async function substituirIntimacao(
  ctx: Contexto,
  id: string,
  d: z.infer<typeof esquemaSubstituirIntimacao>,
) {
  await db().$transaction(async (tx) => {
    const atual = await tx.intimacao.findFirst({
      where: { id, ...visivel(ctx) },
      select: { id: true },
    });
    if (!atual) throw erro.naoEncontrado();
    const r = await tx.intimacao.updateMany({
      where: { id, escritorioId: ctx.usuario.escritorioId, excluidoEm: null, versao: d.versao },
      data: {
        processoNumero: d.processo,
        processoId: await vincularProcesso(tx, ctx, d.processo),
        resumo: d.resumo,
        prazoDias: d.prazoDias,
        lida: d.lida,
        concluida: d.concluida ?? false,
        versao: { increment: 1 },
      },
    });
    await garantirAtualizado(r.count, async () => atual);
    await ctx.auditarTx(tx, {
      acao: "Editou",
      modulo: "Intimações",
      descricao: `Editou a intimação do processo ${d.processo}`,
      recursoTipo: "Intimacao",
      recursoId: id,
    });
  });
  return obter(ctx, id);
}

export async function excluirIntimacao(ctx: Contexto, id: string) {
  const atual = await db().intimacao.findFirst({
    where: { id, ...visivel(ctx) },
    select: { processoNumero: true },
  });
  if (!atual) throw erro.naoEncontrado();
  await db().$transaction(async (tx) => {
    await tx.intimacao.update({ where: { id }, data: { excluidoEm: new Date() } });
    await ctx.auditarTx(tx, {
      acao: "Excluiu",
      modulo: "Intimações",
      descricao: `Excluiu a intimação do processo ${atual.processoNumero}`,
      recursoTipo: "Intimacao",
      recursoId: id,
    });
  });
}
