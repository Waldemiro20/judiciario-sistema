import { createHash } from "node:crypto";
import { config } from "../config";
import { db } from "../db";
import { erro } from "../http/erros";

const chave = (tipo: string, valor: string) =>
  `${tipo}:${createHash("sha256").update(valor).digest("hex")}`;

export function chavesLogin(email: string, ip?: string) {
  return { email: chave("email", email.toLowerCase()), ip: ip ? chave("ip", ip) : undefined };
}

export async function verificarLimiteLogin(chaves: { email: string; ip?: string | undefined }) {
  const c = config();
  const desde = new Date(Date.now() - c.LOGIN_JANELA_MINUTOS * 60_000);
  const [porEmail, porIp] = await Promise.all([
    db().tentativaLogin.count({
      where: { chave: chaves.email, sucesso: false, criadoEm: { gte: desde } },
    }),
    chaves.ip
      ? db().tentativaLogin.count({
          where: { chave: chaves.ip, sucesso: false, criadoEm: { gte: desde } },
        })
      : Promise.resolve(0),
  ]);
  if (porEmail >= c.LOGIN_MAX_TENTATIVAS || porIp >= c.LOGIN_MAX_TENTATIVAS_IP)
    throw erro.limite(c.LOGIN_JANELA_MINUTOS * 60);
}

export async function registrarTentativa(
  chaves: { email: string; ip?: string | undefined },
  sucesso: boolean,
) {
  const linhas = [chaves.email, chaves.ip]
    .filter((k): k is string => !!k)
    .map((k) => ({ chave: k, sucesso }));
  await db().tentativaLogin.createMany({ data: linhas });
  if (sucesso) {
    await db().tentativaLogin.deleteMany({ where: { chave: chaves.email, sucesso: false } });
  }
  if (Math.random() < 0.01) {
    const limite = new Date(Date.now() - 24 * 3600_000);
    await db().tentativaLogin.deleteMany({ where: { criadoEm: { lt: limite } } });
  }
}
