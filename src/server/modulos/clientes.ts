import { z } from "zod";
import { STATUS_CLIENTE, TIPOS_CLIENTE, type Cliente } from "@/lib/data";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { erro } from "../http/erros";
import type { Contexto } from "../http/rota";
import type { Paginacao } from "../http/corpo";
import { dataHora, dataHoraAs } from "../formato";
import {
  idCliente as idClienteLivre,
  texto,
  textoLongo,
  textoObrigatorio,
  versao,
} from "../validacao";
import { criarIdempotente, garantirAtualizado, pagina, pular } from "./comum";

const contato = z
  .object({ id: idClienteLivre, tipo: textoObrigatorio(40), valor: textoObrigatorio(200) })
  .strip();
const endereco = z
  .object({
    id: idClienteLivre,
    rotulo: texto(60),
    logradouro: textoObrigatorio(300),
    cidade: texto(120),
    cep: texto(12),
  })
  .strip();
const docPessoal = z
  .object({ id: idClienteLivre, nome: textoObrigatorio(120), obrigatorio: z.boolean() })
  .strip();
const historico = z.object({ texto: textoObrigatorio(1000) }).strip();

const campos = {
  nome: textoObrigatorio(200),
  tipo: z.enum(TIPOS_CLIENTE),
  documento: textoObrigatorio(30).refine((s) => /^[0-9./\- ]+$/.test(s), "Documento inválido."),
  documento2: texto(40),
  desde: texto(7).refine((s) => s === "" || /^\d{2}\/\d{4}$/.test(s), "Use MM/AAAA."),
  status: z.enum(STATUS_CLIENTE),
  contatos: z.array(contato).max(30),
  enderecos: z.array(endereco).max(10),
  documentos: z.array(docPessoal).max(30),
  descricaoCaso: textoLongo(20_000),
};

export const esquemaCriarCliente = z
  .object(campos)
  .partial({
    documento2: true,
    desde: true,
    contatos: true,
    enderecos: true,
    documentos: true,
    descricaoCaso: true,
  })
  .strip();

export const esquemaAtualizarCliente = z
  .object({ ...campos, historico: z.array(historico).max(5000) })
  .partial()
  .extend({ versao })
  .strip();

const incluir = {
  documentos: { orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }] },
  historico: { orderBy: { criadoEm: "desc" } },
} satisfies Prisma.ClienteInclude;

type Linha = Prisma.ClienteGetPayload<{ include: typeof incluir }>;

const DOCS_PF = ["RG ou CNH", "Comprovante de endereço", "Procuração"];
const DOCS_PJ = ["Contrato social", "Cartão CNPJ", "Procuração"];

function paraFront(c: Linha): Cliente {
  return {
    id: c.id,
    nome: c.nome,
    tipo: c.tipo as Cliente["tipo"],
    documento: c.documento,
    documento2: c.documento2,
    desde: c.desde,
    status: c.status as Cliente["status"],
    contatos: z.array(contato).catch([]).parse(c.contatos),
    enderecos: z.array(endereco).catch([]).parse(c.enderecos),
    documentos: c.documentos.map((d) => ({
      id: d.id,
      nome: d.nome,
      obrigatorio: d.obrigatorio,
      ...(d.arquivo && { arquivo: d.arquivo }),
      ...(d.enviadoEm && { enviadoEm: dataHoraAs(d.enviadoEm) }),
      ...(d.enviadoPor && { enviadoPor: d.enviadoPor }),
    })),
    historico: c.historico.map((h) => ({ quando: dataHora(h.criadoEm), texto: h.texto })),
    ...(c.descricaoCaso != null && { descricaoCaso: c.descricaoCaso }),
    ...(c.descricaoCasoEm && { descricaoCasoEm: dataHoraAs(c.descricaoCasoEm) }),
    versao: c.versao,
  };
}

const doEscritorio = (ctx: Contexto) => ({
  escritorioId: ctx.usuario.escritorioId,
  excluidoEm: null,
});

export async function listarClientes(ctx: Contexto, p: Paginacao) {
  const where = doEscritorio(ctx);
  const [linhas, total] = await Promise.all([
    db().cliente.findMany({ where, include: incluir, orderBy: [{ nome: "asc" }], ...pular(p) }),
    db().cliente.count({ where }),
  ]);
  return pagina(linhas.map(paraFront), total, p);
}

export async function obterCliente(ctx: Contexto, id: string) {
  const c = await db().cliente.findFirst({ where: { id, ...doEscritorio(ctx) }, include: incluir });
  if (!c) throw erro.naoEncontrado();
  return paraFront(c);
}

export async function criarCliente(ctx: Contexto, d: z.infer<typeof esquemaCriarCliente>) {
  const { id, repetido } = await criarIdempotente(ctx, "cliente", async (tx) => {
    const docs = d.documentos?.length
      ? d.documentos.map((x, ordem) => ({ nome: x.nome, obrigatorio: x.obrigatorio, ordem }))
      : (d.tipo === "Pessoa Física" ? DOCS_PF : DOCS_PJ).map((nome, ordem) => ({
          nome,
          obrigatorio: true,
          ordem,
        }));
    const c = await tx.cliente.create({
      data: {
        escritorioId: ctx.usuario.escritorioId,
        nome: d.nome,
        tipo: d.tipo,
        documento: d.documento,
        documento2: d.documento2 ?? "",
        desde: d.desde || mesAtual(),
        status: d.status,
        contatos: d.contatos ?? [],
        enderecos: d.enderecos ?? [],
        ...(d.descricaoCaso && { descricaoCaso: d.descricaoCaso, descricaoCasoEm: new Date() }),
        documentos: { create: docs },
        historico: {
          create: { texto: `Cliente cadastrado por ${ctx.usuario.nome}`, autorId: ctx.usuario.id },
        },
      },
    });
    await ctx.auditarTx(tx, {
      acao: "Criou",
      modulo: "Clientes",
      descricao: `Cadastrou o cliente ${c.nome}`,
      recursoTipo: "Cliente",
      recursoId: c.id,
    });
    return c.id;
  });
  return { cliente: await obterCliente(ctx, id), repetido };
}

function mesAtual() {
  const n = new Date();
  return `${String(n.getMonth() + 1).padStart(2, "0")}/${n.getFullYear()}`;
}

export async function atualizarCliente(
  ctx: Contexto,
  id: string,
  d: z.infer<typeof esquemaAtualizarCliente>,
) {
  await db().$transaction(async (tx) => {
    const atual = await tx.cliente.findFirst({
      where: { id, ...doEscritorio(ctx) },
      select: {
        id: true,
        nome: true,
        descricaoCaso: true,
        historico: { select: { texto: true } },
        documentos: { select: { id: true, nome: true, obrigatorio: true, storageKey: true } },
      },
    });
    if (!atual) throw erro.naoEncontrado();
    const mudouDescricao =
      d.descricaoCaso !== undefined && d.descricaoCaso !== (atual.descricaoCaso ?? "");
    const r = await tx.cliente.updateMany({
      where: { id, ...doEscritorio(ctx), versao: d.versao },
      data: {
        ...(d.nome !== undefined && { nome: d.nome }),
        ...(d.tipo !== undefined && { tipo: d.tipo }),
        ...(d.documento !== undefined && { documento: d.documento }),
        ...(d.documento2 !== undefined && { documento2: d.documento2 }),
        ...(d.desde !== undefined && { desde: d.desde }),
        ...(d.status !== undefined && { status: d.status }),
        ...(d.contatos !== undefined && { contatos: d.contatos }),
        ...(d.enderecos !== undefined && { enderecos: d.enderecos }),
        ...(mudouDescricao && {
          descricaoCaso: d.descricaoCaso ?? "",
          descricaoCasoEm: new Date(),
        }),
        versao: { increment: 1 },
      },
    });
    await garantirAtualizado(r.count, async () => atual);

    if (d.documentos !== undefined) {
      const porId = new Map(atual.documentos.map((x) => [x.id, x]));
      const enviados = new Set(d.documentos.map((x) => x.id));
      for (const [ordem, x] of d.documentos.entries()) {
        const existente = porId.get(x.id);
        if (!existente)
          await tx.docPessoal.create({
            data: {
              ...(z.string().uuid().safeParse(x.id).success && { id: x.id }),
              clienteId: id,
              nome: x.nome,
              obrigatorio: x.obrigatorio,
              ordem,
            },
          });
        else
          await tx.docPessoal.update({
            where: { id: x.id },
            data: { nome: x.nome, obrigatorio: x.obrigatorio, ordem },
          });
      }
      const removidos = atual.documentos.filter((x) => !enviados.has(x.id));
      if (removidos.some((x) => x.storageKey))
        throw erro.conflito("Não é possível remover um documento que já tem arquivo anexado.");
      if (removidos.length)
        await tx.docPessoal.deleteMany({
          where: { id: { in: removidos.map((x) => x.id) }, clienteId: id },
        });
    }

    const jaRegistrados = new Map<string, number>();
    for (const h of atual.historico)
      jaRegistrados.set(h.texto, (jaRegistrados.get(h.texto) ?? 0) + 1);
    const novos: string[] = [];
    for (const h of d.historico ?? []) {
      const n = jaRegistrados.get(h.texto) ?? 0;
      if (n > 0) jaRegistrados.set(h.texto, n - 1);
      else novos.push(h.texto);
    }
    if (novos.length > 20)
      throw erro.validacao("Inclua no máximo 20 registros de histórico por vez.");
    if (novos.length)
      await tx.clienteHistorico.createMany({
        data: novos.map((texto) => ({ clienteId: id, texto, autorId: ctx.usuario.id })),
      });

    const alterados = Object.keys(d).filter((k) => !["versao", "historico"].includes(k));
    await ctx.auditarTx(tx, {
      acao: "Editou",
      modulo: "Clientes",
      descricao: `Atualizou o cliente ${atual.nome}${alterados.length ? ` (${alterados.join(", ")})` : ""}`,
      recursoTipo: "Cliente",
      recursoId: id,
    });
  });
  return obterCliente(ctx, id);
}

export async function excluirCliente(ctx: Contexto, id: string) {
  if (ctx.usuario.role !== "admin")
    throw erro.proibido("Só o Advogado Administrador pode excluir clientes.");
  const alvo = await db().cliente.findFirst({
    where: { id, ...doEscritorio(ctx) },
    select: { id: true, nome: true },
  });
  if (!alvo) throw erro.naoEncontrado();
  const ativo = { clienteId: id, excluidoEm: null };
  const [processos, contratos, tarefas, eventos, lancamentos] = await Promise.all([
    db().processo.count({ where: { clienteId: id } }),
    db().contrato.count({ where: { clienteId: id } }),
    db().tarefa.count({ where: ativo }),
    db().evento.count({ where: ativo }),
    db().lancamento.count({ where: ativo }),
  ]);
  const vinculos = [
    processos && `${processos} processo(s)`,
    contratos && `${contratos} contrato(s)`,
    tarefas && `${tarefas} tarefa(s)`,
    eventos && `${eventos} evento(s) da agenda`,
    lancamentos && `${lancamentos} lançamento(s) financeiro(s)`,
  ].filter(Boolean);
  if (vinculos.length)
    throw erro.conflito(
      `${alvo.nome} tem ${vinculos.join(", ")}. Exclua ou transfira esses registros antes de excluir o cliente.`,
    );
  await db().$transaction(async (tx) => {
    const r = await tx.cliente.updateMany({
      where: { id, ...doEscritorio(ctx) },
      data: { excluidoEm: new Date(), versao: { increment: 1 } },
    });
    if (r.count === 0) throw erro.naoEncontrado();
    await tx.clienteHistorico.create({
      data: {
        clienteId: id,
        texto: `Cliente excluído por ${ctx.usuario.nome}`,
        autorId: ctx.usuario.id,
      },
    });
    await ctx.auditarTx(tx, {
      acao: "Excluiu",
      modulo: "Clientes",
      descricao: `Excluiu o cliente ${alvo.nome}`,
      recursoTipo: "Cliente",
      recursoId: id,
    });
  });
}
