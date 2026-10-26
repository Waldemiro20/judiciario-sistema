export type CodigoErro =
  | "VALIDACAO"
  | "NAO_AUTENTICADO"
  | "SENHA_EXPIRADA"
  | "PROIBIDO"
  | "ORIGEM_INVALIDA"
  | "NAO_ENCONTRADO"
  | "CONFLITO"
  | "VERSAO_DESATUALIZADA"
  | "MUITAS_REQUISICOES"
  | "CORPO_GRANDE"
  | "TIPO_NAO_SUPORTADO"
  | "INDISPONIVEL"
  | "ERRO_INTERNO";

export type Detalhe = { campo: string; mensagem: string };

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: CodigoErro,
    mensagem: string,
    readonly detalhes?: Detalhe[],
    readonly cabecalhos?: Record<string, string>,
  ) {
    super(mensagem);
  }
}

export const erro = {
  validacao: (mensagem = "Dados inválidos.", detalhes?: Detalhe[]) =>
    new ErroApi(422, "VALIDACAO", mensagem, detalhes),
  naoAutenticado: () => new ErroApi(401, "NAO_AUTENTICADO", "Sessão inválida ou expirada."),
  senhaExpirada: () => new ErroApi(403, "SENHA_EXPIRADA", "Defina uma nova senha para continuar."),
  proibido: (mensagem = "Você não tem permissão para esta ação.") =>
    new ErroApi(403, "PROIBIDO", mensagem),
  origem: () => new ErroApi(403, "ORIGEM_INVALIDA", "Origem da requisição não autorizada."),
  naoEncontrado: (mensagem = "Registro não encontrado.") =>
    new ErroApi(404, "NAO_ENCONTRADO", mensagem),
  conflito: (mensagem = "Conflito com um registro existente.") =>
    new ErroApi(409, "CONFLITO", mensagem),
  versao: () =>
    new ErroApi(
      409,
      "VERSAO_DESATUALIZADA",
      "Este registro foi alterado por outra pessoa. Recarregue e tente de novo.",
    ),
  limite: (segundos: number) =>
    new ErroApi(
      429,
      "MUITAS_REQUISICOES",
      "Muitas tentativas. Aguarde e tente novamente.",
      undefined,
      {
        "Retry-After": String(Math.max(1, Math.ceil(segundos))),
      },
    ),
  corpoGrande: () => new ErroApi(413, "CORPO_GRANDE", "Requisição grande demais."),
  tipo: (mensagem = "Tipo de conteúdo não suportado.") =>
    new ErroApi(415, "TIPO_NAO_SUPORTADO", mensagem),
};
