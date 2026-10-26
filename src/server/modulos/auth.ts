import { z } from "zod";
import { db } from "../db";
import { erro, ErroApi } from "../http/erros";
import { auditar } from "../auditoria";
import { conferirSenha, gerarHash, senhaForte } from "../auth/senha";
import { chavesLogin, registrarTentativa, verificarLimiteLogin } from "../auth/limite";
import {
  criarSessao,
  revogarSessao,
  revogarSessoesDoUsuario,
  type UsuarioSessao,
} from "../auth/sessao";
import type { ContextoBase, Contexto } from "../http/rota";
import type { Role } from "@/lib/data";

export const esquemaLogin = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    senha: z.string().min(1).max(128),
  })
  .strict();

export const esquemaTrocaSenha = z
  .object({ senhaAtual: z.string().min(1).max(128), novaSenha: senhaForte })
  .strict();

const CREDENCIAIS_INVALIDAS = "E-mail ou senha incorretos.";

export async function login(ctx: ContextoBase, d: z.infer<typeof esquemaLogin>) {
  const chaves = chavesLogin(d.email, ctx.ip);
  await verificarLimiteLogin(chaves);
  const u = await db().usuario.findUnique({ where: { email: d.email } });
  const senhaOk = await conferirSenha(u?.senhaHash, d.senha);
  if (!u || !senhaOk || !u.ativo) {
    await registrarTentativa(chaves, false);
    await auditar({
      escritorioId: u?.escritorioId ?? null,
      usuarioId: u?.id ?? null,
      usuarioNome: u?.nome ?? "(desconhecido)",
      acao: "Login",
      modulo: "Sistema",
      descricao: u && senhaOk && !u.ativo ? "Login recusado: usuário desativado" : "Falha de login",
      resultado: "falha",
      ip: ctx.ip,
      requestId: ctx.requestId,
    });
    throw new ErroApi(401, "NAO_AUTENTICADO", CREDENCIAIS_INVALIDAS);
  }
  await registrarTentativa(chaves, true);
  const token = await criarSessao(u.id, ctx.ip, ctx.userAgent);
  await db().usuario.update({ where: { id: u.id }, data: { ultimoAcessoEm: new Date() } });
  await auditar({
    escritorioId: u.escritorioId,
    usuarioId: u.id,
    usuarioNome: u.nome,
    acao: "Login",
    modulo: "Sistema",
    descricao: "Acesso ao sistema",
    ip: ctx.ip,
    requestId: ctx.requestId,
  });
  const usuario: UsuarioSessao = {
    id: u.id,
    escritorioId: u.escritorioId,
    nome: u.nome,
    email: u.email,
    role: u.role as Role,
    deveTrocarSenha: u.deveTrocarSenha,
  };
  return { token, usuario };
}

export async function logout(ctx: Contexto) {
  await revogarSessao(ctx.sessaoId);
  await ctx.auditar({ acao: "Logout", modulo: "Sistema", descricao: "Saiu do sistema" });
}

export async function encerrarOutrasSessoes(ctx: Contexto) {
  await revogarSessoesDoUsuario(ctx.usuario.id, ctx.sessaoId);
  await ctx.auditar({ acao: "Logout", modulo: "Sistema", descricao: "Encerrou as outras sessões" });
}

export async function trocarSenha(ctx: Contexto, d: z.infer<typeof esquemaTrocaSenha>) {
  const chaves = chavesLogin(ctx.usuario.email, ctx.ip);
  await verificarLimiteLogin(chaves);
  const u = await db().usuario.findUniqueOrThrow({ where: { id: ctx.usuario.id } });
  if (!(await conferirSenha(u.senhaHash, d.senhaAtual))) {
    await registrarTentativa(chaves, false);
    throw erro.validacao("Senha atual incorreta.", [
      { campo: "senhaAtual", mensagem: "Senha atual incorreta." },
    ]);
  }
  if (d.novaSenha === d.senhaAtual)
    throw erro.validacao("A nova senha precisa ser diferente da atual.", [
      { campo: "novaSenha", mensagem: "A nova senha precisa ser diferente da atual." },
    ]);
  const local = u.email.split("@")[0] ?? "";
  if (local.length >= 4 && d.novaSenha.toLowerCase().includes(local))
    throw erro.validacao("A senha não pode conter o seu e-mail.", [
      { campo: "novaSenha", mensagem: "A senha não pode conter o seu e-mail." },
    ]);
  await db().usuario.update({
    where: { id: u.id },
    data: { senhaHash: await gerarHash(d.novaSenha), deveTrocarSenha: false },
  });
  await revogarSessoesDoUsuario(u.id);
  const token = await criarSessao(u.id, ctx.ip, ctx.userAgent);
  await ctx.auditar({ acao: "Editou", modulo: "Sistema", descricao: "Alterou a própria senha" });
  return { token, usuario: { ...ctx.usuario, deveTrocarSenha: false } };
}
