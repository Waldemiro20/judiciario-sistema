import { CLIENTE_INTERNO } from "@/lib/data";
import { db, type Tx } from "../db";
import { erro } from "../http/erros";
import { processoVisivel } from "../authz/acesso";
import type { Contexto } from "../http/rota";
import type { Paginacao } from "../http/corpo";

const naoEncontradoCampo = (campo: string, mensagem: string) =>
  erro.validacao(mensagem, [{ campo, mensagem }]);

export async function idUsuario(tx: Tx, ctx: Contexto, nome: string, campo = "responsavel") {
  const u = await tx.usuario.findFirst({
    where: { escritorioId: ctx.usuario.escritorioId, nome },
    select: { id: true },
  });
  if (!u) throw naoEncontradoCampo(campo, `Usuário "${nome}" não encontrado.`);
  return u.id;
}

export async function idsUsuarios(tx: Tx, ctx: Contexto, nomes: string[], campo = "equipe") {
  const unicos = [...new Set(nomes)];
  const achados = await tx.usuario.findMany({
    where: { escritorioId: ctx.usuario.escritorioId, nome: { in: unicos } },
    select: { id: true, nome: true },
  });
  if (achados.length !== unicos.length) {
    const faltam = unicos.filter((n) => !achados.some((a) => a.nome === n));
    throw naoEncontradoCampo(campo, `Usuário(s) não encontrado(s): ${faltam.join(", ")}.`);
  }
  return achados.map((a) => a.id);
}

export async function idCliente(tx: Tx, ctx: Contexto, nome: string, campo = "cliente") {
  const c = await tx.cliente.findFirst({
    where: { escritorioId: ctx.usuario.escritorioId, nome },
    select: { id: true },
  });
  if (!c) throw naoEncontradoCampo(campo, `Cliente "${nome}" não encontrado.`);
  return c.id;
}

export async function idClienteOuInterno(tx: Tx, ctx: Contexto, nome: string) {
  return nome === CLIENTE_INTERNO ? null : idCliente(tx, ctx, nome);
}

export async function idProcesso(tx: Tx, ctx: Contexto, numero: string, campo = "processo") {
  const p = await tx.processo.findFirst({
    where: { ...processoVisivel(ctx.usuario), numero },
    select: { id: true },
  });
  if (!p) throw naoEncontradoCampo(campo, `Processo "${numero}" não encontrado.`);
  return p.id;
}

export async function idProcessoOpcional(tx: Tx, ctx: Contexto, numero: string | undefined) {
  return numero ? idProcesso(tx, ctx, numero) : null;
}

const CHAVE = /^[A-Za-z0-9-]{8,64}$/;

export async function criarIdempotente(
  ctx: Contexto,
  recurso: string,
  criar: (tx: Tx) => Promise<string>,
): Promise<{ id: string; repetido: boolean }> {
  const chave = ctx.req.headers.get("idempotency-key");
  if (chave !== null && !CHAVE.test(chave)) throw erro.validacao("Idempotency-Key inválida.");
  const existente = async () =>
    chave
      ? db().idempotencia.findUnique({
          where: { usuarioId_chave: { usuarioId: ctx.usuario.id, chave } },
        })
      : null;
  const anterior = await existente();
  if (anterior) {
    if (anterior.recurso !== recurso)
      throw erro.conflito("Idempotency-Key já usada em outro recurso.");
    return { id: anterior.recursoId, repetido: true };
  }
  try {
    const id = await db().$transaction(async (tx) => {
      const id = await criar(tx);
      if (chave)
        await tx.idempotencia.create({
          data: { usuarioId: ctx.usuario.id, chave, recurso, recursoId: id },
        });
      return id;
    });
    return { id, repetido: false };
  } catch (e) {
    const outra = await existente();
    if (outra && outra.recurso === recurso) return { id: outra.recursoId, repetido: true };
    throw e;
  }
}

export async function garantirAtualizado(contagem: number, existe: () => Promise<unknown>) {
  if (contagem === 1) return;
  if (await existe()) throw erro.versao();
  throw erro.naoEncontrado();
}

export function pagina<T>(itens: T[], total: number, p: Paginacao) {
  return { itens, total, pagina: p.pagina, porPagina: p.porPagina };
}

export const pular = (p: Paginacao) => ({ skip: (p.pagina - 1) * p.porPagina, take: p.porPagina });
