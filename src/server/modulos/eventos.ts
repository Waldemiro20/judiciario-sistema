import { z } from "zod";
import { RECORRENCIAS, TIPOS_EVENTO, type Evento, type Modulo } from "@/lib/data";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "../db";
import { erro } from "../http/erros";
import { processoOpcionalVisivel } from "../authz/acesso";
import { permite } from "../authz/permissoes";
import type { Contexto } from "../http/rota";
import type { Paginacao } from "../http/corpo";
import { dataDeIso, isoDeData } from "../formato";
import { dataIso, hora, texto, textoLongo, textoObrigatorio, urlHttp, versao } from "../validacao";
import {
  criarIdempotente,
  garantirAtualizado,
  idProcessoOpcional,
  idUsuario,
  pagina,
  pular,
} from "./comum";

const campos = {
  titulo: textoObrigatorio(200),
  tipo: z.enum(TIPOS_EVENTO),
  data: dataIso,
  hora,
  duracaoMin: z.number().int().min(5).max(1440),
  advogado: textoObrigatorio(200),
  local: texto(300),
  linkOnline: urlHttp.optional(),
  juiz: texto(200).optional(),
  processo: texto(40).optional(),
  cliente: texto(200).optional(),
  testemunhas: z.array(textoObrigatorio(200)).max(30).optional(),
  lembretes: z.array(textoObrigatorio(40)).max(10),
  recorrencia: z.enum(RECORRENCIAS),
  observacoes: textoLongo(5000).optional(),
};

export const esquemaCriarEvento = z.object(campos).strip();
export const esquemaSubstituirEvento = z.object(campos).extend({ versao }).strip();

const incluir = {
  advogado: { select: { nome: true } },
  processo: { select: { numero: true } },
} satisfies Prisma.EventoInclude;

type Linha = Prisma.EventoGetPayload<{ include: typeof incluir }>;

const moduloDoTipo = (tipo: string): Modulo => (tipo === "Audiência" ? "Audiências" : "Agenda");

function tiposPermitidos(ctx: Contexto, nivel: "ver" | "editar") {
  return TIPOS_EVENTO.filter((t) => permite(ctx.permissoes, moduloDoTipo(t), nivel));
}

function exigirTipo(ctx: Contexto, tipo: string, nivel: "ver" | "editar") {
  if (!permite(ctx.permissoes, moduloDoTipo(tipo), nivel)) throw erro.proibido();
}

function paraFront(e: Linha): Evento {
  return {
    id: e.id,
    titulo: e.titulo,
    tipo: e.tipo as Evento["tipo"],
    data: isoDeData(e.data),
    hora: e.hora,
    duracaoMin: e.duracaoMin,
    advogado: e.advogado.nome,
    local: e.local,
    ...(e.linkOnline && { linkOnline: e.linkOnline }),
    ...(e.juiz && { juiz: e.juiz }),
    ...(e.processo && { processo: e.processo.numero }),
    ...(e.clienteNome && { cliente: e.clienteNome }),
    ...(e.testemunhas.length > 0 && { testemunhas: e.testemunhas }),
    lembretes: e.lembretes,
    recorrencia: e.recorrencia as Evento["recorrencia"],
    ...(e.observacoes && { observacoes: e.observacoes }),
    versao: e.versao,
  };
}

const visivel = (ctx: Contexto, nivel: "ver" | "editar" = "ver"): Prisma.EventoWhereInput => ({
  escritorioId: ctx.usuario.escritorioId,
  excluidoEm: null,
  tipo: { in: tiposPermitidos(ctx, nivel) },
  ...processoOpcionalVisivel(ctx.usuario),
});

async function clienteId(tx: Tx, ctx: Contexto, nome: string | undefined) {
  if (!nome) return null;
  const c = await tx.cliente.findFirst({
    where: { escritorioId: ctx.usuario.escritorioId, nome, excluidoEm: null },
    select: { id: true },
  });
  return c?.id ?? null;
}

export async function listarEventos(ctx: Contexto, p: Paginacao) {
  const where = visivel(ctx);
  const [linhas, total] = await Promise.all([
    db().evento.findMany({
      where,
      include: incluir,
      orderBy: [{ data: "asc" }, { hora: "asc" }, { id: "asc" }],
      ...pular(p),
    }),
    db().evento.count({ where }),
  ]);
  return pagina(linhas.map(paraFront), total, p);
}

export async function obterEvento(ctx: Contexto, id: string) {
  const e = await db().evento.findFirst({ where: { id, ...visivel(ctx) }, include: incluir });
  if (!e) throw erro.naoEncontrado();
  return paraFront(e);
}

export async function criarEvento(ctx: Contexto, d: z.infer<typeof esquemaCriarEvento>) {
  exigirTipo(ctx, d.tipo, "editar");
  const { id, repetido } = await criarIdempotente(ctx, "evento", async (tx) => {
    const e = await tx.evento.create({
      data: {
        escritorioId: ctx.usuario.escritorioId,
        titulo: d.titulo,
        tipo: d.tipo,
        data: dataDeIso(d.data),
        hora: d.hora,
        duracaoMin: d.duracaoMin,
        advogadoId: await idUsuario(tx, ctx, d.advogado, "advogado"),
        local: d.local,
        linkOnline: d.linkOnline ?? null,
        juiz: d.juiz || null,
        processoId: await idProcessoOpcional(tx, ctx, d.processo || undefined),
        clienteId: await clienteId(tx, ctx, d.cliente),
        clienteNome: d.cliente || null,
        testemunhas: d.testemunhas ?? [],
        lembretes: d.lembretes,
        recorrencia: d.recorrencia,
        observacoes: d.observacoes || null,
      },
    });
    await ctx.auditarTx(tx, {
      acao: "Criou",
      modulo: moduloDoTipo(e.tipo),
      descricao: `Criou ${e.tipo.toLowerCase()} "${e.titulo}"`,
      recursoTipo: "Evento",
      recursoId: e.id,
    });
    return e.id;
  });
  return { evento: await obterEvento(ctx, id), repetido };
}

export async function substituirEvento(
  ctx: Contexto,
  id: string,
  d: z.infer<typeof esquemaSubstituirEvento>,
) {
  await db().$transaction(async (tx) => {
    const atual = await tx.evento.findFirst({
      where: { id, ...visivel(ctx, "editar") },
      select: { titulo: true, tipo: true },
    });
    if (!atual) {
      if (await tx.evento.findFirst({ where: { id, ...visivel(ctx) }, select: { id: true } }))
        throw erro.proibido();
      throw erro.naoEncontrado();
    }
    exigirTipo(ctx, d.tipo, "editar");
    const r = await tx.evento.updateMany({
      where: { id, escritorioId: ctx.usuario.escritorioId, excluidoEm: null, versao: d.versao },
      data: {
        titulo: d.titulo,
        tipo: d.tipo,
        data: dataDeIso(d.data),
        hora: d.hora,
        duracaoMin: d.duracaoMin,
        advogadoId: await idUsuario(tx, ctx, d.advogado, "advogado"),
        local: d.local,
        linkOnline: d.linkOnline ?? null,
        juiz: d.juiz || null,
        processoId: await idProcessoOpcional(tx, ctx, d.processo || undefined),
        clienteId: await clienteId(tx, ctx, d.cliente),
        clienteNome: d.cliente || null,
        testemunhas: d.testemunhas ?? [],
        lembretes: d.lembretes,
        recorrencia: d.recorrencia,
        observacoes: d.observacoes || null,
        versao: { increment: 1 },
      },
    });
    await garantirAtualizado(r.count, async () => atual);
    await ctx.auditarTx(tx, {
      acao: "Editou",
      modulo: moduloDoTipo(d.tipo),
      descricao: `Editou ${d.tipo.toLowerCase()} "${d.titulo}"`,
      recursoTipo: "Evento",
      recursoId: id,
    });
  });
  return obterEvento(ctx, id);
}

export async function excluirEvento(ctx: Contexto, id: string) {
  const atual = await db().evento.findFirst({
    where: { id, ...visivel(ctx) },
    select: { titulo: true, tipo: true },
  });
  if (!atual) throw erro.naoEncontrado();
  exigirTipo(ctx, atual.tipo, "editar");
  await db().$transaction(async (tx) => {
    await tx.evento.update({ where: { id }, data: { excluidoEm: new Date() } });
    await ctx.auditarTx(tx, {
      acao: "Excluiu",
      modulo: moduloDoTipo(atual.tipo),
      descricao: `Excluiu ${atual.tipo.toLowerCase()} "${atual.titulo}"`,
      recursoTipo: "Evento",
      recursoId: id,
    });
  });
}

export function exigirAgendaOuAudiencias(ctx: Contexto) {
  if (tiposPermitidos(ctx, "ver").length === 0) throw erro.proibido();
}
