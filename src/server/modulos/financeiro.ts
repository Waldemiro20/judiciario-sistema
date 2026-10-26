import { z } from "zod";
import {
  CLIENTE_INTERNO,
  MODELOS_COBRANCA,
  SITUACOES_LANCAMENTO,
  TIPOS_LANCAMENTO,
  type Lancamento,
} from "@/lib/data";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { erro } from "../http/erros";
import { processoOpcionalVisivel } from "../authz/acesso";
import type { Contexto } from "../http/rota";
import type { Paginacao } from "../http/corpo";
import { dataDeIso, isoDeData, numero } from "../formato";
import { dataIso, dinheiro, texto, textoObrigatorio, versao } from "../validacao";
import {
  criarIdempotente,
  garantirAtualizado,
  idClienteOuInterno,
  idProcessoOpcional,
  pagina,
  pular,
} from "./comum";

const lancamento = z
  .object({
    descricao: textoObrigatorio(300),
    cliente: textoObrigatorio(200),
    processo: texto(40).optional(),
    tipo: z.enum(TIPOS_LANCAMENTO),
    categoria: textoObrigatorio(60),
    modelo: z.enum(MODELOS_COBRANCA),
    valor: dinheiro.refine((v) => v > 0, "O valor precisa ser maior que zero."),
    vencimento: dataIso,
    parcela: texto(10)
      .refine((s) => s === "" || /^\d{1,3}\/\d{1,3}$/.test(s), "Use o formato 2/12.")
      .optional(),
    situacao: z.enum(SITUACOES_LANCAMENTO),
    valorRecebido: dinheiro.optional(),
  })
  .strip()
  .refine((l) => l.valorRecebido === undefined || l.valorRecebido <= l.valor, {
    message: "O valor recebido não pode passar do valor do lançamento.",
    path: ["valorRecebido"],
  });

export const esquemaCriarLancamento = lancamento;
export const esquemaCriarLancamentos = z
  .object({ lancamentos: z.array(lancamento).min(1).max(120) })
  .strict();
export const esquemaSubstituirLancamento = lancamento.and(z.object({ versao }));

const incluir = {
  cliente: { select: { nome: true } },
  processo: { select: { numero: true } },
} satisfies Prisma.LancamentoInclude;

type Linha = Prisma.LancamentoGetPayload<{ include: typeof incluir }>;

function paraFront(l: Linha): Lancamento {
  const recebido = numero(l.valorRecebido);
  return {
    id: l.id,
    descricao: l.descricao,
    cliente: l.cliente?.nome ?? CLIENTE_INTERNO,
    clienteId: l.clienteId ?? undefined,
    ...(l.processo && { processo: l.processo.numero }),
    tipo: l.tipo as Lancamento["tipo"],
    categoria: l.categoria,
    modelo: l.modelo as Lancamento["modelo"],
    valor: numero(l.valor) ?? 0,
    vencimento: isoDeData(l.vencimento),
    ...(l.parcela && { parcela: l.parcela }),
    situacao: l.situacao as Lancamento["situacao"],
    ...(recebido !== undefined && { valorRecebido: recebido }),
    versao: l.versao,
  };
}

const visivel = (ctx: Contexto): Prisma.LancamentoWhereInput => ({
  escritorioId: ctx.usuario.escritorioId,
  excluidoEm: null,
  ...processoOpcionalVisivel(ctx.usuario),
});

export async function listarLancamentos(ctx: Contexto, p: Paginacao) {
  const where = visivel(ctx);
  const [linhas, total] = await Promise.all([
    db().lancamento.findMany({
      where,
      include: incluir,
      orderBy: [{ vencimento: "asc" }, { id: "asc" }],
      ...pular(p),
    }),
    db().lancamento.count({ where }),
  ]);
  return pagina(linhas.map(paraFront), total, p);
}

async function obter(ctx: Contexto, id: string) {
  const l = await db().lancamento.findFirst({ where: { id, ...visivel(ctx) }, include: incluir });
  if (!l) throw erro.naoEncontrado();
  return paraFront(l);
}

export async function criarLancamentos(ctx: Contexto, lista: z.infer<typeof lancamento>[]) {
  const { id: primeiro, repetido } = await criarIdempotente(ctx, "lancamento", async (tx) => {
    const ids: string[] = [];
    for (const d of lista) {
      const l = await tx.lancamento.create({
        data: {
          escritorioId: ctx.usuario.escritorioId,
          descricao: d.descricao,
          clienteId: await idClienteOuInterno(tx, ctx, d.cliente),
          processoId: await idProcessoOpcional(tx, ctx, d.processo || undefined),
          tipo: d.tipo,
          categoria: d.categoria,
          modelo: d.modelo,
          valor: d.valor,
          vencimento: dataDeIso(d.vencimento),
          parcela: d.parcela || null,
          situacao: d.situacao,
          valorRecebido: d.valorRecebido ?? null,
        },
      });
      ids.push(l.id);
    }
    await ctx.auditarTx(tx, {
      acao: "Criou",
      modulo: "Financeiro",
      descricao:
        lista.length === 1
          ? `Lançou "${lista[0]!.descricao}"`
          : `Lançou ${lista.length} parcelas de "${lista[0]!.descricao}"`,
      recursoTipo: "Lancamento",
      recursoId: ids.join(",").slice(0, 400),
    });
    return ids.join(",");
  });
  const ids = primeiro.split(",");
  const linhas = await db().lancamento.findMany({
    where: { id: { in: ids }, ...visivel(ctx) },
    include: incluir,
  });
  const ordem = new Map(ids.map((id, i) => [id, i]));
  return {
    lancamentos: linhas.map(paraFront).sort((a, b) => ordem.get(a.id)! - ordem.get(b.id)!),
    repetido,
  };
}

export async function substituirLancamento(
  ctx: Contexto,
  id: string,
  d: z.infer<typeof esquemaSubstituirLancamento>,
) {
  await db().$transaction(async (tx) => {
    const atual = await tx.lancamento.findFirst({
      where: { id, ...visivel(ctx) },
      select: { descricao: true, situacao: true },
    });
    if (!atual) throw erro.naoEncontrado();
    const r = await tx.lancamento.updateMany({
      where: { id, escritorioId: ctx.usuario.escritorioId, excluidoEm: null, versao: d.versao },
      data: {
        descricao: d.descricao,
        clienteId: await idClienteOuInterno(tx, ctx, d.cliente),
        processoId: await idProcessoOpcional(tx, ctx, d.processo || undefined),
        tipo: d.tipo,
        categoria: d.categoria,
        modelo: d.modelo,
        valor: d.valor,
        vencimento: dataDeIso(d.vencimento),
        parcela: d.parcela || null,
        situacao: d.situacao,
        valorRecebido: d.valorRecebido ?? null,
        versao: { increment: 1 },
      },
    });
    await garantirAtualizado(r.count, async () => atual);
    await ctx.auditarTx(tx, {
      acao: "Editou",
      modulo: "Financeiro",
      descricao: `Editou "${d.descricao}"${atual.situacao !== d.situacao ? ` (${atual.situacao} → ${d.situacao})` : ""}`,
      recursoTipo: "Lancamento",
      recursoId: id,
    });
  });
  return obter(ctx, id);
}

export async function excluirLancamento(ctx: Contexto, id: string) {
  const atual = await db().lancamento.findFirst({
    where: { id, ...visivel(ctx) },
    select: { descricao: true },
  });
  if (!atual) throw erro.naoEncontrado();
  await db().$transaction(async (tx) => {
    await tx.lancamento.update({ where: { id }, data: { excluidoEm: new Date() } });
    await ctx.auditarTx(tx, {
      acao: "Excluiu",
      modulo: "Financeiro",
      descricao: `Excluiu "${atual.descricao}"`,
      recursoTipo: "Lancamento",
      recursoId: id,
    });
  });
}
