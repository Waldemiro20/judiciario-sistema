import { config } from "./config";

type Nivel = "debug" | "info" | "warn" | "error";
const ordem: Record<Nivel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const SENSIVEIS =
  /senha|password|token|cookie|authorization|secret|chave|key|cpf|cnpj|documento|conteudo|corpo/i;

function limpar(valor: unknown, profundidade = 0): unknown {
  if (profundidade > 4) return "[...]";
  if (valor instanceof Error) return { nome: valor.name, mensagem: valor.message };
  if (Array.isArray(valor)) return valor.slice(0, 20).map((v) => limpar(v, profundidade + 1));
  if (valor && typeof valor === "object") {
    const saida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor))
      saida[k] = SENSIVEIS.test(k) ? "[REDIGIDO]" : limpar(v, profundidade + 1);
    return saida;
  }
  if (typeof valor === "string" && valor.length > 500) return `${valor.slice(0, 500)}…`;
  return valor;
}

function nivelMinimo(): Nivel {
  try {
    return config().LOG_LEVEL;
  } catch {
    return "info";
  }
}

function escrever(nivel: Nivel, msg: string, campos?: Record<string, unknown>) {
  if (ordem[nivel] < ordem[nivelMinimo()]) return;
  const linha = JSON.stringify({
    nivel,
    msg,
    em: new Date().toISOString(),
    ...(campos && (limpar(campos) as Record<string, unknown>)),
  });
  if (nivel === "error") console.error(linha);
  else if (nivel === "warn") console.warn(linha);
  else console.log(linha);
}

export const log = {
  debug: (msg: string, c?: Record<string, unknown>) => escrever("debug", msg, c),
  info: (msg: string, c?: Record<string, unknown>) => escrever("info", msg, c),
  warn: (msg: string, c?: Record<string, unknown>) => escrever("warn", msg, c),
  error: (msg: string, c?: Record<string, unknown>) => escrever("error", msg, c),
};
