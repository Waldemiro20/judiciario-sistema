import { z, type ZodType } from "zod";
import { erro } from "./erros";

const LIMITE_JSON = 256 * 1024;

export async function lerBytes(req: Request, limite: number): Promise<Uint8Array> {
  const declarado = Number(req.headers.get("content-length") ?? "NaN");
  if (Number.isFinite(declarado) && declarado > limite) throw erro.corpoGrande();
  if (!req.body) return new Uint8Array();
  const leitor = req.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > limite) {
      await leitor.cancel();
      throw erro.corpoGrande();
    }
    partes.push(value);
  }
  const saida = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    saida.set(p, pos);
    pos += p.byteLength;
  }
  return saida;
}

export async function lerJson<T>(
  req: Request,
  esquema: ZodType<T>,
  limite = LIMITE_JSON,
): Promise<T> {
  const tipo = req.headers.get("content-type") ?? "";
  if (!/^application\/json(;|$)/i.test(tipo))
    throw erro.tipo("Envie o corpo como application/json.");
  const bytes = await lerBytes(req, limite);
  let bruto: unknown;
  try {
    bruto = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw erro.validacao("JSON inválido.");
  }
  return validar(esquema, bruto);
}

export function validar<T>(esquema: ZodType<T>, valor: unknown): T {
  const r = esquema.safeParse(valor);
  if (!r.success) throw erro.validacao("Dados inválidos.", detalhesZod(r.error));
  return r.data;
}

export function detalhesZod(e: z.ZodError) {
  return e.issues.slice(0, 30).map((i) => ({
    campo: i.path.join(".") || "(corpo)",
    mensagem: i.message,
  }));
}

export function lerBusca<T>(req: Request, esquema: ZodType<T>): T {
  const url = new URL(req.url);
  return validar(esquema, Object.fromEntries(url.searchParams));
}

export const paginacao = z
  .object({
    pagina: z.coerce.number().int().min(1).max(100_000).default(1),
    porPagina: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

export type Paginacao = z.infer<typeof paginacao>;

export const idParam = z.object({ id: z.string().uuid() });

export function idDe(params: { id?: string }) {
  const r = z.string().uuid().safeParse(params.id);
  if (!r.success) throw erro.naoEncontrado();
  return r.data;
}
