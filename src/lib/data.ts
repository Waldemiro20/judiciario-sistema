export const ROLES = ["admin", "advogado", "estagiario"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Advogado Administrador",
  advogado: "Advogado",
  estagiario: "Estagiário",
};

export const AREAS = [
  "Direito Civil",
  "Criminal",
  "Previdenciário",
  "Família",
  "Consumidor",
] as const;
export type Area = (typeof AREAS)[number];

export const STATUS_PROCESSO = ["Ativo", "Aguardando Prazo", "Suspenso", "Arquivado"] as const;
export type ProcessStatus = (typeof STATUS_PROCESSO)[number];

export const RISCOS = ["Provável", "Possível", "Remoto"] as const;
export type Risco = (typeof RISCOS)[number];

export const POLOS = ["Autor", "Réu", "Terceiro"] as const;
export const PRIORIDADES = ["Baixa", "Média", "Alta"] as const;
export const COLUNAS = ["A Fazer", "Em Andamento", "Concluído"] as const;
export const VINCULOS = ["Processo", "Cliente", "Interno"] as const;
export const TIPOS_EVENTO = ["Audiência", "Reunião", "Prazo"] as const;
export const RECORRENCIAS = ["Não repete", "Diária", "Semanal", "Mensal"] as const;
export const TIPOS_CLIENTE = ["Pessoa Física", "Pessoa Jurídica"] as const;
export const STATUS_CLIENTE = ["Ativo", "Inativo"] as const;
export const TIPOS_LANCAMENTO = ["Receber", "Pagar"] as const;
export const MODELOS_COBRANCA = ["Ad Exitum", "Partido (Mensal)", "Por Hora", "Avulso"] as const;
export const SITUACOES_LANCAMENTO = ["Em aberto", "Pago", "Atrasado"] as const;
export const CATEGORIAS_MODELO = ["Contratos", "Peças", "Procurações"] as const;
export const ASSINATURAS = ["Não enviado", "Aguardando assinatura", "Assinado"] as const;
export const ACOES_LOG = [
  "Criou",
  "Editou",
  "Excluiu",
  "Visualizou",
  "Login",
  "Logout",
  "Exportou",
] as const;
export const CLIENTE_INTERNO = "Interno";

export type Movimentacao = {
  id: string;
  autor: string;
  acao: string;
  data: string;
  hora: string;
};

export type Parte = { nome: string; polo: (typeof POLOS)[number] };

export type Processo = {
  id: string;
  numero: string;
  titulo: string;
  cliente: string;
  area: Area;
  status: ProcessStatus;
  vara: string;
  tribunal: string;
  juiz: string;
  parteContraria: string;
  partes: Parte[];
  valorCausa: number;
  fase: string;
  responsavel: string;
  equipe: string[];
  risco: Risco;
  distribuicao: string;
  sigiloso?: boolean;
  versao?: number;
  movimentacoes: Movimentacao[];
};

export type Prioridade = (typeof PRIORIDADES)[number];
export type Coluna = (typeof COLUNAS)[number];

export type Subtarefa = { id: string; texto: string; feita: boolean };
export type Comentario = { id: string; autor: string; texto: string; quando: string };
export type HistoricoItem = { id: string; autor: string; texto: string; quando: string };
export type Apontamento = {
  id: string;
  autor: string;
  minutos: number;
  quando: string;
  nota: string;
};

export type Tarefa = {
  id: string;
  titulo: string;
  descricao: string;
  coluna: Coluna;
  prioridade: Prioridade;
  responsavel: string;
  vinculoTipo: (typeof VINCULOS)[number];
  vinculo: string;
  clienteId?: string | undefined;
  prazo: string;
  subtarefas: Subtarefa[];
  comentarios: Comentario[];
  historico: HistoricoItem[];
  apontamentos: Apontamento[];
  versao?: number;
};

export type TipoEvento = (typeof TIPOS_EVENTO)[number];
export type Recorrencia = (typeof RECORRENCIAS)[number];

export type Evento = {
  id: string;
  titulo: string;
  tipo: TipoEvento;
  data: string;
  hora: string;
  duracaoMin: number;
  advogado: string;
  local: string;
  linkOnline?: string;
  juiz?: string;
  processo?: string;
  cliente?: string;
  testemunhas?: string[];
  lembretes: string[];
  recorrencia: Recorrencia;
  observacoes?: string;
  versao?: number;
};

export type Contato = { id: string; tipo: string; valor: string };
export type Endereco = {
  id: string;
  rotulo: string;
  logradouro: string;
  cidade: string;
  cep: string;
};
export type DocPessoal = {
  id: string;
  nome: string;
  obrigatorio: boolean;
  arquivo?: string;
  enviadoEm?: string;
  enviadoPor?: string;
};

export type Cliente = {
  id: string;
  nome: string;
  tipo: (typeof TIPOS_CLIENTE)[number];
  documento: string;
  documento2: string;
  desde: string;
  status: (typeof STATUS_CLIENTE)[number];
  contatos: Contato[];
  enderecos: Endereco[];
  documentos: DocPessoal[];
  historico: { quando: string; texto: string }[];
  descricaoCaso?: string;
  descricaoCasoEm?: string;
  versao?: number;
};

export type Versao = { id: string; versao: string; autor: string; quando: string; tamanho: string };
export type Documento = {
  id: string;
  nome: string;
  pasta: string;
  processo: string;
  conteudo: string;
  versoes: Versao[];
};

export type Pasta = { id: string; nome: string; confidencial: boolean; acesso: string[] };

export type Lancamento = {
  id: string;
  descricao: string;
  cliente: string;
  clienteId?: string | undefined;
  processo?: string;
  tipo: (typeof TIPOS_LANCAMENTO)[number];
  categoria: string;
  modelo: (typeof MODELOS_COBRANCA)[number];
  valor: number;
  vencimento: string;
  parcela?: string;
  situacao: (typeof SITUACOES_LANCAMENTO)[number];
  valorRecebido?: number;
  versao?: number;
};

export type Modelo = {
  id: string;
  nome: string;
  categoria: (typeof CATEGORIAS_MODELO)[number];
  tags: string[];
  corpo: string;
  atualizado: string;
  versao?: number;
};

export type Contrato = {
  id: string;
  titulo: string;
  cliente: string;
  inicio: string;
  fim: string;
  valor: number;
  assinatura: (typeof ASSINATURAS)[number];
  provedor?: string;
  versao?: number;
};

export type Intimacao = {
  id: string;
  processo: string;
  resumo: string;
  recebida: string;
  prazoDias: number;
  lida: boolean;
  concluida?: boolean;
  versao?: number;
};

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  oab?: string;
  role: Role;
  ativo: boolean;
  ultimoAcesso: string;
};

export type Log = {
  id: string;
  usuario: string;
  acao: (typeof ACOES_LOG)[number];
  modulo: string;
  descricao: string;
  ip: string;
  quando: string;
  resultado: "sucesso" | "negado" | "falha";
};

export type Modulo =
  | "Dashboard"
  | "Processos"
  | "Tarefas"
  | "Agenda"
  | "Audiências"
  | "Clientes"
  | "Documentos"
  | "Financeiro"
  | "Contratos e Peças"
  | "Relatórios"
  | "Configurações";

export const MODULOS: Modulo[] = [
  "Dashboard",
  "Processos",
  "Tarefas",
  "Agenda",
  "Audiências",
  "Clientes",
  "Documentos",
  "Financeiro",
  "Contratos e Peças",
  "Relatórios",
  "Configurações",
];

export const NIVEIS = ["nenhum", "ver", "editar"] as const;
export type Permissao = (typeof NIVEIS)[number];

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const minToH = (m: number) => {
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return hh ? `${hh}h${mm ? String(mm).padStart(2, "0") : ""}` : `${mm}min`;
};

export const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const HOJE = toISO(new Date());

export const fmtDM = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

export const fmtDMY = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const diasAte = (iso: string) =>
  Math.round((parseISO(iso).getTime() - parseISO(HOJE).getTime()) / 86400000);

export const docsPendentes = (c: Cliente) =>
  c.documentos.filter((d) => d.obrigatorio && !d.arquivo);

export const iniciais = (nome: string) =>
  nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

export const uid = () => crypto.randomUUID();

export const agoraCarimbo = () => {
  const n = new Date();
  const dd = String(n.getDate()).padStart(2, "0");
  const mm = String(n.getMonth() + 1).padStart(2, "0");
  const hora = `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
  return { data: `${dd}/${mm}/${n.getFullYear()}`, dataCurta: `${dd}/${mm}`, hora };
};

export const clienteIdDaTarefa = (
  t: Pick<Tarefa, "vinculoTipo" | "vinculo">,
  clientes: Cliente[],
  processos: Processo[],
) => {
  if (t.vinculoTipo === "Cliente") return clientes.find((c) => c.nome === t.vinculo)?.id;
  if (t.vinculoTipo === "Processo") {
    const p = processos.find((x) => x.numero === t.vinculo);
    return p && clientes.find((c) => c.nome === p.cliente)?.id;
  }
  return undefined;
};

export const clienteIdPorNome = (nome: string, clientes: Cliente[]) =>
  clientes.find((c) => c.nome === nome)?.id;

export const recebidoDe = (l: Lancamento) =>
  l.situacao === "Pago" ? l.valor : Math.min(l.valorRecebido ?? 0, l.valor);

export const saldoDe = (l: Lancamento) => Math.max(0, l.valor - recebidoDe(l));

export const fluxoDeCaixa = (lancamentos: Lancamento[], meses = 6) => {
  const nomes = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const hoje = parseISO(HOJE);
  return Array.from({ length: meses }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1 - i), 1);
    const prefixo = toISO(d).slice(0, 7);
    let entradas = 0;
    let saidas = 0;
    for (const l of lancamentos) {
      if (!l.vencimento.startsWith(prefixo)) continue;
      const valor = recebidoDe(l);
      if (l.tipo === "Receber") entradas += valor;
      else saidas += valor;
    }
    return { mes: nomes[d.getMonth()]!, entradas, saidas };
  });
};

export const PERMISSOES_PADRAO: Record<Role, Record<Modulo, Permissao>> = {
  admin: Object.fromEntries(MODULOS.map((m) => [m, "editar"])) as Record<Modulo, Permissao>,
  advogado: {
    Dashboard: "ver",
    Processos: "editar",
    Tarefas: "editar",
    Agenda: "editar",
    Audiências: "editar",
    Clientes: "editar",
    Documentos: "editar",
    Financeiro: "nenhum",
    "Contratos e Peças": "editar",
    Relatórios: "ver",
    Configurações: "nenhum",
  },
  estagiario: {
    Dashboard: "ver",
    Processos: "editar",
    Tarefas: "editar",
    Agenda: "ver",
    Audiências: "ver",
    Clientes: "ver",
    Documentos: "editar",
    Financeiro: "nenhum",
    "Contratos e Peças": "ver",
    Relatórios: "nenhum",
    Configurações: "nenhum",
  },
};
