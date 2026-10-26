import { z } from "zod";
import { AREAS, POLOS, RISCOS, STATUS_PROCESSO, type Processo } from "@/lib/data";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { erro } from "../http/erros";
import { processoVisivel } from "../authz/acesso";
import type { Contexto } from "../http/rota";
import type { Paginacao } from "../http/corpo";
import { dataEHora, numero } from "../formato";
import { dinheiro, texto, textoObrigatorio, versao } from "../validacao";
import {
  criarIdempotente,
  garantirAtualizado,
  idCliente,
  idsUsuarios,
  idUsuario,
  pagina,
  pular,
} from "./comum";

const parte = z.object({ nome: textoObrigatorio(200), polo: z.enum(POLOS) }).strip();
const movimentacao = z.object({ id: z.string().max(64), acao: textoObrigatorio(1000) }).strip();

const campos = {
  numero: textoObrigatorio(40).refine(
    (s) => /^[0-9.\-/ ]+$/.test(s),
    "Número de processo inválido.",
  ),
  titulo: textoObrigatorio(200),
  cliente: textoObrigatorio(200),
  area: z.enum(AREAS),
  status: z.enum(STATUS_PROCESSO),
  vara: texto(200),
  tribunal: texto(200),
  juiz: texto(200),
  parteContraria: texto(200),
  partes: z.array(parte).max(50),
  valorCausa: dinheiro,
  fase: texto(200),
  responsavel: textoObrigatorio(200),
  equipe: z.array(textoObrigatorio(200)).max(50),
  risco: z.enum(RISCOS),
  distribuicao: texto(10).refine(
    (s) => s === "" || /^\d{2}\/\d{2}\/\d{4}$/.test(s),
    "Use DD/MM/AAAA.",
  ),
  sigiloso: z.boolean(),
};

export const esquemaCriarProcesso = z
  .object(campos)
  .partial({
    vara: true,
    tribunal: true,
    juiz: true,
    parteContraria: true,
    partes: true,
    valorCausa: true,
    fase: true,
    equipe: true,
    distribuicao: true,
    sigiloso: true,
  })
  .strip();

export const esquemaAtualizarProcesso = z
  .object({ ...campos, movimentacoes: z.array(movimentacao).max(2000) })
  .partial()
  .extend({ versao })
  .strip();

export const esquemaListarProcessos = z
  .object({
    status: z.enum(STATUS_PROCESSO).optional(),
    ordem: z.enum(["recentes", "numero", "atualizacao"]).default("recentes"),
  })
  .strip();

const incluir = {
  cliente: { select: { nome: true } },
  responsavel: { select: { nome: true } },
  equipe: { select: { usuario: { select: { nome: true } } } },
  movimentacoes: { orderBy: { criadoEm: "asc" } },
} satisfies Prisma.ProcessoInclude;

type Linha = Prisma.ProcessoGetPayload<{ include: typeof incluir }>;

function paraFront(p: Linha): Processo {
  return {
    id: p.id,
    numero: p.numero,
    titulo: p.titulo,
    cliente: p.cliente.nome,
    area: p.area as Processo["area"],
    status: p.status as Processo["status"],
    vara: p.vara,
    tribunal: p.tribunal,
    juiz: p.juiz,
    parteContraria: p.parteContraria,
    partes: z.array(parte).catch([]).parse(p.partes),
    valorCausa: numero(p.valorCausa) ?? 0,
    fase: p.fase,
    responsavel: p.responsavel.nome,
    equipe: p.equipe.map((e) => e.usuario.nome),
    risco: p.risco as Processo["risco"],
    distribuicao: p.distribuicao,
    sigiloso: p.sigiloso,
    versao: p.versao,
    movimentacoes: p.movimentacoes.map((m) => ({
      id: m.id,
      autor: m.autorNome,
      acao: m.acao,
      ...dataEHora(m.criadoEm),
    })),
  };
}

const ORDEM: Record<
  z.infer<typeof esquemaListarProcessos>["ordem"],
  Prisma.ProcessoOrderByWithRelationInput[]
> = {
  recentes: [{ criadoEm: "desc" }, { id: "asc" }],
  numero: [{ numero: "asc" }],
  atualizacao: [{ atualizadoEm: "desc" }, { id: "asc" }],
};

export async function listarProcessos(
  ctx: Contexto,
  p: Paginacao,
  f: z.infer<typeof esquemaListarProcessos>,
) {
  const where: Prisma.ProcessoWhereInput = {
    ...processoVisivel(ctx.usuario),
    ...(f.status && { status: f.status }),
  };
  const [linhas, total] = await Promise.all([
    db().processo.findMany({ where, include: incluir, orderBy: ORDEM[f.ordem], ...pular(p) }),
    db().processo.count({ where }),
  ]);
  return pagina(linhas.map(paraFront), total, p);
}

export async function obterProcesso(ctx: Contexto, id: string) {
  const p = await db().processo.findFirst({
    where: { id, ...processoVisivel(ctx.usuario) },
    include: incluir,
  });
  if (!p) throw erro.naoEncontrado();
  if (p.sigiloso)
    await ctx.auditar({
      acao: "Visualizou",
      modulo: "Processos",
      descricao: `Acessou o processo sigiloso ${p.numero}`,
      recursoTipo: "Processo",
      recursoId: p.id,
    });
  return paraFront(p);
}

export async function criarProcesso(ctx: Contexto, d: z.infer<typeof esquemaCriarProcesso>) {
  const { id, repetido } = await criarIdempotente(ctx, "processo", async (tx) => {
    const clienteId = await idCliente(tx, ctx, d.cliente);
    const responsavelId = await idUsuario(tx, ctx, d.responsavel);
    const equipe = new Set(await idsUsuarios(tx, ctx, d.equipe ?? []));
    if (d.sigiloso && responsavelId !== ctx.usuario.id) equipe.add(ctx.usuario.id);
    equipe.delete(responsavelId);
    const p = await tx.processo.create({
      data: {
        escritorioId: ctx.usuario.escritorioId,
        numero: d.numero,
        titulo: d.titulo,
        clienteId,
        area: d.area,
        status: d.status,
        vara: d.vara ?? "",
        tribunal: d.tribunal ?? "",
        juiz: d.juiz ?? "",
        parteContraria: d.parteContraria ?? "",
        partes: d.partes ?? [],
        valorCausa: d.valorCausa ?? 0,
        fase: d.fase ?? "",
        responsavelId,
        risco: d.risco,
        distribuicao: d.distribuicao ?? "",
        sigiloso: d.sigiloso ?? false,
        equipe: { create: [...equipe].map((usuarioId) => ({ usuarioId })) },
        movimentacoes: {
          create: {
            autorId: ctx.usuario.id,
            autorNome: ctx.usuario.nome,
            acao: "cadastrou o processo no sistema",
          },
        },
      },
    });
    await ctx.auditarTx(tx, {
      acao: "Criou",
      modulo: "Processos",
      descricao: `Cadastrou o processo ${p.numero}${p.sigiloso ? " (sigiloso)" : ""}`,
      recursoTipo: "Processo",
      recursoId: p.id,
    });
    return p.id;
  });
  return { processo: await obterSemAuditoria(ctx, id), repetido };
}

async function obterSemAuditoria(ctx: Contexto, id: string) {
  const p = await db().processo.findFirst({
    where: { id, ...processoVisivel(ctx.usuario) },
    include: incluir,
  });
  if (!p) throw erro.naoEncontrado();
  return paraFront(p);
}

export async function atualizarProcesso(
  ctx: Contexto,
  id: string,
  d: z.infer<typeof esquemaAtualizarProcesso>,
) {
  await db().$transaction(async (tx) => {
    const atual = await tx.processo.findFirst({
      where: { id, ...processoVisivel(ctx.usuario) },
      select: {
        id: true,
        numero: true,
        sigiloso: true,
        responsavelId: true,
        responsavel: { select: { nome: true } },
        equipe: { select: { usuario: { select: { nome: true } } } },
        movimentacoes: { select: { id: true } },
      },
    });
    if (!atual) throw erro.naoEncontrado();
    const mudaSigilo = d.sigiloso !== undefined && d.sigiloso !== atual.sigiloso;
    const equipeAtual = new Set(atual.equipe.map((e) => e.usuario.nome));
    const novaEquipe =
      d.equipe && new Set(d.equipe.filter((n) => n !== (d.responsavel ?? atual.responsavel.nome)));
    const mudaAcesso =
      (d.responsavel !== undefined && d.responsavel !== atual.responsavel.nome) ||
      (novaEquipe !== undefined &&
        (novaEquipe.size !== equipeAtual.size || [...novaEquipe].some((n) => !equipeAtual.has(n))));
    if ((mudaSigilo || (atual.sigiloso && mudaAcesso)) && atual.responsavelId !== ctx.usuario.id)
      throw erro.proibido(
        "Só o responsável pode alterar o sigilo ou a equipe de um processo sigiloso.",
      );

    const responsavelId =
      d.responsavel !== undefined ? await idUsuario(tx, ctx, d.responsavel) : undefined;
    const r = await tx.processo.updateMany({
      where: { id, escritorioId: ctx.usuario.escritorioId, versao: d.versao },
      data: {
        ...(d.numero !== undefined && { numero: d.numero }),
        ...(d.titulo !== undefined && { titulo: d.titulo }),
        ...(d.cliente !== undefined && { clienteId: await idCliente(tx, ctx, d.cliente) }),
        ...(d.area !== undefined && { area: d.area }),
        ...(d.status !== undefined && { status: d.status }),
        ...(d.vara !== undefined && { vara: d.vara }),
        ...(d.tribunal !== undefined && { tribunal: d.tribunal }),
        ...(d.juiz !== undefined && { juiz: d.juiz }),
        ...(d.parteContraria !== undefined && { parteContraria: d.parteContraria }),
        ...(d.partes !== undefined && { partes: d.partes }),
        ...(d.valorCausa !== undefined && { valorCausa: d.valorCausa }),
        ...(d.fase !== undefined && { fase: d.fase }),
        ...(responsavelId !== undefined && { responsavelId }),
        ...(d.risco !== undefined && { risco: d.risco }),
        ...(d.distribuicao !== undefined && { distribuicao: d.distribuicao }),
        ...(d.sigiloso !== undefined && { sigiloso: d.sigiloso }),
        versao: { increment: 1 },
      },
    });
    await garantirAtualizado(r.count, async () => atual);

    if (d.equipe !== undefined) {
      const ids = new Set(await idsUsuarios(tx, ctx, d.equipe));
      ids.delete(responsavelId ?? atual.responsavelId);
      await tx.processoEquipe.deleteMany({ where: { processoId: id } });
      await tx.processoEquipe.createMany({
        data: [...ids].map((usuarioId) => ({ processoId: id, usuarioId })),
      });
    }

    const existentes = new Set(atual.movimentacoes.map((m) => m.id));
    const novas = (d.movimentacoes ?? []).filter((m) => !existentes.has(m.id));
    if (novas.length > 20) throw erro.validacao("Inclua no máximo 20 andamentos por vez.");
    if (novas.length)
      await tx.movimentacao.createMany({
        data: novas.map((m) => ({
          processoId: id,
          autorId: ctx.usuario.id,
          autorNome: ctx.usuario.nome,
          acao: m.acao,
        })),
      });

    const alterados = Object.keys(d).filter((k) => k !== "versao" && k !== "movimentacoes");
    await ctx.auditarTx(tx, {
      acao: "Editou",
      modulo: "Processos",
      descricao: `Atualizou o processo ${atual.numero}${alterados.length ? ` (${alterados.join(", ")})` : ""}${novas.length ? ` e incluiu ${novas.length} andamento(s)` : ""}`,
      recursoTipo: "Processo",
      recursoId: id,
    });
  });
  return obterSemAuditoria(ctx, id);
}
