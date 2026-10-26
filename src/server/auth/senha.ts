import { hash, verify } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const OPCOES = { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 };

let hashFicticio: Promise<string> | undefined;

export function gerarHash(senha: string) {
  return hash(senha, OPCOES);
}

export async function conferirSenha(senhaHash: string | undefined, senha: string) {
  if (!senhaHash) {
    hashFicticio ??= gerarHash(randomBytes(32).toString("hex"));
    await verify(await hashFicticio, senha).catch(() => false);
    return false;
  }
  return verify(senhaHash, senha).catch(() => false);
}

const COMUNS = new Set([
  "123456789012",
  "senhasenha12",
  "password1234",
  "qwertyuiop12",
  "admin1234567",
  "000000000000",
]);

export const senhaForte = z
  .string()
  .min(12, "A senha precisa ter pelo menos 12 caracteres.")
  .max(128, "A senha pode ter no máximo 128 caracteres.")
  .refine((s) => !COMUNS.has(s.toLowerCase()), "Escolha uma senha menos previsível.")
  .refine((s) => new Set(s).size >= 5, "Escolha uma senha menos previsível.");

export function senhaTemporaria() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(20);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}
