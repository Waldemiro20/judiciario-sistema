import { z } from "zod";
import { COLUNAS, PRIORIDADES, VINCULOS, type Tarefa } from "@/lib/data";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "../db";
import { erro } from "../http/erros";
import { processoOpcionalVisivel } from "../authz/acesso";
import type { Contexto } from "../http/rota";
import type { Paginacao } from "../http/corpo";
import { curtoAs, dataDeIso, isoDeData } from "../formato";
import {
  dataIso,
  idCliente as idLivre,
  texto,
  textoLongo,
  textoObrigatorio,
  versao,
} from "../validacao";
import {
  criarIdempotente,
  garantirAtualizado,
  idCliente,
  idProcesso,
  idUsuario,
  pagina,
  pular,
} from "./comum";

const subtarefa = z
  .object({ id: idLivre, texto: textoObrigatorio(300), feita: z.boolean() })
  .strip();
const registroTexto = z.object({ id: idLivre, texto: textoObrigatorio(5000) }).strip();
const apontamento = z
  .object({ id: idLivre, minutos: z.number().int().min(1).max(1440), nota: texto(500) })
  .strip();

const registros = {
  comentarios: z.array(registroTexto).max(5000),
  historico: z.array(registroTexto).max(5000),
  apontamentos: z.array(apontamento).max(5000),
};

const campos = {
  titulo: textoObrigatorio(200),
  descricao: textoLongo(20_000),
  coluna: z.enum(COLUNAS),
  prioridade: z.enum(PRIORIDADES),
  responsavel: textoObrigatorio(200),
  vinculoTipo: z.enum(VINCULOS),
  vinculo: texto(200),
  prazo: dataIso,
  subtarefas: z.array(subtarefa).max(200),
};

export const esquemaCriarTarefa = z
  .object({ ...campos, ...registros })
  .partial({
    descricao: true,
    subtarefas: true,
    vinculo: true,
    comentarios: true,
    historico: true,
    apontamentos: true,
  })
  .strip();

export const esquemaAtualizarTarefa = z
  .object({ ...campos, ...registros })
  .partial()
  .extend({ versao })
  .strip();

const incluir = {
  responsavel: { select: { nome: true } },
  processo: { select: { numero: true, clienteId: true } },
  cliente: { select: { nome: true } },
  registros: { orderBy: { criadoEm: "asc" } },
} satisfies Prisma.TarefaInclude;

type Linha = Prisma.TarefaGetPayload<{ include: typeof incluir }>;

function paraFront(t: Linha): Tarefa {
  const reg = (tipo: string) => t.registros.filter((r) => r.tipo === tipo);
  return {
    id: t.id,
    titulo: t.titulo,
    descricao: t.descricao,
    coluna: t.coluna as Tarefa["coluna"],
    prioridade: t.prioridade as Tarefa["prioridade"],
    responsavel: t.responsavel.nome,
    vinculoTipo: t.vinculoTipo as Tarefa["vinculoTipo"],
    vinculo: t.processo?.numero ?? t.cliente?.nome ?? "",
    clienteId: t.clienteId ?? t.processo?.clienteId ?? undefined,
    prazo: isoDeData(t.prazo),
    subtarefas: z.array(subtarefa).catch([]).parse(t.subtarefas),
    comentarios: reg("comentario").map((r) => ({
      id: r.id,
      autor: r.autorNome,
      texto: r.texto,
      quando: curtoAs(r.criadoEm),
    })),
    historico: reg("historico").map((r) => ({
      id: r.id,
      autor: r.autorNome,
      texto: r.texto,
      quando: curtoAs(r.criadoEm),
    })),
    apontamentos: reg("apontamento").map((r) => ({
      id: r.id,
      autor: r.autorNome,
      minutos: r.minutos ?? 0,
      quando: curtoAs(r.criadoEm),
      nota: r.texto,
    })),
    versao: t.versao,
  };
}

const visivel = (ctx: Contexto): Prisma.TarefaWhereInput => ({
  escritorioId: ctx.usuario.escritorioId,
  excluidoEm: null,
  ...processoOpcionalVisivel(ctx.usuario),
});

async function vinculo(
  tx: Tx,
  ctx: Contexto,
  tipo: Tarefa["vinculoTipo"],
  valor: string | undefined,
) {
  if (tipo === "Interno") return { processoId: null, clienteId: null };
  if (!valor)
    throw erro.validacao("Informe o vínculo da tarefa.", [
      { campo: "vinculo", mensagem: "Obrigatório." },
    ]);
  if (tipo === "Processo")
    return { processoId: await idProcesso(tx, ctx, valor, "vinculo"), clienteId: null };
  return { processoId: null, clienteId: await idCliente(tx, ctx, valor, "vinculo") };
}

async function incluirRegistros(
  tx: Tx,
  ctx: Contexto,
  tarefaId: string,
  existentes: Set<string>,
  d: {
    comentarios?: { id: string; texto: string }[] | undefined;
    historico?: { id: string; texto: string }[] | undefined;
    apontamentos?: { id: string; minutos: number; nota: string }[] | undefined;
  },
) {
  const novos = [
    ...(d.comentarios ?? [])
      .filter((r) => !existentes.has(r.id))
      .map((r) => ({ tipo: "comentario", texto: r.texto })),
    ...(d.historico ?? [])
      .filter((r) => !existentes.has(r.id))
      .map((r) => ({ tipo: "historico", texto: r.texto })),
    ...(d.apontamentos ?? [])
      .filter((r) => !existentes.has(r.id))
      .map((r) => ({ tipo: "apontamento", texto: r.nota, minutos: r.minutos })),
  ];
  if (novos.length > 20) throw erro.validacao("Inclua no máximo 20 registros por vez.");
  if (novos.length)
    await tx.tarefaRegistro.createMany({
      data: novos.map((r) => ({
        ...r,
        tarefaId,
        autorId: ctx.usuario.id,
        autorNome: ctx.usuario.nome,
      })),
    });
  return novos.length;
}

export async function listarTarefas(ctx: Contexto, p: Paginacao) {
  const where = visivel(ctx);
  const [linhas, total] = await Promise.all([
    db().tarefa.findMany({
      where,
      include: incluir,
      orderBy: [{ prazo: "asc" }, { id: "asc" }],
      ...pular(p),
    }),
    db().tarefa.count({ where }),
  ]);
  return pagina(linhas.map(paraFront), total, p);
}

export async function obterTarefa(ctx: Contexto, id: string) {
  const t = await db().tarefa.findFirst({ where: { id, ...visivel(ctx) }, include: incluir });
  if (!t) throw erro.naoEncontrado();
  return paraFront(t);
}

export async function criarTarefa(ctx: Contexto, d: z.infer<typeof esquemaCriarTarefa>) {
  const { id, repetido } = await criarIdempotente(ctx, "tarefa", async (tx) => {
    const t = await tx.tarefa.create({
      data: {
        escritorioId: ctx.usuario.escritorioId,
        titulo: d.titulo,
        descricao: d.descricao ?? "",
        coluna: d.coluna,
        prioridade: d.prioridade,
        responsavelId: await idUsuario(tx, ctx, d.responsavel),
        vinculoTipo: d.vinculoTipo,
        ...(await vinculo(tx, ctx, d.vinculoTipo, d.vinculo)),
        prazo: dataDeIso(d.prazo),
        subtarefas: d.subtarefas ?? [],
      },
    });
    await incluirRegistros(tx, ctx, t.id, new Set(), d);
    await ctx.auditarTx(tx, {
      acao: "Criou",
      modulo: "Tarefas",
      descricao: `Criou a tarefa "${t.titulo}"`,
      recursoTipo: "Tarefa",
      recursoId: t.id,
    });
    return t.id;
  });
  return { tarefa: await obterTarefa(ctx, id), repetido };
}

export async function atualizarTarefa(
  ctx: Contexto,
  id: string,
  d: z.infer<typeof esquemaAtualizarTarefa>,
) {
  await db().$transaction(async (tx) => {
    const atual = await tx.tarefa.findFirst({
      where: { id, ...visivel(ctx) },
      select: {
        titulo: true,
        vinculoTipo: true,
        processo: { select: { numero: true } },
        cliente: { select: { nome: true } },
        registros: { select: { id: true } },
      },
    });
    if (!atual) throw erro.naoEncontrado();
    const tipo = d.vinculoTipo ?? (atual.vinculoTipo as Tarefa["vinculoTipo"]);
    const valorAtual = atual.processo?.numero ?? atual.cliente?.nome ?? "";
    const mudouVinculo =
      d.vinculoTipo !== undefined || (d.vinculo !== undefined && d.vinculo !== valorAtual);
    const r = await tx.tarefa.updateMany({
      where: { id, escritorioId: ctx.usuario.escritorioId, excluidoEm: null, versao: d.versao },
      data: {
        ...(d.titulo !== undefined && { titulo: d.titulo }),
        ...(d.descricao !== undefined && { descricao: d.descricao }),
        ...(d.coluna !== undefined && { coluna: d.coluna }),
        ...(d.prioridade !== undefined && { prioridade: d.prioridade }),
        ...(d.responsavel !== undefined && {
          responsavelId: await idUsuario(tx, ctx, d.responsavel),
        }),
        ...(mudouVinculo && {
          vinculoTipo: tipo,
          ...(await vinculo(tx, ctx, tipo, d.vinculo ?? valorAtual)),
        }),
        ...(d.prazo !== undefined && { prazo: dataDeIso(d.prazo) }),
        ...(d.subtarefas !== undefined && { subtarefas: d.subtarefas }),
        versao: { increment: 1 },
      },
    });
    await garantirAtualizado(r.count, async () => atual);
    const novos = await incluirRegistros(tx, ctx, id, new Set(atual.registros.map((x) => x.id)), d);
    const alterados = Object.keys(d).filter(
      (k) => !["versao", ...Object.keys(registros)].includes(k),
    );
    if (alterados.length || novos)
      await ctx.auditarTx(tx, {
        acao: "Editou",
        modulo: "Tarefas",
        descricao: `Atualizou a tarefa "${atual.titulo}"${alterados.length ? ` (${alterados.join(", ")})` : ""}`,
        recursoTipo: "Tarefa",
        recursoId: id,
      });
  });
  return obterTarefa(ctx, id);
}

export async function excluirTarefa(ctx: Contexto, id: string) {
  const atual = await db().tarefa.findFirst({
    where: { id, ...visivel(ctx) },
    select: { titulo: true },
  });
  if (!atual) throw erro.naoEncontrado();
  await db().$transaction(async (tx) => {
    await tx.tarefa.update({ where: { id }, data: { excluidoEm: new Date() } });
    await ctx.auditarTx(tx, {
      acao: "Excluiu",
      modulo: "Tarefas",
      descricao: `Excluiu a tarefa "${atual.titulo}"`,
      recursoTipo: "Tarefa",
      recursoId: id,
    });
  });
}
