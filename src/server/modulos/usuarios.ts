import { z } from "zod";
import { ACOES_LOG, MODULOS, ROLES, type Log, type Modulo, type Usuario } from "@/lib/data";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { erro } from "../http/erros";
import { permite } from "../authz/permissoes";
import { gerarHash, senhaForte, senhaTemporaria } from "../auth/senha";
import { revogarSessoesDoUsuario } from "../auth/sessao";
import type { Contexto } from "../http/rota";
import type { Paginacao } from "../http/corpo";
import { dataHora } from "../formato";
import { texto, textoObrigatorio } from "../validacao";
import { pagina, pular } from "./comum";

export const esquemaCriarUsuario = z
  .object({
    nome: textoObrigatorio(200),
    email: z.string().trim().toLowerCase().email().max(254),
    oab: texto(40).optional(),
    role: z.enum(ROLES),
    senha: senhaForte.optional(),
  })
  .strict();

export const esquemaRedefinirSenha = z.object({ senha: senhaForte.optional() }).strict();

export const esquemaAtualizarUsuario = z
  .object({
    nome: textoObrigatorio(200).optional(),
    oab: texto(40).optional(),
    role: z.enum(ROLES).optional(),
    ativo: z.boolean().optional(),
  })
  .strict();

type Linha = Prisma.UsuarioGetPayload<object>;

function paraFront(u: Linha, completo: boolean): Usuario {
  return {
    id: u.id,
    nome: u.nome,
    email: completo ? u.email : "",
    ...(u.oab && { oab: u.oab }),
    role: u.role as Usuario["role"],
    ativo: u.ativo,
    ultimoAcesso: completo && u.ultimoAcessoEm ? dataHora(u.ultimoAcessoEm) : "—",
  };
}

export async function listarUsuarios(ctx: Contexto) {
  const completo = permite(ctx.permissoes, "Configurações", "ver");
  const lista = await db().usuario.findMany({
    where: { escritorioId: ctx.usuario.escritorioId, ...(!completo && { ativo: true }) },
    orderBy: [{ nome: "asc" }],
  });
  return lista.map((u) => paraFront(u, completo));
}

async function adminsAtivos(escritorioId: string) {
  return db().usuario.count({ where: { escritorioId, role: "admin", ativo: true } });
}

export async function criarUsuario(ctx: Contexto, d: z.infer<typeof esquemaCriarUsuario>) {
  if (d.role === "admin" && ctx.usuario.role !== "admin")
    throw erro.proibido("Só um administrador pode criar outro administrador.");
  const senha = d.senha ?? senhaTemporaria();
  const u = await db().$transaction(async (tx) => {
    const u = await tx.usuario.create({
      data: {
        escritorioId: ctx.usuario.escritorioId,
        nome: d.nome,
        email: d.email,
        oab: d.oab || null,
        role: d.role,
        senhaHash: await gerarHash(senha),
        deveTrocarSenha: !d.senha,
      },
    });
    await ctx.auditarTx(tx, {
      acao: "Criou",
      modulo: "Configurações",
      descricao: `Criou o usuário ${u.nome} (${u.role})`,
      recursoTipo: "Usuario",
      recursoId: u.id,
    });
    return u;
  });
  return { usuario: paraFront(u, true), senhaTemporaria: senha };
}

export async function atualizarUsuario(
  ctx: Contexto,
  id: string,
  d: z.infer<typeof esquemaAtualizarUsuario>,
) {
  const alvo = await db().usuario.findFirst({
    where: { id, escritorioId: ctx.usuario.escritorioId },
  });
  if (!alvo) throw erro.naoEncontrado();
  const proprio = alvo.id === ctx.usuario.id;
  const mudaRole = d.role !== undefined && d.role !== alvo.role;
  const mudaAtivo = d.ativo !== undefined && d.ativo !== alvo.ativo;
  if (proprio && (mudaRole || mudaAtivo))
    throw erro.proibido("Você não pode alterar o próprio perfil nem se desativar.");
  if ((alvo.role === "admin" || d.role === "admin") && ctx.usuario.role !== "admin")
    throw erro.proibido("Só um administrador pode alterar administradores.");
  if (
    alvo.role === "admin" &&
    alvo.ativo &&
    ((mudaRole && d.role !== "admin") || d.ativo === false)
  ) {
    if ((await adminsAtivos(ctx.usuario.escritorioId)) <= 1)
      throw erro.conflito("O escritório precisa de pelo menos um administrador ativo.");
  }
  const u = await db().$transaction(async (tx) => {
    const u = await tx.usuario.update({
      where: { id },
      data: {
        ...(d.nome !== undefined && { nome: d.nome }),
        ...(d.oab !== undefined && { oab: d.oab || null }),
        ...(d.role !== undefined && { role: d.role }),
        ...(d.ativo !== undefined && { ativo: d.ativo }),
      },
    });
    const partes = [
      mudaRole && `perfil ${alvo.role} → ${d.role}`,
      mudaAtivo && (d.ativo ? "ativou" : "desativou"),
      d.nome !== undefined && d.nome !== alvo.nome && "nome",
      d.oab !== undefined && "OAB",
    ].filter(Boolean);
    await ctx.auditarTx(tx, {
      acao: "Editou",
      modulo: "Configurações",
      descricao: `Alterou o usuário ${u.nome}: ${partes.join(", ") || "sem mudanças"}`,
      recursoTipo: "Usuario",
      recursoId: u.id,
    });
    return u;
  });
  if (d.ativo === false || mudaRole) await revogarSessoesDoUsuario(id);
  return paraFront(u, true);
}

export async function redefinirSenha(
  ctx: Contexto,
  id: string,
  d: z.infer<typeof esquemaRedefinirSenha> = {},
) {
  if (ctx.usuario.role !== "admin")
    throw erro.proibido("Só um administrador pode redefinir senhas.");
  if (id === ctx.usuario.id)
    throw erro.proibido("Use a troca de senha para alterar a sua própria senha.");
  const alvo = await db().usuario.findFirst({
    where: { id, escritorioId: ctx.usuario.escritorioId },
  });
  if (!alvo) throw erro.naoEncontrado();
  const senha = d.senha ?? senhaTemporaria();
  await db().$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id },
      data: { senhaHash: await gerarHash(senha), deveTrocarSenha: !d.senha },
    });
    await ctx.auditarTx(tx, {
      acao: "Editou",
      modulo: "Configurações",
      descricao: `Redefiniu a senha de ${alvo.nome}`,
      recursoTipo: "Usuario",
      recursoId: id,
    });
  });
  await revogarSessoesDoUsuario(id);
  return { senhaTemporaria: senha };
}

export const esquemaListarAuditoria = z
  .object({
    modulo: z.string().max(60).optional(),
    resultado: z.enum(["sucesso", "negado", "falha"]).optional(),
  })
  .strip();

export async function listarAuditoria(
  ctx: Contexto,
  p: Paginacao,
  f: z.infer<typeof esquemaListarAuditoria>,
) {
  const where: Prisma.AuditoriaWhereInput = {
    escritorioId: ctx.usuario.escritorioId,
    ...(f.modulo && { modulo: f.modulo }),
    ...(f.resultado && { resultado: f.resultado }),
  };
  const [linhas, total] = await Promise.all([
    db().auditoria.findMany({
      where,
      orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
      ...pular(p),
    }),
    db().auditoria.count({ where }),
  ]);
  const itens: Log[] = linhas.map((l) => ({
    id: String(l.id),
    usuario: l.usuarioNome,
    acao: l.acao as Log["acao"],
    modulo: l.modulo,
    descricao: l.descricao,
    ip: l.ip ?? "—",
    quando: dataHora(l.criadoEm),
    resultado: l.resultado as Log["resultado"],
  }));
  return pagina(itens, total, p);
}

export const esquemaEventoCliente = z
  .object({
    acao: z.enum([
      "Exportou",
      "Visualizou",
    ] as const satisfies readonly (typeof ACOES_LOG)[number][]),
    modulo: z.enum(MODULOS as unknown as [Modulo, ...Modulo[]]),
    descricao: textoObrigatorio(300),
  })
  .strict();

export async function registrarEventoCliente(
  ctx: Contexto,
  d: z.infer<typeof esquemaEventoCliente>,
) {
  if (!permite(ctx.permissoes, d.modulo, "ver")) throw erro.proibido();
  await ctx.auditar({
    acao: d.acao,
    modulo: d.modulo,
    descricao: `${d.descricao} (informado pela interface)`,
  });
}
