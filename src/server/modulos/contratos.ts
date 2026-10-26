import { z } from "zod";
import { ASSINATURAS, CATEGORIAS_MODELO, type Contrato, type Modelo } from "@/lib/data";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { erro } from "../http/erros";
import type { Contexto } from "../http/rota";
import type { Paginacao } from "../http/corpo";
import { dataDeIso, dataHora, isoDeData, numero } from "../formato";
import { dataIso, dinheiro, texto, textoLongo, textoObrigatorio, versao } from "../validacao";
import { criarIdempotente, garantirAtualizado, idCliente, pagina, pular } from "./comum";

const contrato = z
  .object({
    titulo: textoObrigatorio(200),
    cliente: textoObrigatorio(200),
    inicio: dataIso,
    fim: dataIso,
    valor: dinheiro,
    assinatura: z.enum(ASSINATURAS),
    provedor: texto(60).optional(),
  })
  .strip()
  .refine((c) => c.fim >= c.inicio, {
    message: "O fim precisa ser depois do início.",
    path: ["fim"],
  });

export const esquemaCriarContrato = contrato;
export const esquemaSubstituirContrato = contrato.and(z.object({ versao }));

const modelo = z
  .object({
    nome: textoObrigatorio(200),
    categoria: z.enum(CATEGORIAS_MODELO),
    tags: z.array(textoObrigatorio(40)).max(20),
    corpo: textoLongo(200_000),
  })
  .strip();

export const esquemaCriarModelo = modelo;
export const esquemaSubstituirModelo = modelo.extend({ versao });

const incluirContrato = { cliente: { select: { nome: true } } } satisfies Prisma.ContratoInclude;

function contratoParaFront(
  c: Prisma.ContratoGetPayload<{ include: typeof incluirContrato }>,
): Contrato {
  return {
    id: c.id,
    titulo: c.titulo,
    cliente: c.cliente.nome,
    inicio: isoDeData(c.inicio),
    fim: isoDeData(c.fim),
    valor: numero(c.valor) ?? 0,
    assinatura: c.assinatura as Contrato["assinatura"],
    ...(c.provedor && { provedor: c.provedor }),
    versao: c.versao,
  };
}

function modeloParaFront(m: Prisma.ModeloGetPayload<object>): Modelo {
  return {
    id: m.id,
    nome: m.nome,
    categoria: m.categoria as Modelo["categoria"],
    tags: m.tags,
    corpo: m.corpo,
    atualizado: dataHora(m.atualizadoEm).slice(0, 10),
    versao: m.versao,
  };
}

const doEscritorio = (ctx: Contexto) => ({ escritorioId: ctx.usuario.escritorioId });

export async function listarContratos(ctx: Contexto, p: Paginacao) {
  const where = doEscritorio(ctx);
  const [linhas, total] = await Promise.all([
    db().contrato.findMany({
      where,
      include: incluirContrato,
      orderBy: [{ fim: "asc" }, { id: "asc" }],
      ...pular(p),
    }),
    db().contrato.count({ where }),
  ]);
  return pagina(linhas.map(contratoParaFront), total, p);
}

async function obterContrato(ctx: Contexto, id: string) {
  const c = await db().contrato.findFirst({
    where: { id, ...doEscritorio(ctx) },
    include: incluirContrato,
  });
  if (!c) throw erro.naoEncontrado();
  return contratoParaFront(c);
}

export async function criarContrato(ctx: Contexto, d: z.infer<typeof contrato>) {
  const { id, repetido } = await criarIdempotente(ctx, "contrato", async (tx) => {
    const c = await tx.contrato.create({
      data: {
        ...doEscritorio(ctx),
        titulo: d.titulo,
        clienteId: await idCliente(tx, ctx, d.cliente),
        inicio: dataDeIso(d.inicio),
        fim: dataDeIso(d.fim),
        valor: d.valor,
        assinatura: d.assinatura,
        provedor: d.provedor || null,
      },
    });
    await ctx.auditarTx(tx, {
      acao: "Criou",
      modulo: "Contratos e Peças",
      descricao: `Criou o contrato "${c.titulo}"`,
      recursoTipo: "Contrato",
      recursoId: c.id,
    });
    return c.id;
  });
  return { contrato: await obterContrato(ctx, id), repetido };
}

export async function substituirContrato(
  ctx: Contexto,
  id: string,
  d: z.infer<typeof esquemaSubstituirContrato>,
) {
  await db().$transaction(async (tx) => {
    const atual = await tx.contrato.findFirst({
      where: { id, ...doEscritorio(ctx) },
      select: { assinatura: true },
    });
    if (!atual) throw erro.naoEncontrado();
    const r = await tx.contrato.updateMany({
      where: { id, ...doEscritorio(ctx), versao: d.versao },
      data: {
        titulo: d.titulo,
        clienteId: await idCliente(tx, ctx, d.cliente),
        inicio: dataDeIso(d.inicio),
        fim: dataDeIso(d.fim),
        valor: d.valor,
        assinatura: d.assinatura,
        provedor: d.provedor || null,
        versao: { increment: 1 },
      },
    });
    await garantirAtualizado(r.count, async () => atual);
    await ctx.auditarTx(tx, {
      acao: "Editou",
      modulo: "Contratos e Peças",
      descricao: `Editou o contrato "${d.titulo}"${atual.assinatura !== d.assinatura ? ` (${d.assinatura})` : ""}`,
      recursoTipo: "Contrato",
      recursoId: id,
    });
  });
  return obterContrato(ctx, id);
}

export async function listarModelos(ctx: Contexto, p: Paginacao) {
  const where = doEscritorio(ctx);
  const [linhas, total] = await Promise.all([
    db().modelo.findMany({ where, orderBy: [{ nome: "asc" }, { id: "asc" }], ...pular(p) }),
    db().modelo.count({ where }),
  ]);
  return pagina(linhas.map(modeloParaFront), total, p);
}

async function obterModelo(ctx: Contexto, id: string) {
  const m = await db().modelo.findFirst({ where: { id, ...doEscritorio(ctx) } });
  if (!m) throw erro.naoEncontrado();
  return modeloParaFront(m);
}

export async function criarModelo(ctx: Contexto, d: z.infer<typeof modelo>) {
  const { id, repetido } = await criarIdempotente(ctx, "modelo", async (tx) => {
    const m = await tx.modelo.create({
      data: {
        ...doEscritorio(ctx),
        nome: d.nome,
        categoria: d.categoria,
        tags: d.tags,
        corpo: d.corpo,
      },
    });
    await ctx.auditarTx(tx, {
      acao: "Criou",
      modulo: "Contratos e Peças",
      descricao: `Criou o modelo "${m.nome}"`,
      recursoTipo: "Modelo",
      recursoId: m.id,
    });
    return m.id;
  });
  return { modelo: await obterModelo(ctx, id), repetido };
}

export async function substituirModelo(
  ctx: Contexto,
  id: string,
  d: z.infer<typeof esquemaSubstituirModelo>,
) {
  await db().$transaction(async (tx) => {
    const r = await tx.modelo.updateMany({
      where: { id, ...doEscritorio(ctx), versao: d.versao },
      data: {
        nome: d.nome,
        categoria: d.categoria,
        tags: d.tags,
        corpo: d.corpo,
        versao: { increment: 1 },
      },
    });
    await garantirAtualizado(r.count, () =>
      tx.modelo.findFirst({ where: { id, ...doEscritorio(ctx) }, select: { id: true } }),
    );
    await ctx.auditarTx(tx, {
      acao: "Editou",
      modulo: "Contratos e Peças",
      descricao: `Editou o modelo "${d.nome}"`,
      recursoTipo: "Modelo",
      recursoId: id,
    });
  });
  return obterModelo(ctx, id);
}
