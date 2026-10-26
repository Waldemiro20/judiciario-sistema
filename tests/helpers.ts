import { randomUUID } from "node:crypto";
import type { Role } from "@/lib/data";
import { db } from "@/server/db";
import { gerarHash } from "@/server/auth/senha";
import { criarEscritorioComAdmin } from "@/server/bootstrap";
import { limparLimites } from "@/server/http/rede";
import { POST as loginPost } from "@/app/api/auth/login/route";

export const ORIGEM = "http://localhost:3000";
export const SENHA = "senha-de-teste-forte-123";

type Handler = (req: Request, seg?: { params: Promise<never> }) => Promise<Response>;

export type Chamada = {
  metodo?: string;
  caminho?: string;
  corpo?: unknown;
  cookie?: string;
  params?: Record<string, string>;
  cabecalhos?: Record<string, string>;
  origem?: string | null;
  ip?: string;
};

export async function chamar(handler: unknown, c: Chamada = {}) {
  const metodo = c.metodo ?? (c.corpo === undefined ? "GET" : "POST");
  const headers = new Headers(c.cabecalhos);
  if (c.cookie) headers.set("cookie", c.cookie);
  if (c.origem !== null && !["GET", "HEAD"].includes(metodo))
    headers.set("origin", c.origem ?? ORIGEM);
  headers.set("x-real-ip", c.ip ?? "10.0.0.1");
  let body: BodyInit | undefined;
  if (c.corpo !== undefined) {
    if (c.corpo instanceof FormData) body = c.corpo;
    else {
      body = typeof c.corpo === "string" ? c.corpo : JSON.stringify(c.corpo);
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
    }
  }
  const req = new Request(`${ORIGEM}${c.caminho ?? "/api/teste"}`, {
    method: metodo,
    headers,
    ...(body && { body }),
  });
  const res = await (handler as Handler)(req, {
    params: Promise.resolve((c.params ?? {}) as never),
  });
  const texto = await res.clone().text();
  let json: any;
  try {
    json = texto ? JSON.parse(texto) : undefined;
  } catch {
    json = undefined;
  }
  return { res, status: res.status, json, texto };
}

export function sufixo() {
  return randomUUID().slice(0, 8);
}

export async function novoEscritorio(nome = `Escritório ${sufixo()}`) {
  const s = sufixo();
  const r = await criarEscritorioComAdmin({
    nomeEscritorio: nome,
    sigla: "TS",
    admin: { nome: `Admin ${s}`, email: `admin-${s}@teste.local`, senha: SENHA },
  });
  return { escritorioId: r.escritorio.id, admin: r.admin };
}

export async function novoUsuario(
  escritorioId: string,
  role: Role,
  extra: { ativo?: boolean; deveTrocarSenha?: boolean; nome?: string } = {},
) {
  const s = sufixo();
  return db().usuario.create({
    data: {
      escritorioId,
      nome: extra.nome ?? `${role} ${s}`,
      email: `${role}-${s}@teste.local`,
      role,
      ativo: extra.ativo ?? true,
      deveTrocarSenha: extra.deveTrocarSenha ?? false,
      senhaHash: await gerarHash(SENHA),
    },
  });
}

export async function entrar(email: string, senha = SENHA, ip?: string) {
  limparLimites();
  const r = await chamar(loginPost, { corpo: { email, senha }, ...(ip && { ip }) });
  if (r.status !== 200) throw new Error(`login falhou: ${r.status} ${r.texto}`);
  const setCookie = r.res.headers.get("set-cookie") ?? "";
  return setCookie.split(";")[0]!;
}

export async function cenario() {
  const { escritorioId, admin } = await novoEscritorio();
  const advogado = await novoUsuario(escritorioId, "advogado");
  const estagiario = await novoUsuario(escritorioId, "estagiario");
  return {
    escritorioId,
    admin,
    advogado,
    estagiario,
    cookieAdmin: await entrar(admin.email),
    cookieAdvogado: await entrar(advogado.email),
    cookieEstagiario: await entrar(estagiario.email),
  };
}

export async function novoCliente(escritorioId: string, nome = `Cliente ${sufixo()}`) {
  return db().cliente.create({
    data: {
      escritorioId,
      nome,
      tipo: "Pessoa Física",
      documento: "000.000.000-00",
      desde: "01/2024",
      status: "Ativo",
    },
  });
}
