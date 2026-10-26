import { config } from "../config";

export function ipDe(req: Request): string | undefined {
  if (!config().TRUST_PROXY) return undefined;
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  const encaminhado = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return encaminhado ? encaminhado.slice(0, 64) : undefined;
}

export function userAgentDe(req: Request) {
  return req.headers.get("user-agent")?.slice(0, 256) ?? undefined;
}

export function origemPermitida(req: Request): boolean {
  const c = config();
  const origem = req.headers.get("origin");
  if (origem) {
    const normalizada = origem.replace(/\/$/, "");
    if (c.origens.includes(normalizada)) return true;
    if (c.NODE_ENV !== "production" && c.origens.length === 0)
      return normalizada === new URL(req.url).origin;
    return false;
  }
  return req.headers.get("sec-fetch-site") === "same-origin";
}

const baldes = new Map<string, { tokens: number; em: number }>();

export function consumirLimite(chave: string, porMinuto: number): number {
  const agora = Date.now();
  const b = baldes.get(chave) ?? { tokens: porMinuto, em: agora };
  b.tokens = Math.min(porMinuto, b.tokens + ((agora - b.em) / 60_000) * porMinuto);
  b.em = agora;
  if (b.tokens < 1) {
    baldes.set(chave, b);
    return ((1 - b.tokens) / porMinuto) * 60;
  }
  b.tokens -= 1;
  baldes.set(chave, b);
  if (baldes.size > 50_000) {
    for (const [k, v] of baldes) if (agora - v.em > 120_000) baldes.delete(k);
  }
  return 0;
}

export function limparLimites() {
  baldes.clear();
}
