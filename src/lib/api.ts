export type DetalheErro = { campo: string; mensagem: string };

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
    readonly detalhes: DetalheErro[] = [],
  ) {
    super(mensagem);
  }
}

let aoPerderSessao: (() => void) | undefined;

export function quandoPerderSessao(fn: () => void) {
  aoPerderSessao = fn;
}

type Opcoes = {
  corpo?: unknown;
  formulario?: FormData;
  idempotencia?: string;
  silencioso401?: boolean;
};

export async function api<T>(metodo: string, caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (opcoes.formulario) body = opcoes.formulario;
  else if (opcoes.corpo !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opcoes.corpo);
  }
  if (opcoes.idempotencia) headers["Idempotency-Key"] = opcoes.idempotencia;
  let res: Response;
  try {
    res = await fetch(caminho, {
      method: metodo,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      ...(body && { body }),
    });
  } catch {
    throw new ErroApi(
      0,
      "REDE",
      "Sem conexão com o servidor. Verifique a internet e tente de novo.",
    );
  }
  if (res.status === 204) return undefined as T;
  const dados = await res.json().catch(() => undefined);
  if (!res.ok) {
    const e = (
      dados as
        { erro?: { codigo?: string; mensagem?: string; detalhes?: DetalheErro[] } } | undefined
    )?.erro;
    if (res.status === 401 && !opcoes.silencioso401) aoPerderSessao?.();
    throw new ErroApi(
      res.status,
      e?.codigo ?? "ERRO",
      e?.mensagem ?? "Não foi possível concluir a operação.",
      e?.detalhes,
    );
  }
  return dados as T;
}

export function mensagemDe(e: unknown) {
  if (e instanceof ErroApi) {
    const campo = e.detalhes[0];
    return campo && e.codigo === "VALIDACAO" && campo.mensagem !== e.message
      ? `${e.message} ${campo.mensagem}`
      : e.message;
  }
  return "Não foi possível concluir a operação.";
}

type Pagina<T> = { itens: T[]; total: number; pagina: number; porPagina: number };

export async function listarTudo<T>(caminho: string, maxPaginas = 50): Promise<T[]> {
  const itens: T[] = [];
  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const sep = caminho.includes("?") ? "&" : "?";
    const p = await api<Pagina<T>>("GET", `${caminho}${sep}pagina=${pagina}&porPagina=200`);
    itens.push(...p.itens);
    if (itens.length >= p.total || p.itens.length === 0) break;
  }
  return itens;
}

export const novaChave = () => crypto.randomUUID();
