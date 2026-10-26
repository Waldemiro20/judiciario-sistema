import { z } from "zod";

export const temControle = (s: string) =>
  [...s].some((ch) => {
    const c = ch.charCodeAt(0);
    return (c < 32 && c !== 9 && c !== 10 && c !== 13) || c === 127;
  });

export const texto = (max: number) =>
  z
    .string()
    .max(max, `Máximo de ${max} caracteres.`)
    .refine((s) => !temControle(s), "Caracteres inválidos.")
    .transform((s) => s.trim());

export const textoObrigatorio = (max: number) =>
  texto(max).refine((s) => s.length > 0, "Campo obrigatório.");

export const textoLongo = (max: number) =>
  z
    .string()
    .max(max, `Máximo de ${max} caracteres.`)
    .refine((s) => !temControle(s), "Caracteres inválidos.");

export const dataIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD.")
  .refine(
    (s) =>
      !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime()) &&
      new Date(`${s}T00:00:00Z`).toISOString().startsWith(s),
    "Data inválida.",
  );

export const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:MM.");

export const dinheiro = z
  .number()
  .finite()
  .min(0)
  .max(1_000_000_000_000)
  .transform((v) => Math.round(v * 100) / 100);

export const versao = z.number().int().min(1);

export const urlHttp = z
  .string()
  .max(500)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), "Use um link http(s).");

export const idCliente = z.string().min(1).max(64);
