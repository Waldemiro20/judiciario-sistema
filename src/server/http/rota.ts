import { randomUUID } from "node:crypto";
import type { Modulo, Permissao } from "@/lib/data";
import { Prisma } from "@/generated/prisma/client";
import { config, ConfiguracaoInvalida } from "../config";
import { log } from "../log";
import type { Tx } from "../db";
import { auditar, type EventoAuditoria } from "../auditoria";
import { tokenDaRequisicao, validarSessao, type UsuarioSessao } from "../auth/sessao";
import { exigir, permissoesDe, type MapaPermissoes } from "../authz/permissoes";
import { consumirLimite, ipDe, origemPermitida, userAgentDe } from "./rede";
import { erro, ErroApi } from "./erros";

const SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

export type ContextoBase = {
  req: Request;
  requestId: string;
  ip: string | undefined;
  userAgent: string | undefined;
};

export type Contexto = ContextoBase & {
  usuario: UsuarioSessao;
  sessaoId: string;
  permissoes: MapaPermissoes;
  auditar: (e: EventoCtx) => Promise<void>;
  auditarTx: (tx: Tx, e: EventoCtx) => Promise<void>;
  meta: () => Omit<EventoAuditoria, "acao" | "modulo" | "descricao">;
};

type EventoCtx = Omit<
  EventoAuditoria,
  "escritorioId" | "usuarioId" | "usuarioNome" | "ip" | "requestId"
>;

type Segmento<P> = { params: Promise<P> };

type OpcoesBase = { limitePorMinuto?: number };
type Opcoes = OpcoesBase & {
  modulo?: Modulo;
  nivel?: Exclude<Permissao, "nenhum">;
  permitirSenhaExpirada?: boolean;
};

export const json = (dados: unknown, status = 200) => Response.json(dados, { status });
export const semConteudo = () => new Response(null, { status: 204 });

function acaoDoMetodo(m: string): EventoAuditoria["acao"] {
  if (m === "POST") return "Criou";
  if (m === "DELETE") return "Excluiu";
  if (m === "PATCH" || m === "PUT") return "Editou";
  return "Visualizou";
}

function respostaDeErro(e: unknown, requestId: string): Response {
  let api: ErroApi;
  if (e instanceof ErroApi) api = e;
  else if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
    api = erro.conflito("Já existe um registro com esses dados.");
  else if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")
    api = erro.naoEncontrado();
  else if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003")
    api = erro.conflito("Registro vinculado a outro registro inexistente ou em uso.");
  else if (e instanceof ConfiguracaoInvalida) {
    log.error("configuração inválida", { mensagem: e.message, requestId });
    api = new ErroApi(503, "INDISPONIVEL", "Serviço temporariamente indisponível.");
  } else {
    log.error("erro inesperado", { erro: e, requestId });
    api = new ErroApi(
      500,
      "ERRO_INTERNO",
      "Erro interno. Informe o código da requisição ao suporte.",
    );
  }
  return new Response(
    JSON.stringify({
      erro: {
        codigo: api.codigo,
        mensagem: api.message,
        ...(api.detalhes && { detalhes: api.detalhes }),
        requestId,
      },
    }),
    { status: api.status, headers: { "Content-Type": "application/json", ...api.cabecalhos } },
  );
}

function finalizar(res: Response, requestId: string, inicio: number, req: Request) {
  const h = res.headers;
  h.set("X-Request-Id", requestId);
  if (!h.has("Cache-Control")) h.set("Cache-Control", "no-store");
  h.set("X-Content-Type-Options", "nosniff");
  log.info("requisição", {
    requestId,
    metodo: req.method,
    caminho: new URL(req.url).pathname,
    status: res.status,
    ms: Date.now() - inicio,
  });
  return res;
}

async function executar<P>(
  req: Request,
  segmento: Segmento<P> | undefined,
  opcoes: OpcoesBase,
  corpo: (base: ContextoBase, params: P) => Promise<Response>,
) {
  const inicio = Date.now();
  const requestId = randomUUID();
  let res: Response;
  try {
    const c = config();
    const base: ContextoBase = { req, requestId, ip: ipDe(req), userAgent: userAgentDe(req) };
    const espera = consumirLimite(
      `api:${base.ip ?? "local"}`,
      opcoes.limitePorMinuto ?? c.API_LIMITE_POR_MINUTO,
    );
    if (espera > 0) throw erro.limite(espera);
    if (!SEGUROS.has(req.method) && !origemPermitida(req)) throw erro.origem();
    const params = segmento ? await segmento.params : ({} as P);
    res = await corpo(base, params);
  } catch (e) {
    res = respostaDeErro(e, requestId);
  }
  return finalizar(res, requestId, inicio, req);
}

export function rotaPublica<P = Record<string, never>>(
  opcoes: OpcoesBase,
  fn: (ctx: ContextoBase, params: P) => Promise<Response>,
) {
  return (req: Request, segmento?: Segmento<P>) => executar(req, segmento, opcoes, fn);
}

export function rota<P = Record<string, never>>(
  opcoes: Opcoes,
  fn: (ctx: Contexto, params: P) => Promise<Response>,
) {
  return (req: Request, segmento?: Segmento<P>) =>
    executar(req, segmento, opcoes, async (base, params) => {
      const token = tokenDaRequisicao(req);
      const sessao = token ? await validarSessao(token) : null;
      if (!sessao) throw erro.naoAutenticado();
      const { usuario, sessaoId } = sessao;
      const meta = () => ({
        escritorioId: usuario.escritorioId,
        usuarioId: usuario.id,
        usuarioNome: usuario.nome,
        ip: base.ip,
        requestId: base.requestId,
      });
      const permissoes = await permissoesDe(usuario);
      const ctx: Contexto = {
        ...base,
        usuario,
        sessaoId,
        permissoes,
        meta,
        auditar: (e) => auditar({ ...meta(), ...e }),
        auditarTx: (tx, e) => auditar({ ...meta(), ...e }, tx),
      };
      try {
        if (usuario.deveTrocarSenha && !opcoes.permitirSenhaExpirada) throw erro.senhaExpirada();
        if (opcoes.modulo) exigir(permissoes, opcoes.modulo, opcoes.nivel ?? "ver");
        return await fn(ctx, params);
      } catch (e) {
        if (e instanceof ErroApi && e.codigo === "PROIBIDO")
          await ctx.auditar({
            acao: acaoDoMetodo(req.method),
            modulo: opcoes.modulo ?? "Sistema",
            descricao: `Acesso negado: ${req.method} ${new URL(req.url).pathname}`,
            resultado: "negado",
          });
        throw e;
      }
    });
}
