/*
 * Dados fictícios para validação das telas (somente front-end).
 * Nenhuma informação aqui é persistida — tudo vive em memória no navegador.
 * "Hoje" no protótipo é terça-feira, 09/04/2024.
 */

export const HOJE = "2024-04-09";

export type Role = "admin" | "advogado" | "estagiario";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Advogado Administrador",
  advogado: "Advogado",
  estagiario: "Estagiário",
};

export type Area = "Direito Civil" | "Criminal" | "Previdenciário" | "Família" | "Consumidor";
export const AREAS: Area[] = [
  "Direito Civil",
  "Criminal",
  "Previdenciário",
  "Família",
  "Consumidor",
];

export type ProcessStatus = "Ativo" | "Suspenso" | "Aguardando Prazo" | "Arquivado";
export const STATUS_PROCESSO: ProcessStatus[] = [
  "Ativo",
  "Aguardando Prazo",
  "Suspenso",
  "Arquivado",
];

export type Risco = "Provável" | "Possível" | "Remoto";

export type Movimentacao = {
  id: string;
  autor: string;
  acao: string;
  data: string; // dd/MM/yyyy
  hora: string; // HH:mm
};

export type Parte = { nome: string; polo: "Autor" | "Réu" | "Terceiro" };

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
  movimentacoes: Movimentacao[];
};

export type Prioridade = "Baixa" | "Média" | "Alta";
export type Coluna = "A Fazer" | "Em Andamento" | "Concluído";
export const COLUNAS: Coluna[] = ["A Fazer", "Em Andamento", "Concluído"];

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
  vinculoTipo: "Processo" | "Cliente" | "Interno";
  vinculo: string;
  prazo: string; // yyyy-MM-dd
  subtarefas: Subtarefa[];
  comentarios: Comentario[];
  historico: HistoricoItem[];
  apontamentos: Apontamento[];
};

export type TipoEvento = "Audiência" | "Reunião" | "Prazo";
export type Recorrencia = "Não repete" | "Diária" | "Semanal" | "Mensal";

export type Evento = {
  id: string;
  titulo: string;
  tipo: TipoEvento;
  data: string; // yyyy-MM-dd
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
  tipo: "Pessoa Física" | "Pessoa Jurídica";
  documento: string; // CPF ou CNPJ
  documento2: string; // RG ou Inscrição Estadual
  desde: string;
  status: "Ativo" | "Inativo";
  contatos: Contato[];
  enderecos: Endereco[];
  documentos: DocPessoal[];
  historico: { quando: string; texto: string }[];
};

export type Versao = { versao: string; autor: string; quando: string; tamanho: string };
export type Documento = {
  id: string;
  nome: string;
  pasta: string;
  processo: string;
  conteudo: string; // texto extraído (simula OCR para a busca)
  versoes: Versao[];
};

export type Pasta = { nome: string; confidencial: boolean; acesso: string[] };

export type Lancamento = {
  id: string;
  descricao: string;
  cliente: string;
  processo?: string;
  tipo: "Receber" | "Pagar";
  categoria: string;
  modelo: "Ad Exitum" | "Partido (Mensal)" | "Por Hora" | "Avulso";
  valor: number;
  vencimento: string; // yyyy-MM-dd
  parcela?: string; // "2/12"
  situacao: "Em aberto" | "Pago" | "Atrasado";
};

export type Modelo = {
  id: string;
  nome: string;
  categoria: "Contratos" | "Peças" | "Procurações";
  tags: string[];
  corpo: string;
  atualizado: string;
};

export type Contrato = {
  id: string;
  titulo: string;
  cliente: string;
  inicio: string;
  fim: string; // yyyy-MM-dd
  valor: number;
  assinatura: "Não enviado" | "Aguardando assinatura" | "Assinado";
  provedor?: string;
};

export type Intimacao = {
  id: string;
  processo: string;
  resumo: string;
  recebida: string; // dd/MM às HH:mm
  prazoDias: number;
  lida: boolean;
  concluida?: boolean;
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
  acao: "Criou" | "Editou" | "Excluiu" | "Visualizou" | "Login" | "Exportou";
  modulo: string;
  descricao: string;
  ip: string;
  quando: string; // dd/MM/yyyy HH:mm
};

/* ------------------------------------------------------------------ */

export const USUARIOS: Usuario[] = [
  {
    id: "u1",
    nome: "Helena Voss",
    email: "helena@lacerdavoss.adv.br",
    oab: "OAB/SP 214.558",
    role: "admin",
    ativo: true,
    ultimoAcesso: "09/04/2024 08:12",
  },
  {
    id: "u2",
    nome: "Diego Lacerda",
    email: "diego@lacerdavoss.adv.br",
    oab: "OAB/SP 198.330",
    role: "admin",
    ativo: true,
    ultimoAcesso: "09/04/2024 07:58",
  },
  {
    id: "u3",
    nome: "Camila Rocha",
    email: "camila@lacerdavoss.adv.br",
    oab: "OAB/SP 301.442",
    role: "advogado",
    ativo: true,
    ultimoAcesso: "08/04/2024 19:20",
  },
  {
    id: "u4",
    nome: "Marcos Tavares",
    email: "marcos@lacerdavoss.adv.br",
    oab: "OAB/SP 288.019",
    role: "advogado",
    ativo: true,
    ultimoAcesso: "08/04/2024 18:02",
  },
  {
    id: "u5",
    nome: "Felipe Andrade",
    email: "felipe@lacerdavoss.adv.br",
    oab: "OAB/SP 250.771",
    role: "advogado",
    ativo: true,
    ultimoAcesso: "05/04/2024 17:40",
  },
  {
    id: "u6",
    nome: "Jordy Peixoto",
    email: "jordy@lacerdavoss.adv.br",
    role: "estagiario",
    ativo: true,
    ultimoAcesso: "09/04/2024 08:05",
  },
];

export const EQUIPE = USUARIOS.map((u) => u.nome);

/** Perfis que podem ser simulados no seletor "Ver como" do topo. */
export const PERFIS_DEMO: { nome: string; role: Role }[] = [
  { nome: "Helena Voss", role: "admin" },
  { nome: "Camila Rocha", role: "advogado" },
  { nome: "Jordy Peixoto", role: "estagiario" },
];

export const processosIniciais: Processo[] = [
  {
    id: "p1",
    numero: "0721456-88.2024.8.26.0100",
    titulo: "Ação de Cobrança — Meridiano Log.",
    cliente: "Meridiano Logística Ltda.",
    area: "Direito Civil",
    status: "Ativo",
    vara: "3ª Vara Cível",
    tribunal: "TJSP",
    juiz: "Dr. Roberto Salgado",
    parteContraria: "Transportes Aurora S.A.",
    partes: [
      { nome: "Meridiano Logística Ltda.", polo: "Autor" },
      { nome: "Transportes Aurora S.A.", polo: "Réu" },
    ],
    valorCausa: 482000,
    fase: "Instrução",
    responsavel: "Helena Voss",
    equipe: ["Helena Voss", "Diego Lacerda", "Jordy Peixoto"],
    risco: "Provável",
    distribuicao: "12/02/2024",
    movimentacoes: [
      {
        id: "m1",
        autor: "Diego Lacerda",
        acao: "juntou documento (contrato assinado)",
        data: "23/03/2024",
        hora: "14:10",
      },
      {
        id: "m2",
        autor: "Jordy Peixoto",
        acao: "informou ao cliente a data da perícia",
        data: "25/03/2024",
        hora: "09:30",
      },
      {
        id: "m3",
        autor: "Helena Voss",
        acao: "protocolou petição de réplica",
        data: "02/04/2024",
        hora: "17:45",
      },
    ],
  },
  {
    id: "p2",
    numero: "1003882-15.2024.8.26.0007",
    titulo: "Indenização por Danos Morais — Grupo Atlas",
    cliente: "Grupo Atlas Participações",
    area: "Direito Civil",
    status: "Aguardando Prazo",
    vara: "7ª Vara Cível",
    tribunal: "TJSP",
    juiz: "Dra. Ana Beltrão",
    parteContraria: "Sérgio Nunes de Almeida",
    partes: [
      { nome: "Sérgio Nunes de Almeida", polo: "Autor" },
      { nome: "Grupo Atlas Participações", polo: "Réu" },
    ],
    valorCausa: 156000,
    fase: "Contestação",
    responsavel: "Camila Rocha",
    equipe: ["Camila Rocha", "Jordy Peixoto"],
    risco: "Possível",
    distribuicao: "04/03/2024",
    movimentacoes: [
      {
        id: "m4",
        autor: "Camila Rocha",
        acao: "cadastrou o processo no sistema",
        data: "12/03/2024",
        hora: "08:20",
      },
      {
        id: "m5",
        autor: "Jordy Peixoto",
        acao: "juntou documentos societários do cliente",
        data: "18/03/2024",
        hora: "11:05",
      },
      {
        id: "m5b",
        autor: "Camila Rocha",
        acao: "registrou intimação para contestar (prazo 15 dias)",
        data: "08/04/2024",
        hora: "10:02",
      },
    ],
  },
  {
    id: "p3",
    numero: "5001245-70.2023.4.03.6100",
    titulo: "Aposentadoria por Tempo de Contribuição",
    cliente: "Sebastião Ferreira",
    area: "Previdenciário",
    status: "Ativo",
    vara: "2ª Vara Previdenciária",
    tribunal: "TRF-3",
    juiz: "Dr. Elias Monteiro",
    parteContraria: "INSS",
    partes: [
      { nome: "Sebastião Ferreira", polo: "Autor" },
      { nome: "INSS", polo: "Réu" },
    ],
    valorCausa: 98400,
    fase: "Perícia designada",
    responsavel: "Marcos Tavares",
    equipe: ["Marcos Tavares", "Jordy Peixoto"],
    risco: "Remoto",
    distribuicao: "20/09/2023",
    movimentacoes: [
      {
        id: "m6",
        autor: "Marcos Tavares",
        acao: "solicitou CNIS atualizado",
        data: "05/03/2024",
        hora: "10:00",
      },
      {
        id: "m7",
        autor: "Diego Lacerda",
        acao: "juntou laudo médico complementar",
        data: "09/03/2024",
        hora: "16:32",
      },
      {
        id: "m7b",
        autor: "Jordy Peixoto",
        acao: "informou ao cliente a data da perícia (23/04)",
        data: "04/04/2024",
        hora: "15:12",
      },
    ],
  },
  {
    id: "p4",
    numero: "0009987-44.2024.8.26.0050",
    titulo: "Ação Penal — Estelionato",
    cliente: "Rafael Queiroz",
    area: "Criminal",
    status: "Suspenso",
    vara: "1ª Vara Criminal",
    tribunal: "TJSP",
    juiz: "Dr. Paulo Vasques",
    parteContraria: "Ministério Público Estadual",
    partes: [
      { nome: "Ministério Público Estadual", polo: "Autor" },
      { nome: "Rafael Queiroz", polo: "Réu" },
    ],
    valorCausa: 0,
    fase: "Suspensão condicional",
    responsavel: "Felipe Andrade",
    equipe: ["Felipe Andrade", "Helena Voss"],
    risco: "Possível",
    distribuicao: "15/01/2024",
    movimentacoes: [
      {
        id: "m8",
        autor: "Felipe Andrade",
        acao: "registrou audiência de suspensão condicional",
        data: "02/02/2024",
        hora: "13:15",
      },
    ],
  },
  {
    id: "p5",
    numero: "1004551-09.2024.8.26.0011",
    titulo: "Divórcio Litigioso e Partilha",
    cliente: "Beatriz Camargo",
    area: "Família",
    status: "Ativo",
    vara: "4ª Vara de Família",
    tribunal: "TJSP",
    juiz: "Dra. Lúcia Prado",
    parteContraria: "Henrique Camargo",
    partes: [
      { nome: "Beatriz Camargo", polo: "Autor" },
      { nome: "Henrique Camargo", polo: "Réu" },
    ],
    valorCausa: 1250000,
    fase: "Audiência de conciliação",
    responsavel: "Helena Voss",
    equipe: ["Helena Voss", "Camila Rocha"],
    risco: "Possível",
    distribuicao: "28/02/2024",
    movimentacoes: [
      {
        id: "m9",
        autor: "Helena Voss",
        acao: "protocolou pedido de tutela de urgência",
        data: "14/03/2024",
        hora: "09:48",
      },
      {
        id: "m10",
        autor: "Camila Rocha",
        acao: "atualizou a fase processual",
        data: "21/03/2024",
        hora: "15:02",
      },
    ],
  },
  {
    id: "p6",
    numero: "0033120-62.2023.8.26.0100",
    titulo: "Reparação por Vício do Produto",
    cliente: "Nara Belmonte",
    area: "Consumidor",
    status: "Arquivado",
    vara: "6ª Vara Cível",
    tribunal: "TJSP",
    juiz: "Dr. Ivan Costa",
    parteContraria: "Eletro Vega Comércio",
    partes: [
      { nome: "Nara Belmonte", polo: "Autor" },
      { nome: "Eletro Vega Comércio", polo: "Réu" },
    ],
    valorCausa: 21500,
    fase: "Trânsito em julgado",
    responsavel: "Jordy Peixoto",
    equipe: ["Jordy Peixoto", "Camila Rocha"],
    risco: "Remoto",
    distribuicao: "10/05/2023",
    movimentacoes: [
      {
        id: "m11",
        autor: "Jordy Peixoto",
        acao: "arquivou o processo após trânsito em julgado",
        data: "30/01/2024",
        hora: "11:40",
      },
    ],
  },
  {
    id: "p7",
    numero: "1007733-28.2024.8.26.0100",
    titulo: "Rescisão de Contrato de Parceria",
    cliente: "Solaris Energia S.A.",
    area: "Direito Civil",
    status: "Ativo",
    vara: "12ª Vara Cível",
    tribunal: "TJSP",
    juiz: "Dr. Otávio Rangel",
    parteContraria: "Vento Norte Holding",
    partes: [
      { nome: "Solaris Energia S.A.", polo: "Autor" },
      { nome: "Vento Norte Holding", polo: "Réu" },
    ],
    valorCausa: 3400000,
    fase: "Alegações finais",
    responsavel: "Felipe Andrade",
    equipe: ["Felipe Andrade", "Helena Voss", "Diego Lacerda"],
    risco: "Provável",
    distribuicao: "08/01/2024",
    movimentacoes: [
      {
        id: "m12",
        autor: "Felipe Andrade",
        acao: "protocolou memoriais",
        data: "19/03/2024",
        hora: "18:22",
      },
    ],
  },
  {
    id: "p8",
    numero: "0012377-91.2024.8.26.0003",
    titulo: "Revisional de Alimentos",
    cliente: "Lívia Martins",
    area: "Família",
    status: "Ativo",
    vara: "2ª Vara de Família",
    tribunal: "TJSP",
    juiz: "Dra. Renata Sá",
    parteContraria: "Paulo Martins",
    partes: [
      { nome: "Lívia Martins", polo: "Autor" },
      { nome: "Paulo Martins", polo: "Réu" },
    ],
    valorCausa: 36000,
    fase: "Inicial",
    responsavel: "Camila Rocha",
    equipe: ["Camila Rocha"],
    risco: "Remoto",
    distribuicao: "01/04/2024",
    movimentacoes: [
      {
        id: "m13",
        autor: "Camila Rocha",
        acao: "distribuiu a petição inicial",
        data: "01/04/2024",
        hora: "16:40",
      },
    ],
  },
];

const h = (id: string, autor: string, texto: string, quando: string): HistoricoItem => ({
  id,
  autor,
  texto,
  quando,
});

export const tarefasIniciais: Tarefa[] = [
  {
    id: "t1",
    titulo: "Revisar parecer sobre cláusula penal",
    descricao: "Conferir jurisprudência recente do STJ antes de enviar ao cliente.",
    coluna: "Concluído",
    prioridade: "Média",
    responsavel: "Helena Voss",
    vinculoTipo: "Cliente",
    vinculo: "Solaris Energia S.A.",
    prazo: "2024-04-08",
    subtarefas: [{ id: "s1", texto: "Conferir jurisprudência", feita: true }],
    comentarios: [
      {
        id: "c1",
        autor: "Diego Lacerda",
        texto: "Parecer conferido, sem ressalvas.",
        quando: "08/04 às 16:20",
      },
    ],
    historico: [
      h("h1", "Diego Lacerda", "criou a tarefa e atribuiu a Helena Voss", "03/04 às 09:00"),
      h("h2", "Helena Voss", "moveu para Concluído", "08/04 às 17:05"),
    ],
    apontamentos: [
      {
        id: "a1",
        autor: "Helena Voss",
        minutos: 95,
        quando: "08/04 às 17:00",
        nota: "Revisão completa",
      },
    ],
  },
  {
    id: "t2",
    titulo: "Assinar procuração — Grupo Atlas",
    descricao: "",
    coluna: "Concluído",
    prioridade: "Baixa",
    responsavel: "Helena Voss",
    vinculoTipo: "Cliente",
    vinculo: "Grupo Atlas Participações",
    prazo: "2024-04-08",
    subtarefas: [],
    comentarios: [],
    historico: [h("h3", "Camila Rocha", "criou a tarefa", "05/04 às 10:00")],
    apontamentos: [
      { id: "a2", autor: "Helena Voss", minutos: 20, quando: "08/04 às 11:30", nota: "" },
    ],
  },
  {
    id: "t3",
    titulo: "Preparar minuta de contestação",
    descricao:
      "Contestação da ação de danos morais movida contra o Grupo Atlas. Prazo final em 10/04.",
    coluna: "Em Andamento",
    prioridade: "Alta",
    responsavel: "Helena Voss",
    vinculoTipo: "Processo",
    vinculo: "1003882-15.2024.8.26.0007",
    prazo: "2024-04-10",
    subtarefas: [
      { id: "s2", texto: "Levantar preliminares", feita: true },
      { id: "s3", texto: "Redigir mérito", feita: false },
      { id: "s4", texto: "Revisar com a Camila", feita: false },
    ],
    comentarios: [
      {
        id: "c2",
        autor: "Camila Rocha",
        texto: "Já separei os documentos societários na pasta Provas.",
        quando: "08/04 às 10:12",
      },
    ],
    historico: [
      h("h4", "Camila Rocha", "criou a tarefa a partir da intimação", "08/04 às 10:05"),
      h("h5", "Helena Voss", "moveu para Em Andamento", "08/04 às 14:30"),
    ],
    apontamentos: [
      {
        id: "a3",
        autor: "Helena Voss",
        minutos: 140,
        quando: "08/04 às 18:10",
        nota: "Preliminares",
      },
    ],
  },
  {
    id: "t4",
    titulo: "Cobrar contrato social atualizado — Meridiano",
    descricao: "Documento obrigatório pendente no cadastro do cliente.",
    coluna: "A Fazer",
    prioridade: "Média",
    responsavel: "Helena Voss",
    vinculoTipo: "Cliente",
    vinculo: "Meridiano Logística Ltda.",
    prazo: "2024-04-11",
    subtarefas: [{ id: "s5", texto: "Enviar e-mail ao jurídico do cliente", feita: false }],
    comentarios: [],
    historico: [h("h6", "Helena Voss", "criou a tarefa", "07/04 às 09:15")],
    apontamentos: [],
  },
  {
    id: "t5",
    titulo: "Reunião de alinhamento — time cível",
    descricao: "",
    coluna: "A Fazer",
    prioridade: "Baixa",
    responsavel: "Helena Voss",
    vinculoTipo: "Interno",
    vinculo: "Interno",
    prazo: "2024-04-12",
    subtarefas: [],
    comentarios: [],
    historico: [h("h7", "Helena Voss", "criou a tarefa", "02/04 às 12:00")],
    apontamentos: [],
  },
  {
    id: "t6",
    titulo: "Protocolar réplica complementar",
    descricao: "",
    coluna: "Em Andamento",
    prioridade: "Alta",
    responsavel: "Diego Lacerda",
    vinculoTipo: "Processo",
    vinculo: "0721456-88.2024.8.26.0100",
    prazo: "2024-04-09",
    subtarefas: [
      { id: "s6", texto: "Conferir documentos", feita: true },
      { id: "s7", texto: "Anexar comprovantes", feita: false },
    ],
    comentarios: [],
    historico: [
      h("h8", "Helena Voss", "criou a tarefa e atribuiu a Diego Lacerda", "04/04 às 08:40"),
    ],
    apontamentos: [
      { id: "a4", autor: "Diego Lacerda", minutos: 210, quando: "08/04 às 19:00", nota: "" },
    ],
  },
  {
    id: "t7",
    titulo: "Informar cliente sobre data da perícia",
    descricao:
      "Perícia médica no INSS em 23/04 às 08:40. Confirmar que o cliente levará os exames.",
    coluna: "A Fazer",
    prioridade: "Média",
    responsavel: "Jordy Peixoto",
    vinculoTipo: "Processo",
    vinculo: "5001245-70.2023.4.03.6100",
    prazo: "2024-04-15",
    subtarefas: [
      { id: "s8", texto: "Ligar para o cliente", feita: false },
      { id: "s9", texto: "Registrar no processo", feita: false },
    ],
    comentarios: [],
    historico: [
      h("h9", "Marcos Tavares", "criou a tarefa e atribuiu a Jordy Peixoto", "04/04 às 15:00"),
    ],
    apontamentos: [
      { id: "a5", autor: "Jordy Peixoto", minutos: 45, quando: "05/04 às 10:00", nota: "" },
    ],
  },
  {
    id: "t8",
    titulo: "Elaborar acordo de partilha",
    descricao: "",
    coluna: "A Fazer",
    prioridade: "Alta",
    responsavel: "Camila Rocha",
    vinculoTipo: "Processo",
    vinculo: "1004551-09.2024.8.26.0011",
    prazo: "2024-04-05",
    subtarefas: [],
    comentarios: [],
    historico: [
      h("h10", "Helena Voss", "criou a tarefa e atribuiu a Camila Rocha", "01/04 às 09:00"),
    ],
    apontamentos: [],
  },
  {
    id: "t9",
    titulo: "Arquivar autos findos do 1º trimestre",
    descricao: "",
    coluna: "Concluído",
    prioridade: "Baixa",
    responsavel: "Jordy Peixoto",
    vinculoTipo: "Interno",
    vinculo: "Interno",
    prazo: "2024-04-05",
    subtarefas: [],
    comentarios: [],
    historico: [h("h11", "Jordy Peixoto", "moveu para Concluído", "05/04 às 17:30")],
    apontamentos: [
      { id: "a6", autor: "Jordy Peixoto", minutos: 60, quando: "05/04 às 17:30", nota: "" },
    ],
  },
  {
    id: "t10",
    titulo: "Juntar comprovante de residência atualizado",
    descricao: "",
    coluna: "A Fazer",
    prioridade: "Média",
    responsavel: "Jordy Peixoto",
    vinculoTipo: "Cliente",
    vinculo: "Rafael Queiroz",
    prazo: "2024-04-09",
    subtarefas: [],
    comentarios: [],
    historico: [
      h("h12", "Felipe Andrade", "criou a tarefa e atribuiu a Jordy Peixoto", "06/04 às 11:00"),
    ],
    apontamentos: [],
  },
];

export const eventosIniciais: Evento[] = [
  {
    id: "e1",
    titulo: "Audiência de instrução — Ação de Cobrança",
    tipo: "Audiência",
    data: "2024-04-09",
    hora: "14:30",
    duracaoMin: 90,
    advogado: "Helena Voss",
    local: "Fórum João Mendes Jr. · Sala 402",
    juiz: "Dr. Roberto Salgado",
    processo: "0721456-88.2024.8.26.0100",
    cliente: "Meridiano Logística Ltda.",
    testemunhas: ["Carlos Menezes (gerente de frota)", "Juliana Prates (financeiro)"],
    lembretes: ["24h antes", "1h antes"],
    recorrencia: "Não repete",
  },
  {
    id: "e2",
    titulo: "Prazo final — Contestação Grupo Atlas",
    tipo: "Prazo",
    data: "2024-04-10",
    hora: "23:59",
    duracaoMin: 0,
    advogado: "Camila Rocha",
    local: "Protocolo eletrônico e-SAJ",
    processo: "1003882-15.2024.8.26.0007",
    cliente: "Grupo Atlas Participações",
    lembretes: ["2 dias antes", "No dia"],
    recorrencia: "Não repete",
  },
  {
    id: "e3",
    titulo: "Audiência de conciliação — Divórcio Camargo",
    tipo: "Audiência",
    data: "2024-04-12",
    hora: "14:00",
    duracaoMin: 60,
    advogado: "Helena Voss",
    local: "Online",
    linkOnline: "https://tjsp.jus.br/sala-virtual/4vf-1182",
    juiz: "Dra. Lúcia Prado",
    processo: "1004551-09.2024.8.26.0011",
    cliente: "Beatriz Camargo",
    testemunhas: [],
    lembretes: ["24h antes", "1h antes"],
    recorrencia: "Não repete",
  },
  {
    id: "e4",
    titulo: "Reunião semanal da equipe",
    tipo: "Reunião",
    data: "2024-04-01",
    hora: "09:00",
    duracaoMin: 45,
    advogado: "Helena Voss",
    local: "Sala de reuniões",
    lembretes: ["15 min antes"],
    recorrencia: "Semanal",
  },
  {
    id: "e5",
    titulo: "Reunião com cliente — Solaris Energia",
    tipo: "Reunião",
    data: "2024-04-18",
    hora: "15:30",
    duracaoMin: 60,
    advogado: "Felipe Andrade",
    local: "Online",
    linkOnline: "https://meet.google.com/sol-arx-221",
    cliente: "Solaris Energia S.A.",
    lembretes: ["1h antes"],
    recorrencia: "Não repete",
  },
  {
    id: "e6",
    titulo: "Perícia médica — INSS",
    tipo: "Audiência",
    data: "2024-04-23",
    hora: "08:40",
    duracaoMin: 60,
    advogado: "Marcos Tavares",
    local: "APS Santo Amaro — Rua Amador Bueno, 474",
    juiz: "Perito: Dr. Álvaro Nunes",
    processo: "5001245-70.2023.4.03.6100",
    cliente: "Sebastião Ferreira",
    testemunhas: [],
    lembretes: ["24h antes", "1h antes"],
    recorrencia: "Não repete",
  },
  {
    id: "e7",
    titulo: "Prazo — Alegações finais Solaris",
    tipo: "Prazo",
    data: "2024-04-16",
    hora: "23:59",
    duracaoMin: 0,
    advogado: "Felipe Andrade",
    local: "Protocolo eletrônico e-SAJ",
    processo: "1007733-28.2024.8.26.0100",
    cliente: "Solaris Energia S.A.",
    lembretes: ["3 dias antes"],
    recorrencia: "Não repete",
  },
  {
    id: "e8",
    titulo: "Audiência preliminar — Revisional de Alimentos",
    tipo: "Audiência",
    data: "2024-04-26",
    hora: "10:00",
    duracaoMin: 60,
    advogado: "Camila Rocha",
    local: "Fórum Regional de Santana · Sala 12",
    juiz: "Dra. Renata Sá",
    processo: "0012377-91.2024.8.26.0003",
    cliente: "Lívia Martins",
    testemunhas: ["Ana Martins (mãe)"],
    lembretes: ["24h antes", "1h antes"],
    recorrencia: "Não repete",
  },
];

const docsPF = (
  enviados: Partial<Record<"rg" | "end" | "proc", [string, string, string]>>,
): DocPessoal[] => [
  {
    id: "rg",
    nome: "RG ou CNH",
    obrigatorio: true,
    ...(enviados.rg && {
      arquivo: enviados.rg[0],
      enviadoEm: enviados.rg[1],
      enviadoPor: enviados.rg[2],
    }),
  },
  {
    id: "end",
    nome: "Comprovante de endereço",
    obrigatorio: true,
    ...(enviados.end && {
      arquivo: enviados.end[0],
      enviadoEm: enviados.end[1],
      enviadoPor: enviados.end[2],
    }),
  },
  {
    id: "proc",
    nome: "Procuração",
    obrigatorio: true,
    ...(enviados.proc && {
      arquivo: enviados.proc[0],
      enviadoEm: enviados.proc[1],
      enviadoPor: enviados.proc[2],
    }),
  },
];

const docsPJ = (
  enviados: Partial<Record<"cs" | "cnpj" | "proc", [string, string, string]>>,
): DocPessoal[] => [
  {
    id: "cs",
    nome: "Contrato social",
    obrigatorio: true,
    ...(enviados.cs && {
      arquivo: enviados.cs[0],
      enviadoEm: enviados.cs[1],
      enviadoPor: enviados.cs[2],
    }),
  },
  {
    id: "cnpj",
    nome: "Cartão CNPJ",
    obrigatorio: true,
    ...(enviados.cnpj && {
      arquivo: enviados.cnpj[0],
      enviadoEm: enviados.cnpj[1],
      enviadoPor: enviados.cnpj[2],
    }),
  },
  {
    id: "proc",
    nome: "Procuração",
    obrigatorio: true,
    ...(enviados.proc && {
      arquivo: enviados.proc[0],
      enviadoEm: enviados.proc[1],
      enviadoPor: enviados.proc[2],
    }),
  },
];

export const clientesIniciais: Cliente[] = [
  {
    id: "c1",
    nome: "Meridiano Logística Ltda.",
    tipo: "Pessoa Jurídica",
    documento: "18.442.907/0001-55",
    documento2: "IE 114.228.990.112",
    desde: "03/2021",
    status: "Ativo",
    contatos: [
      { id: "ct1", tipo: "E-mail", valor: "juridico@meridianolog.com.br" },
      { id: "ct2", tipo: "Telefone", valor: "(11) 3388-2200" },
      { id: "ct3", tipo: "Responsável", valor: "Ricardo Alves (diretor)" },
    ],
    enderecos: [
      {
        id: "en1",
        rotulo: "Sede",
        logradouro: "Av. Marginal Tietê, 1800",
        cidade: "São Paulo/SP",
        cep: "02110-000",
      },
      {
        id: "en2",
        rotulo: "Filial",
        logradouro: "Rod. Anhanguera, km 24",
        cidade: "Cajamar/SP",
        cep: "07750-000",
      },
    ],
    documentos: docsPJ({
      cnpj: ["cartao-cnpj.pdf", "10/03/2021", "Diego Lacerda"],
      proc: ["procuracao-2024.pdf", "12/02/2024", "Helena Voss"],
    }),
    historico: [
      { quando: "02/04 às 17:45", texto: "Réplica protocolada por Helena Voss" },
      { quando: "23/03 às 14:10", texto: "Contrato assinado juntado por Diego Lacerda" },
    ],
  },
  {
    id: "c2",
    nome: "Grupo Atlas Participações",
    tipo: "Pessoa Jurídica",
    documento: "09.771.223/0001-10",
    documento2: "IE 118.009.221.447",
    desde: "08/2019",
    status: "Ativo",
    contatos: [
      { id: "ct4", tipo: "E-mail", valor: "contencioso@grupoatlas.com" },
      { id: "ct5", tipo: "Telefone", valor: "(11) 2299-8800" },
    ],
    enderecos: [
      {
        id: "en3",
        rotulo: "Sede",
        logradouro: "Av. Faria Lima, 3400 — 12º andar",
        cidade: "São Paulo/SP",
        cep: "04538-132",
      },
    ],
    documentos: docsPJ({
      cs: ["contrato-social.pdf", "02/08/2019", "Camila Rocha"],
      cnpj: ["cnpj.pdf", "02/08/2019", "Camila Rocha"],
      proc: ["procuracao.pdf", "18/03/2024", "Jordy Peixoto"],
    }),
    historico: [
      { quando: "18/03 às 11:05", texto: "Documentos societários juntados por Jordy Peixoto" },
    ],
  },
  {
    id: "c3",
    nome: "Sebastião Ferreira",
    tipo: "Pessoa Física",
    documento: "142.558.909-31",
    documento2: "RG 22.418.339-5",
    desde: "01/2023",
    status: "Ativo",
    contatos: [
      { id: "ct6", tipo: "Celular", valor: "(11) 98822-1100" },
      { id: "ct7", tipo: "E-mail", valor: "sebastiao.f@email.com" },
    ],
    enderecos: [
      {
        id: "en4",
        rotulo: "Residencial",
        logradouro: "Rua das Palmeiras, 88",
        cidade: "São Paulo/SP",
        cep: "04750-020",
      },
    ],
    documentos: docsPF({
      rg: ["rg.jpg", "11/01/2023", "Marcos Tavares"],
      end: ["conta-luz.pdf", "11/01/2023", "Marcos Tavares"],
      proc: ["procuracao.pdf", "11/01/2023", "Marcos Tavares"],
    }),
    historico: [
      { quando: "09/03 às 16:32", texto: "Laudo médico complementar juntado por Diego Lacerda" },
    ],
  },
  {
    id: "c4",
    nome: "Rafael Queiroz",
    tipo: "Pessoa Física",
    documento: "330.912.774-08",
    documento2: "RG 41.220.118-X",
    desde: "01/2024",
    status: "Ativo",
    contatos: [{ id: "ct8", tipo: "Celular", valor: "(11) 97733-5522" }],
    enderecos: [
      {
        id: "en5",
        rotulo: "Residencial",
        logradouro: "Rua Augusta, 1520, ap. 34",
        cidade: "São Paulo/SP",
        cep: "01304-001",
      },
    ],
    documentos: docsPF({ rg: ["cnh.pdf", "15/01/2024", "Felipe Andrade"] }),
    historico: [
      { quando: "02/02 às 13:15", texto: "Audiência de suspensão registrada por Felipe Andrade" },
    ],
  },
  {
    id: "c5",
    nome: "Beatriz Camargo",
    tipo: "Pessoa Física",
    documento: "552.104.331-90",
    documento2: "RG 38.771.005-2",
    desde: "02/2024",
    status: "Ativo",
    contatos: [
      { id: "ct9", tipo: "Celular", valor: "(11) 99100-4477" },
      { id: "ct10", tipo: "E-mail", valor: "bia.camargo@email.com" },
    ],
    enderecos: [
      {
        id: "en6",
        rotulo: "Residencial",
        logradouro: "Al. Lorena, 900",
        cidade: "São Paulo/SP",
        cep: "01424-001",
      },
    ],
    documentos: docsPF({
      rg: ["rg.pdf", "28/02/2024", "Helena Voss"],
      end: ["comprovante.pdf", "28/02/2024", "Helena Voss"],
      proc: ["procuracao.pdf", "28/02/2024", "Helena Voss"],
    }),
    historico: [{ quando: "21/03 às 15:02", texto: "Fase processual atualizada por Camila Rocha" }],
  },
  {
    id: "c6",
    nome: "Solaris Energia S.A.",
    tipo: "Pessoa Jurídica",
    documento: "27.004.881/0001-72",
    documento2: "IE 145.330.887.003",
    desde: "02/2018",
    status: "Ativo",
    contatos: [
      { id: "ct11", tipo: "E-mail", valor: "legal@solarisenergia.com" },
      { id: "ct12", tipo: "Telefone", valor: "(11) 3040-9090" },
    ],
    enderecos: [
      {
        id: "en7",
        rotulo: "Sede",
        logradouro: "Rua Funchal, 418",
        cidade: "São Paulo/SP",
        cep: "04551-060",
      },
    ],
    documentos: docsPJ({
      cs: ["contrato-social.pdf", "05/02/2018", "Felipe Andrade"],
      cnpj: ["cnpj.pdf", "05/02/2018", "Felipe Andrade"],
      proc: ["procuracao.pdf", "08/01/2024", "Felipe Andrade"],
    }),
    historico: [{ quando: "19/03 às 18:22", texto: "Memoriais protocolados por Felipe Andrade" }],
  },
  {
    id: "c7",
    nome: "Nara Belmonte",
    tipo: "Pessoa Física",
    documento: "701.338.552-14",
    documento2: "RG 29.114.662-1",
    desde: "05/2023",
    status: "Inativo",
    contatos: [{ id: "ct13", tipo: "E-mail", valor: "nara.belmonte@email.com" }],
    enderecos: [
      {
        id: "en8",
        rotulo: "Residencial",
        logradouro: "Rua Tuiuti, 300",
        cidade: "São Paulo/SP",
        cep: "03081-000",
      },
    ],
    documentos: docsPF({
      rg: ["rg.pdf", "10/05/2023", "Jordy Peixoto"],
      end: ["comprovante.pdf", "10/05/2023", "Jordy Peixoto"],
      proc: ["procuracao.pdf", "10/05/2023", "Jordy Peixoto"],
    }),
    historico: [{ quando: "30/01 às 11:40", texto: "Processo arquivado por Jordy Peixoto" }],
  },
  {
    id: "c8",
    nome: "Lívia Martins",
    tipo: "Pessoa Física",
    documento: "418.990.223-45",
    documento2: "RG 50.118.774-0",
    desde: "03/2024",
    status: "Ativo",
    contatos: [{ id: "ct14", tipo: "Celular", valor: "(11) 95544-8811" }],
    enderecos: [
      {
        id: "en9",
        rotulo: "Residencial",
        logradouro: "Rua Voluntários da Pátria, 2100",
        cidade: "São Paulo/SP",
        cep: "02402-000",
      },
    ],
    documentos: docsPF({
      rg: ["rg.pdf", "25/03/2024", "Camila Rocha"],
      proc: ["procuracao.pdf", "25/03/2024", "Camila Rocha"],
    }),
    historico: [
      { quando: "01/04 às 16:40", texto: "Petição inicial distribuída por Camila Rocha" },
    ],
  },
];

export const pastasIniciais: Pasta[] = [
  { nome: "Petições", confidencial: false, acesso: [] },
  { nome: "Provas", confidencial: false, acesso: [] },
  { nome: "Contratos", confidencial: false, acesso: [] },
  { nome: "Pareceres", confidencial: false, acesso: [] },
  {
    nome: "Estratégia — Confidencial",
    confidencial: true,
    acesso: ["Helena Voss", "Diego Lacerda"],
  },
];

export const documentosIniciais: Documento[] = [
  {
    id: "d1",
    nome: "Petição inicial — Ação de Cobrança.pdf",
    pasta: "Petições",
    processo: "0721456-88.2024.8.26.0100",
    conteudo:
      "excelentíssimo juiz ação de cobrança meridiano logística transportes aurora inadimplemento contrato de frete",
    versoes: [
      { versao: "V1", autor: "Diego Lacerda", quando: "05/02/2024 às 09:10", tamanho: "412 KB" },
      { versao: "V2", autor: "Helena Voss", quando: "08/02/2024 às 15:40", tamanho: "436 KB" },
      { versao: "V3", autor: "Helena Voss", quando: "10/02/2024 às 08:55", tamanho: "441 KB" },
    ],
  },
  {
    id: "d2",
    nome: "Contrato de frete — Meridiano x Aurora.pdf",
    pasta: "Provas",
    processo: "0721456-88.2024.8.26.0100",
    conteudo: "contrato de prestação de serviços de transporte cláusula penal multa rescisória",
    versoes: [
      { versao: "V1", autor: "Diego Lacerda", quando: "23/03/2024 às 14:10", tamanho: "1,2 MB" },
    ],
  },
  {
    id: "d3",
    nome: "Réplica.docx",
    pasta: "Petições",
    processo: "0721456-88.2024.8.26.0100",
    conteudo: "réplica à contestação impugnação preliminar de ilegitimidade",
    versoes: [
      { versao: "V1", autor: "Helena Voss", quando: "30/03/2024 às 11:20", tamanho: "88 KB" },
      { versao: "V2", autor: "Helena Voss", quando: "02/04/2024 às 17:02", tamanho: "92 KB" },
    ],
  },
  {
    id: "d4",
    nome: "Documentos societários — Atlas.pdf",
    pasta: "Provas",
    processo: "1003882-15.2024.8.26.0007",
    conteudo: "ata de assembleia estatuto social grupo atlas participações",
    versoes: [
      { versao: "V1", autor: "Jordy Peixoto", quando: "18/03/2024 às 11:05", tamanho: "2,1 MB" },
    ],
  },
  {
    id: "d5",
    nome: "Laudo médico complementar.pdf",
    pasta: "Provas",
    processo: "5001245-70.2023.4.03.6100",
    conteudo: "laudo médico ortopedia incapacidade laborativa cid m54",
    versoes: [
      { versao: "V1", autor: "Marcos Tavares", quando: "05/03/2024 às 10:00", tamanho: "960 KB" },
      { versao: "V2", autor: "Diego Lacerda", quando: "09/03/2024 às 16:32", tamanho: "1,0 MB" },
    ],
  },
  {
    id: "d6",
    nome: "Acordo de partilha — minuta.docx",
    pasta: "Contratos",
    processo: "1004551-09.2024.8.26.0011",
    conteudo: "acordo de partilha de bens imóvel jardins guarda compartilhada",
    versoes: [
      { versao: "V1", autor: "Camila Rocha", quando: "21/03/2024 às 15:02", tamanho: "96 KB" },
    ],
  },
  {
    id: "d7",
    nome: "Parecer — risco de sucumbência Solaris.pdf",
    pasta: "Pareceres",
    processo: "1007733-28.2024.8.26.0100",
    conteudo: "parecer jurídico risco provável sucumbência rescisão parceria vento norte",
    versoes: [
      { versao: "V1", autor: "Felipe Andrade", quando: "15/03/2024 às 09:00", tamanho: "340 KB" },
    ],
  },
  {
    id: "d8",
    nome: "Estratégia de acordo — Solaris.docx",
    pasta: "Estratégia — Confidencial",
    processo: "1007733-28.2024.8.26.0100",
    conteudo: "proposta de acordo teto de negociação estratégia confidencial",
    versoes: [
      { versao: "V1", autor: "Helena Voss", quando: "20/03/2024 às 19:10", tamanho: "54 KB" },
      { versao: "V2", autor: "Diego Lacerda", quando: "25/03/2024 às 08:30", tamanho: "58 KB" },
    ],
  },
];

export const lancamentosIniciais: Lancamento[] = [
  {
    id: "f1",
    descricao: "Honorários contratuais",
    cliente: "Meridiano Logística Ltda.",
    processo: "0721456-88.2024.8.26.0100",
    tipo: "Receber",
    categoria: "Honorários",
    modelo: "Partido (Mensal)",
    valor: 18500,
    vencimento: "2024-04-15",
    parcela: "4/12",
    situacao: "Em aberto",
  },
  {
    id: "f1b",
    descricao: "Honorários contratuais",
    cliente: "Meridiano Logística Ltda.",
    processo: "0721456-88.2024.8.26.0100",
    tipo: "Receber",
    categoria: "Honorários",
    modelo: "Partido (Mensal)",
    valor: 18500,
    vencimento: "2024-03-15",
    parcela: "3/12",
    situacao: "Pago",
  },
  {
    id: "f2",
    descricao: "Êxito — acordo judicial",
    cliente: "Grupo Atlas Participações",
    processo: "1003882-15.2024.8.26.0007",
    tipo: "Receber",
    categoria: "Honorários",
    modelo: "Ad Exitum",
    valor: 62400,
    vencimento: "2024-04-30",
    situacao: "Em aberto",
  },
  {
    id: "f3",
    descricao: "Horas técnicas — rescisão contratual (38h)",
    cliente: "Solaris Energia S.A.",
    processo: "1007733-28.2024.8.26.0100",
    tipo: "Receber",
    categoria: "Honorários",
    modelo: "Por Hora",
    valor: 45600,
    vencimento: "2024-04-05",
    situacao: "Atrasado",
  },
  {
    id: "f4",
    descricao: "Consultoria mensal",
    cliente: "Solaris Energia S.A.",
    tipo: "Receber",
    categoria: "Honorários",
    modelo: "Partido (Mensal)",
    valor: 12000,
    vencimento: "2024-04-01",
    parcela: "4/12",
    situacao: "Pago",
  },
  {
    id: "f5",
    descricao: "Honorários iniciais — divórcio",
    cliente: "Beatriz Camargo",
    processo: "1004551-09.2024.8.26.0011",
    tipo: "Receber",
    categoria: "Honorários",
    modelo: "Avulso",
    valor: 8000,
    vencimento: "2024-04-20",
    parcela: "2/3",
    situacao: "Em aberto",
  },
  {
    id: "f6",
    descricao: "Custas processuais e preparo",
    cliente: "Beatriz Camargo",
    processo: "1004551-09.2024.8.26.0011",
    tipo: "Pagar",
    categoria: "Custas",
    modelo: "Avulso",
    valor: 3850,
    vencimento: "2024-04-12",
    situacao: "Em aberto",
  },
  {
    id: "f7",
    descricao: "Aluguel do escritório",
    cliente: "Interno",
    tipo: "Pagar",
    categoria: "Despesas fixas",
    modelo: "Avulso",
    valor: 22000,
    vencimento: "2024-04-10",
    situacao: "Em aberto",
  },
  {
    id: "f8",
    descricao: "Perito assistente — laudo contábil",
    cliente: "Meridiano Logística Ltda.",
    processo: "0721456-88.2024.8.26.0100",
    tipo: "Pagar",
    categoria: "Custas",
    modelo: "Avulso",
    valor: 7400,
    vencimento: "2024-04-20",
    situacao: "Em aberto",
  },
  {
    id: "f9",
    descricao: "Diligência — cópias e certidões",
    cliente: "Meridiano Logística Ltda.",
    processo: "0721456-88.2024.8.26.0100",
    tipo: "Pagar",
    categoria: "Custas",
    modelo: "Avulso",
    valor: 640,
    vencimento: "2024-03-28",
    situacao: "Pago",
  },
  {
    id: "f10",
    descricao: "Honorários de sucumbência",
    cliente: "Nara Belmonte",
    processo: "0033120-62.2023.8.26.0100",
    tipo: "Receber",
    categoria: "Honorários",
    modelo: "Ad Exitum",
    valor: 9800,
    vencimento: "2024-04-02",
    situacao: "Pago",
  },
  {
    id: "f11",
    descricao: "Software e assinaturas",
    cliente: "Interno",
    tipo: "Pagar",
    categoria: "Despesas fixas",
    modelo: "Avulso",
    valor: 1900,
    vencimento: "2024-04-05",
    situacao: "Pago",
  },
];

export const fluxoCaixa = [
  { mes: "Nov", entradas: 148000, saidas: 96000 },
  { mes: "Dez", entradas: 192000, saidas: 104000 },
  { mes: "Jan", entradas: 121000, saidas: 88000 },
  { mes: "Fev", entradas: 167000, saidas: 99000 },
  { mes: "Mar", entradas: 203000, saidas: 112000 },
  { mes: "Abr", entradas: 88000, saidas: 61000 },
];

export const modelosIniciais: Modelo[] = [
  {
    id: "mo1",
    nome: "Contrato de Honorários Ad Exitum",
    categoria: "Contratos",
    tags: ["{NOME_DO_CLIENTE}", "{CPF_CNPJ}", "{PERCENTUAL_EXITO}"],
    corpo:
      "CONTRATO DE HONORÁRIOS ADVOCATÍCIOS\n\nCONTRATANTE: {NOME_DO_CLIENTE}, inscrito(a) sob o nº {CPF_CNPJ}.\nCONTRATADO: Lacerda & Voss Sociedade de Advogados.\n\nCláusula 1ª — O contratante pagará, a título de honorários de êxito, o percentual de {PERCENTUAL_EXITO} sobre o proveito econômico obtido.",
    atualizado: "12/03/2024",
  },
  {
    id: "mo2",
    nome: "Procuração Ad Judicia et Extra",
    categoria: "Procurações",
    tags: ["{NOME_DO_CLIENTE}", "{CPF_CNPJ}", "{ENDERECO}"],
    corpo:
      "PROCURAÇÃO AD JUDICIA ET EXTRA\n\nOUTORGANTE: {NOME_DO_CLIENTE}, inscrito(a) sob o nº {CPF_CNPJ}, com endereço em {ENDERECO}.\n\nOUTORGADOS: os advogados da sociedade Lacerda & Voss, a quem confere amplos poderes para o foro em geral.",
    atualizado: "02/01/2024",
  },
  {
    id: "mo3",
    nome: "Petição de Juntada de Documentos",
    categoria: "Peças",
    tags: ["{VARA}", "{NUMERO_PROCESSO}", "{NOME_DO_CLIENTE}"],
    corpo:
      "EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DE DIREITO DA {VARA}\n\nProcesso nº {NUMERO_PROCESSO}\n\n{NOME_DO_CLIENTE}, já qualificado(a) nos autos, vem, respeitosamente, requerer a juntada dos documentos anexos.\n\nTermos em que pede deferimento.",
    atualizado: "20/02/2024",
  },
  {
    id: "mo4",
    nome: "Contestação — Modelo Base Cível",
    categoria: "Peças",
    tags: ["{VARA}", "{NUMERO_PROCESSO}", "{NOME_DO_CLIENTE}", "{PARTE_CONTRARIA}"],
    corpo:
      "EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DE DIREITO DA {VARA}\n\nProcesso nº {NUMERO_PROCESSO}\n\n{NOME_DO_CLIENTE} vem apresentar CONTESTAÇÃO à ação proposta por {PARTE_CONTRARIA}, pelos fatos e fundamentos a seguir expostos.",
    atualizado: "08/04/2024",
  },
  {
    id: "mo5",
    nome: "Contrato de Honorários — Partido Mensal",
    categoria: "Contratos",
    tags: ["{NOME_DO_CLIENTE}", "{CPF_CNPJ}", "{VALOR_MENSAL}"],
    corpo:
      "CONTRATO DE PRESTAÇÃO DE SERVIÇOS JURÍDICOS (PARTIDO)\n\nCONTRATANTE: {NOME_DO_CLIENTE}, nº {CPF_CNPJ}.\n\nCláusula 1ª — Pelos serviços de assessoria contínua, o contratante pagará o valor mensal de {VALOR_MENSAL}.",
    atualizado: "15/01/2024",
  },
];

export const contratosIniciais: Contrato[] = [
  {
    id: "ct1",
    titulo: "Honorários — Partido mensal",
    cliente: "Solaris Energia S.A.",
    inicio: "2023-05-01",
    fim: "2024-04-30",
    valor: 144000,
    assinatura: "Assinado",
    provedor: "ZapSign",
  },
  {
    id: "ct2",
    titulo: "Honorários — Ação de Cobrança",
    cliente: "Meridiano Logística Ltda.",
    inicio: "2024-01-15",
    fim: "2024-12-15",
    valor: 222000,
    assinatura: "Assinado",
    provedor: "DocuSign",
  },
  {
    id: "ct3",
    titulo: "Honorários Ad Exitum — Divórcio",
    cliente: "Beatriz Camargo",
    inicio: "2024-02-28",
    fim: "2025-02-28",
    valor: 24000,
    assinatura: "Aguardando assinatura",
    provedor: "ZapSign",
  },
  {
    id: "ct4",
    titulo: "Honorários — Revisional de Alimentos",
    cliente: "Lívia Martins",
    inicio: "2024-03-25",
    fim: "2024-09-25",
    valor: 6000,
    assinatura: "Não enviado",
  },
  {
    id: "ct5",
    titulo: "Consultoria societária",
    cliente: "Grupo Atlas Participações",
    inicio: "2023-04-20",
    fim: "2024-04-20",
    valor: 96000,
    assinatura: "Assinado",
    provedor: "DocuSign",
  },
];

export const intimacoesIniciais: Intimacao[] = [
  {
    id: "i1",
    processo: "1003882-15.2024.8.26.0007",
    resumo: "Intimação para apresentar contestação no prazo legal.",
    recebida: "08/04 às 07:30",
    prazoDias: 2,
    lida: true,
  },
  {
    id: "i2",
    processo: "0721456-88.2024.8.26.0100",
    resumo: "Designada audiência de instrução para 09/04 às 14:30.",
    recebida: "09/04 às 06:45",
    prazoDias: 0,
    lida: false,
  },
  {
    id: "i3",
    processo: "1007733-28.2024.8.26.0100",
    resumo: "Abertura de prazo para alegações finais (5 dias).",
    recebida: "09/04 às 06:45",
    prazoDias: 7,
    lida: false,
  },
];

export const logsIniciais: Log[] = [
  {
    id: "l1",
    usuario: "Helena Voss",
    acao: "Login",
    modulo: "Sistema",
    descricao: "Acesso ao sistema",
    ip: "189.44.12.30",
    quando: "09/04/2024 08:12",
  },
  {
    id: "l2",
    usuario: "Jordy Peixoto",
    acao: "Login",
    modulo: "Sistema",
    descricao: "Acesso ao sistema",
    ip: "177.90.4.112",
    quando: "09/04/2024 08:05",
  },
  {
    id: "l3",
    usuario: "Camila Rocha",
    acao: "Criou",
    modulo: "Tarefas",
    descricao: 'Criou a tarefa "Preparar minuta de contestação"',
    ip: "189.44.12.31",
    quando: "08/04/2024 10:05",
  },
  {
    id: "l4",
    usuario: "Camila Rocha",
    acao: "Editou",
    modulo: "Processos",
    descricao: "Alterou status de 1003882-15 para Aguardando Prazo",
    ip: "189.44.12.31",
    quando: "08/04/2024 10:02",
  },
  {
    id: "l5",
    usuario: "Helena Voss",
    acao: "Visualizou",
    modulo: "Financeiro",
    descricao: "Consultou contas a receber",
    ip: "189.44.12.30",
    quando: "08/04/2024 09:40",
  },
  {
    id: "l6",
    usuario: "Jordy Peixoto",
    acao: "Editou",
    modulo: "Processos",
    descricao: "Registrou movimentação em 5001245-70",
    ip: "177.90.4.112",
    quando: "04/04/2024 15:12",
  },
  {
    id: "l7",
    usuario: "Helena Voss",
    acao: "Criou",
    modulo: "Documentos",
    descricao: "Enviou Réplica.docx (V2)",
    ip: "189.44.12.30",
    quando: "02/04/2024 17:02",
  },
  {
    id: "l8",
    usuario: "Diego Lacerda",
    acao: "Excluiu",
    modulo: "Agenda",
    descricao: "Removeu compromisso duplicado",
    ip: "201.17.88.4",
    quando: "01/04/2024 18:20",
  },
  {
    id: "l9",
    usuario: "Diego Lacerda",
    acao: "Exportou",
    modulo: "Relatórios",
    descricao: "Exportou relatório financeiro de março (PDF)",
    ip: "201.17.88.4",
    quando: "01/04/2024 09:00",
  },
];

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

export type Permissao = "nenhum" | "ver" | "editar";

export const permissoesIniciais: Record<Role, Record<Modulo, Permissao>> = {
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

/* ------------------------------ helpers ------------------------------ */

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const minToH = (m: number) => {
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return hh ? `${hh}h${mm ? String(mm).padStart(2, "0") : ""}` : `${mm}min`;
};

/** "2024-04-09" -> Date local (sem fuso). */
export const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 2024, (m ?? 1) - 1, d ?? 1);
};

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "2024-04-09" -> "09/04" */
export const fmtDM = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

/** "2024-04-09" -> "09/04/2024" */
export const fmtDMY = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/** Dias entre HOJE e a data (negativo = atrasado). */
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

export const uid = () => Math.random().toString(36).slice(2, 9);

/** Carimbo de data/hora simulado: dia de hoje do protótipo + hora real do navegador. */
export const agoraCarimbo = () => {
  const n = new Date();
  const hora = `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
  return { data: "09/04/2024", dataCurta: "09/04", hora };
};
