import { z } from "zod";
import type { Documento, Pasta } from "@/lib/data";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { erro } from "../http/erros";
import { documentoVisivel, pastaVisivel } from "../authz/acesso";
import type { Contexto } from "../http/rota";
import type { Paginacao } from "../http/corpo";
import { validar } from "../http/corpo";
import { dataHoraAs, tamanhoLegivel } from "../formato";
import { log } from "../log";
import { textoObrigatorio } from "../validacao";
import { armazenamento, novaChave } from "../storage";
import type { ArquivoValidado } from "../storage/arquivos";
import { criarIdempotente, idsUsuarios, idProcesso, pagina, pular } from "./comum";

export const esquemaCriarPasta = z
  .object({
    nome: textoObrigatorio(80),
    confidencial: z.boolean(),
    acesso: z.array(textoObrigatorio(200)).max(100),
  })
  .strip();

const esquemaDestino = z
  .object({ pasta: textoObrigatorio(80), processo: z.string().trim().max(40).optional() })
  .strip();

const incluir = {
  pasta: { select: { nome: true } },
  processo: { select: { numero: true } },
  versoes: { orderBy: { numero: "asc" } },
} satisfies Prisma.DocumentoInclude;

type Linha = Prisma.DocumentoGetPayload<{ include: typeof incluir }>;

function paraFront(d: Linha): Documento {
  return {
    id: d.id,
    nome: d.nome,
    pasta: d.pasta.nome,
    processo: d.processo?.numero ?? "",
    conteudo: d.conteudo,
    versoes: d.versoes.map((v) => ({
      id: v.id,
      versao: `V${v.numero}`,
      autor: v.autorNome,
      quando: dataHoraAs(v.criadoEm),
      tamanho: tamanhoLegivel(v.tamanho),
    })),
  };
}

export async function listarPastas(ctx: Contexto): Promise<Pasta[]> {
  const pastas = await db().pasta.findMany({
    where: { escritorioId: ctx.usuario.escritorioId },
    include: { acessos: { select: { usuario: { select: { nome: true } } } } },
    orderBy: [{ criadoEm: "asc" }, { id: "asc" }],
  });
  return pastas.map((p) => ({
    id: p.id,
    nome: p.nome,
    confidencial: p.confidencial,
    acesso: p.acessos.map((a) => a.usuario.nome),
  }));
}

export async function criarPasta(ctx: Contexto, d: z.infer<typeof esquemaCriarPasta>) {
  const { id } = await criarIdempotente(ctx, "pasta", async (tx) => {
    const ids = new Set(d.confidencial ? await idsUsuarios(tx, ctx, d.acesso, "acesso") : []);
    if (d.confidencial) ids.add(ctx.usuario.id);
    const p = await tx.pasta.create({
      data: {
        escritorioId: ctx.usuario.escritorioId,
        nome: d.nome,
        confidencial: d.confidencial,
        acessos: { create: [...ids].map((usuarioId) => ({ usuarioId })) },
      },
    });
    await ctx.auditarTx(tx, {
      acao: "Criou",
      modulo: "Documentos",
      descricao: `Criou a pasta ${p.nome}${p.confidencial ? ` (confidencial, ${ids.size} com acesso)` : ""}`,
      recursoTipo: "Pasta",
      recursoId: p.id,
    });
    return p.id;
  });
  return (await listarPastas(ctx)).find((p) => p.id === id)!;
}

export async function listarDocumentos(ctx: Contexto, p: Paginacao) {
  const where = documentoVisivel(ctx.usuario);
  const [linhas, total] = await Promise.all([
    db().documento.findMany({
      where,
      include: incluir,
      orderBy: [{ atualizadoEm: "desc" }, { id: "asc" }],
      ...pular(p),
    }),
    db().documento.count({ where }),
  ]);
  return pagina(linhas.map(paraFront), total, p);
}

async function obter(ctx: Contexto, id: string) {
  const d = await db().documento.findFirst({
    where: { id, ...documentoVisivel(ctx.usuario) },
    include: incluir,
  });
  if (!d) throw erro.naoEncontrado();
  return paraFront(d);
}

export async function enviarDocumento(
  ctx: Contexto,
  arquivo: ArquivoValidado,
  campos: Record<string, string>,
) {
  const destino = validar(esquemaDestino, campos);
  const pasta = await db().pasta.findFirst({
    where: { ...pastaVisivel(ctx.usuario), nome: destino.pasta },
    select: { id: true, nome: true, confidencial: true },
  });
  if (!pasta)
    throw erro.validacao("Pasta não encontrada.", [
      { campo: "pasta", mensagem: "Pasta não encontrada." },
    ]);
  const chave = novaChave(ctx.usuario.escritorioId);
  await armazenamento().salvar(chave, arquivo.bytes, arquivo.mime);
  try {
    const r = await db().$transaction(async (tx) => {
      const processoId = destino.processo ? await idProcesso(tx, ctx, destino.processo) : null;
      const existente = await tx.documento.findFirst({
        where: { pastaId: pasta.id, nome: arquivo.nome },
        select: {
          id: true,
          processoId: true,
          versoes: { select: { numero: true }, orderBy: { numero: "desc" }, take: 1 },
        },
      });
      if (
        existente &&
        !(await tx.documento.findFirst({
          where: { id: existente.id, ...documentoVisivel(ctx.usuario) },
          select: { id: true },
        }))
      )
        throw erro.conflito("Já existe um documento com este nome nesta pasta.");
      const numero = (existente?.versoes[0]?.numero ?? 0) + 1;
      const conteudo = arquivo.mime.startsWith("text/")
        ? new TextDecoder().decode(arquivo.bytes).slice(0, 100_000)
        : undefined;
      const documentoId = existente
        ? (
            await tx.documento.update({
              where: { id: existente.id },
              data: { ...(conteudo !== undefined && { conteudo }) },
            })
          ).id
        : (
            await tx.documento.create({
              data: {
                escritorioId: ctx.usuario.escritorioId,
                nome: arquivo.nome,
                pastaId: pasta.id,
                processoId,
                conteudo: conteudo ?? "",
              },
            })
          ).id;
      await tx.documentoVersao.create({
        data: {
          documentoId,
          numero,
          autorId: ctx.usuario.id,
          autorNome: ctx.usuario.nome,
          storageKey: chave,
          mime: arquivo.mime,
          tamanho: arquivo.tamanho,
          sha256: arquivo.sha256,
        },
      });
      await ctx.auditarTx(tx, {
        acao: "Criou",
        modulo: "Documentos",
        descricao: `Enviou ${arquivo.nome} (V${numero}) para ${pasta.nome}`,
        recursoTipo: "Documento",
        recursoId: documentoId,
      });
      return { documentoId, numero };
    });
    return { documento: await obter(ctx, r.documentoId), versao: `V${r.numero}` };
  } catch (e) {
    await armazenamento()
      .remover(chave)
      .catch((falha) => log.error("falha ao limpar arquivo órfão", { falha }));
    throw e;
  }
}

export async function restaurarVersao(ctx: Contexto, documentoId: string, versaoId: string) {
  await db().$transaction(async (tx) => {
    const doc = await tx.documento.findFirst({
      where: { id: documentoId, ...documentoVisivel(ctx.usuario) },
      select: {
        nome: true,
        versoes: { orderBy: { numero: "desc" }, take: 1, select: { numero: true } },
      },
    });
    if (!doc) throw erro.naoEncontrado();
    const v = await tx.documentoVersao.findFirst({ where: { id: versaoId, documentoId } });
    if (!v) throw erro.naoEncontrado();
    const numero = (doc.versoes[0]?.numero ?? 0) + 1;
    await tx.documentoVersao.create({
      data: {
        documentoId,
        numero,
        autorId: ctx.usuario.id,
        autorNome: ctx.usuario.nome,
        storageKey: v.storageKey,
        mime: v.mime,
        tamanho: v.tamanho,
        sha256: v.sha256,
      },
    });
    await tx.documento.update({ where: { id: documentoId }, data: { atualizadoEm: new Date() } });
    await ctx.auditarTx(tx, {
      acao: "Editou",
      modulo: "Documentos",
      descricao: `Restaurou a V${v.numero} de ${doc.nome} como V${numero}`,
      recursoTipo: "Documento",
      recursoId: documentoId,
    });
  });
  return obter(ctx, documentoId);
}

export async function baixarVersao(ctx: Contexto, documentoId: string, versaoId: string) {
  const doc = await db().documento.findFirst({
    where: { id: documentoId, ...documentoVisivel(ctx.usuario) },
    select: {
      nome: true,
      pasta: { select: { confidencial: true } },
      processo: { select: { sigiloso: true } },
    },
  });
  if (!doc) throw erro.naoEncontrado();
  const v = await db().documentoVersao.findFirst({ where: { id: versaoId, documentoId } });
  if (!v) throw erro.naoEncontrado();
  const dados = await armazenamento().ler(v.storageKey);
  const restrito = doc.pasta.confidencial || doc.processo?.sigiloso;
  await ctx.auditar({
    acao: "Visualizou",
    modulo: "Documentos",
    descricao: `Baixou ${doc.nome} (V${v.numero})${restrito ? " — restrito" : ""}`,
    recursoTipo: "Documento",
    recursoId: documentoId,
  });
  return { nome: doc.nome, mime: v.mime, dados };
}

export async function anexarDocPessoal(
  ctx: Contexto,
  clienteId: string,
  docId: string,
  arquivo: ArquivoValidado,
) {
  const doc = await db().docPessoal.findFirst({
    where: {
      id: docId,
      clienteId,
      cliente: { escritorioId: ctx.usuario.escritorioId, excluidoEm: null },
    },
    select: { id: true, nome: true, storageKey: true, cliente: { select: { nome: true } } },
  });
  if (!doc) throw erro.naoEncontrado();
  const chave = novaChave(ctx.usuario.escritorioId);
  await armazenamento().salvar(chave, arquivo.bytes, arquivo.mime);
  try {
    await db().$transaction(async (tx) => {
      await tx.docPessoal.update({
        where: { id: doc.id },
        data: {
          arquivo: arquivo.nome,
          storageKey: chave,
          mime: arquivo.mime,
          tamanho: arquivo.tamanho,
          enviadoEm: new Date(),
          enviadoPorId: ctx.usuario.id,
          enviadoPor: ctx.usuario.nome,
        },
      });
      await tx.cliente.update({ where: { id: clienteId }, data: { versao: { increment: 1 } } });
      await tx.clienteHistorico.create({
        data: {
          clienteId,
          texto: `${doc.nome} ${doc.storageKey ? "substituído" : "anexado"} (${arquivo.nome})`,
          autorId: ctx.usuario.id,
        },
      });
      await ctx.auditarTx(tx, {
        acao: doc.storageKey ? "Editou" : "Criou",
        modulo: "Clientes",
        descricao: `Anexou ${doc.nome} de ${doc.cliente.nome}`,
        recursoTipo: "DocPessoal",
        recursoId: doc.id,
      });
    });
  } catch (e) {
    await armazenamento()
      .remover(chave)
      .catch((falha) => log.error("falha ao limpar arquivo órfão", { falha }));
    throw e;
  }
  if (doc.storageKey)
    await armazenamento()
      .remover(doc.storageKey)
      .catch((falha) => log.error("falha ao remover arquivo substituído", { falha }));
}

export async function baixarDocPessoal(ctx: Contexto, clienteId: string, docId: string) {
  const doc = await db().docPessoal.findFirst({
    where: {
      id: docId,
      clienteId,
      cliente: { escritorioId: ctx.usuario.escritorioId, excluidoEm: null },
    },
    select: {
      id: true,
      nome: true,
      arquivo: true,
      storageKey: true,
      mime: true,
      cliente: { select: { nome: true } },
    },
  });
  if (!doc?.storageKey || !doc.arquivo || !doc.mime) throw erro.naoEncontrado();
  const dados = await armazenamento().ler(doc.storageKey);
  await ctx.auditar({
    acao: "Visualizou",
    modulo: "Clientes",
    descricao: `Baixou ${doc.nome} de ${doc.cliente.nome}`,
    recursoTipo: "DocPessoal",
    recursoId: doc.id,
  });
  return { nome: doc.arquivo, mime: doc.mime, dados };
}
