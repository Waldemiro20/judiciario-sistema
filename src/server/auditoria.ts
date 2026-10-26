import type { ACOES_LOG } from "@/lib/data";
import { db, type Tx } from "./db";
import { log } from "./log";

export type EventoAuditoria = {
  escritorioId?: string | null;
  usuarioId?: string | null;
  usuarioNome: string;
  acao: (typeof ACOES_LOG)[number];
  modulo: string;
  descricao: string;
  recursoTipo?: string;
  recursoId?: string;
  resultado?: "sucesso" | "negado" | "falha";
  ip?: string | undefined;
  requestId?: string;
};

function linha(e: EventoAuditoria) {
  return {
    escritorioId: e.escritorioId ?? null,
    usuarioId: e.usuarioId ?? null,
    usuarioNome: e.usuarioNome.slice(0, 200),
    acao: e.acao,
    modulo: e.modulo.slice(0, 60),
    descricao: e.descricao.slice(0, 500),
    recursoTipo: e.recursoTipo ?? null,
    recursoId: e.recursoId ?? null,
    resultado: e.resultado ?? "sucesso",
    ip: e.ip ?? null,
    requestId: e.requestId ?? null,
  };
}

export async function auditar(e: EventoAuditoria, tx?: Tx) {
  if (tx) {
    await tx.auditoria.create({ data: linha(e) });
    return;
  }
  try {
    await db().auditoria.create({ data: linha(e) });
  } catch (falha) {
    log.error("falha ao gravar auditoria", { falha, acao: e.acao, modulo: e.modulo });
  }
}
