import { createHash, randomBytes } from "node:crypto";
import { config } from "../config";
import { db } from "../db";
import type { Role } from "@/lib/data";

export type UsuarioSessao = {
  id: string;
  escritorioId: string;
  nome: string;
  email: string;
  role: Role;
  deveTrocarSenha: boolean;
};

export type SessaoValida = { sessaoId: string; usuario: UsuarioSessao };

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function nomeCookie() {
  return config().cookieSeguro ? "__Host-lv_sessao" : "lv_sessao";
}

export function cookieSessao(token: string) {
  const c = config();
  return [
    `${nomeCookie()}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${c.SESSION_TTL_HORAS * 3600}`,
    ...(c.cookieSeguro ? ["Secure"] : []),
  ].join("; ");
}

export function cookieExpirado() {
  return [
    `${nomeCookie()}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
    ...(config().cookieSeguro ? ["Secure"] : []),
  ].join("; ");
}

export function tokenDaRequisicao(req: Request): string | undefined {
  const cabecalho = req.headers.get("cookie");
  if (!cabecalho) return undefined;
  const nome = nomeCookie();
  for (const parte of cabecalho.split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === nome) {
      const token = v.join("=");
      return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
    }
  }
  return undefined;
}

export async function criarSessao(usuarioId: string, ip?: string, userAgent?: string) {
  const token = randomBytes(32).toString("base64url");
  const expiraEm = new Date(Date.now() + config().SESSION_TTL_HORAS * 3600_000);
  await db().sessao.create({
    data: {
      tokenHash: hashToken(token),
      usuarioId,
      expiraEm,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  });
  return token;
}

export async function validarSessao(token: string): Promise<SessaoValida | null> {
  const agora = new Date();
  const s = await db().sessao.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { usuario: true },
  });
  if (!s || s.revogadaEm || s.expiraEm <= agora || !s.usuario.ativo) return null;
  const ociosa = agora.getTime() - s.ultimoUsoEm.getTime() > config().SESSION_IDLE_MINUTOS * 60_000;
  if (ociosa) {
    await db().sessao.update({ where: { id: s.id }, data: { revogadaEm: agora } });
    return null;
  }
  if (agora.getTime() - s.ultimoUsoEm.getTime() > 60_000)
    await db().sessao.update({ where: { id: s.id }, data: { ultimoUsoEm: agora } });
  const u = s.usuario;
  return {
    sessaoId: s.id,
    usuario: {
      id: u.id,
      escritorioId: u.escritorioId,
      nome: u.nome,
      email: u.email,
      role: u.role as Role,
      deveTrocarSenha: u.deveTrocarSenha,
    },
  };
}

export async function revogarSessao(sessaoId: string) {
  await db().sessao.updateMany({
    where: { id: sessaoId, revogadaEm: null },
    data: { revogadaEm: new Date() },
  });
}

export async function revogarSessoesDoUsuario(usuarioId: string, exceto?: string) {
  await db().sessao.updateMany({
    where: { usuarioId, revogadaEm: null, ...(exceto && { id: { not: exceto } }) },
    data: { revogadaEm: new Date() },
  });
}
