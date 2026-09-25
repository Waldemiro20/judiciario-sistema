export type Role = "socio" | "colaborador";

export type Area =
  | "Direito Civil"
  | "Criminal"
  | "Previdenciário"
  | "Família"
  | "Consumidor";

export type ProcessStatus = "Ativo" | "Suspenso" | "Arquivado";

export type Movimentacao = {
  id: string;
  autor: string;
  acao: string;
  data: string; // dd/MM
  hora: string; // HH:mm
};

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
  valorCausa: number;
  fase: string;
  equipe: string[];
  risco: "Provável" | "Possível" | "Remoto";
  movimentacoes: Movimentacao[];
};

export type Prioridade = "Baixa" | "Média" | "Alta";
export type Coluna = "A Fazer" | "Em Andamento" | "Concluído";

export type Subtarefa = { id: string; texto: string; feita: boolean };
export type Comentario = { id: string; autor: string; texto: string; quando: string };

export type Tarefa = {
  id: string;
  titulo: string;
  coluna: Coluna;
  prioridade: Prioridade;
  responsavel: string;
  vinculo: string;
  prazo: string;
  minutos: number;
  daSemana: boolean;
  subtarefas: Subtarefa[];
  comentarios: Comentario[];
};

export type Evento = {
  id: string;
  titulo: string;
  tipo: "Audiência" | "Reunião" | "Prazo";
  dia: number; // dia do mês (abril)
  hora: string;
  advogado: string;
  local: string;
  linkOnline?: string;
  juiz?: string;
  lembrete: string;
  urgencia: "critico" | "hoje" | "proximo" | "agendado";
};

export type Cliente = {
  id: string;
  nome: string;
  tipo: "Pessoa Física" | "Pessoa Jurídica";
  documento: string;
  email: string;
  telefone: string;
  desde: string;
  pendencia?: string;
  processos: string[];
  historico: { quando: string; texto: string }[];
};

export type Versao = { versao: string; autor: string; quando: string; tamanho: string };
export type Documento = {
  id: string;
  nome: string;
  pasta: "Petições" | "Provas" | "Contratos";
  processo: string;
  versoes: Versao[];
};

export type Lancamento = {
  id: string;
  descricao: string;
  cliente: string;
  tipo: "Receber" | "Pagar";
  modelo: "Ad Exitum" | "Mensalidade" | "Por Hora";
  valor: number;
  vencimento: string;
  situacao: "Em aberto" | "Pago" | "Atrasado";
};

export type Modelo = {
  id: string;
  nome: string;
  categoria: string;
  tags: string[];
  corpo: string;
};

export const USUARIO_ATUAL = "Helena Voss";

export const EQUIPE = [
  "Helena Voss",
  "Diego Lacerda",
  "Jordy Peixoto",
  "Camila Rocha",
  "Marcos Tavares",
  "Felipe Andrade",
];

export const processos: Processo[] = [
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
    valorCausa: 482000,
    fase: "Instrução",
    equipe: ["Helena Voss", "Diego Lacerda"],
    risco: "Provável",
    movimentacoes: [
      { id: "m1", autor: "Diego Lacerda", acao: "juntou documento (contrato assinado)", data: "23/07", hora: "14:10" },
      { id: "m2", autor: "Jordy Peixoto", acao: "informou a data da perícia", data: "24/07", hora: "09:30" },
      { id: "m3", autor: "Helena Voss", acao: "protocolou petição de réplica", data: "26/07", hora: "17:45" },
    ],
  },
  {
    id: "p2",
    numero: "1003882-15.2024.5.02.0007",
    titulo: "Reclamação Trabalhista — Grupo Atlas",
    cliente: "Grupo Atlas Participações",
    area: "Direito Civil",
    status: "Ativo",
    vara: "7ª Vara do Trabalho",
    tribunal: "TRT-2",
    juiz: "Dra. Ana Beltrão",
    parteContraria: "Sérgio Nunes de Almeida",
    valorCausa: 156000,
    fase: "Contestação",
    equipe: ["Camila Rocha", "Jordy Peixoto"],
    risco: "Possível",
    movimentacoes: [
      { id: "m4", autor: "Camila Rocha", acao: "abriu o processo no sistema", data: "12/07", hora: "08:20" },
      { id: "m5", autor: "Jordy Peixoto", acao: "anexou cartão de ponto do reclamante", data: "18/07", hora: "11:05" },
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
    valorCausa: 98400,
    fase: "Perícia designada",
    equipe: ["Marcos Tavares"],
    risco: "Provável",
    movimentacoes: [
      { id: "m6", autor: "Marcos Tavares", acao: "solicitou CNIS atualizado", data: "05/07", hora: "10:00" },
      { id: "m7", autor: "Diego Lacerda", acao: "juntou laudo médico complementar", data: "09/07", hora: "16:32" },
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
    valorCausa: 0,
    fase: "Suspensão condicional",
    equipe: ["Felipe Andrade", "Helena Voss"],
    risco: "Possível",
    movimentacoes: [
      { id: "m8", autor: "Felipe Andrade", acao: "registrou audiência de suspensão", data: "02/06", hora: "13:15" },
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
    valorCausa: 1250000,
    fase: "Audiência de conciliação",
    equipe: ["Helena Voss", "Camila Rocha"],
    risco: "Possível",
    movimentacoes: [
      { id: "m9", autor: "Helena Voss", acao: "protocolou pedido de tutela de urgência", data: "14/07", hora: "09:48" },
      { id: "m10", autor: "Camila Rocha", acao: "atualizou a fase processual", data: "21/07", hora: "15:02" },
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
    valorCausa: 21500,
    fase: "Trânsito em julgado",
    equipe: ["Jordy Peixoto"],
    risco: "Remoto",
    movimentacoes: [
      { id: "m11", autor: "Jordy Peixoto", acao: "arquivou o processo após trânsito em julgado", data: "30/05", hora: "11:40" },
    ],
  },
  {
    id: "p7",
    numero: "1007733-28.2024.8.26.0100",
    titulo: "Arbitragem — Contrato de Parceria",
    cliente: "Solaris Energia S.A.",
    area: "Direito Civil",
    status: "Ativo",
    vara: "Câmara CAMARB",
    tribunal: "Arbitral",
    juiz: "Tribunal Arbitral (3 árbitros)",
    parteContraria: "Vento Norte Holding",
    valorCausa: 3400000,
    fase: "Alegações finais",
    equipe: ["Felipe Andrade", "Helena Voss", "Diego Lacerda"],
    risco: "Provável",
    movimentacoes: [
      { id: "m12", autor: "Felipe Andrade", acao: "enviou memoriais às partes", data: "19/07", hora: "18:22" },
    ],
  },
];

export const tarefasIniciais: Tarefa[] = [
  {
    id: "t1",
    titulo: "Revisar parecer tributário",
    coluna: "Concluído",
    prioridade: "Média",
    responsavel: "Helena Voss",
    vinculo: "Solaris Energia S.A.",
    prazo: "07/04",
    minutos: 95,
    daSemana: true,
    subtarefas: [{ id: "s1", texto: "Conferir jurisprudência", feita: true }],
    comentarios: [{ id: "c1", autor: "Diego Lacerda", texto: "Parecer conferido, sem ressalvas.", quando: "07/04 às 16:20" }],
  },
  {
    id: "t2",
    titulo: "Assinar procuração — Grupo Atlas",
    coluna: "Concluído",
    prioridade: "Baixa",
    responsavel: "Helena Voss",
    vinculo: "Grupo Atlas Participações",
    prazo: "08/04",
    minutos: 20,
    daSemana: true,
    subtarefas: [],
    comentarios: [],
  },
  {
    id: "t3",
    titulo: "Preparar minuta de contestação",
    coluna: "Em Andamento",
    prioridade: "Alta",
    responsavel: "Helena Voss",
    vinculo: "1003882-15.2024.5.02.0007",
    prazo: "09/04",
    minutos: 140,
    daSemana: true,
    subtarefas: [
      { id: "s2", texto: "Levantar preliminares", feita: true },
      { id: "s3", texto: "Redigir mérito", feita: false },
      { id: "s4", texto: "Revisar com a Camila", feita: false },
    ],
    comentarios: [
      { id: "c2", autor: "Camila Rocha", texto: "Já separei os cartões de ponto na pasta Provas.", quando: "08/04 às 10:12" },
    ],
  },
  {
    id: "t4",
    titulo: "Atualizar cadastro do cliente Meridiano",
    coluna: "A Fazer",
    prioridade: "Média",
    responsavel: "Helena Voss",
    vinculo: "Meridiano Logística Ltda.",
    prazo: "11/04",
    minutos: 0,
    daSemana: true,
    subtarefas: [{ id: "s5", texto: "Solicitar contrato social atualizado", feita: false }],
    comentarios: [],
  },
  {
    id: "t5",
    titulo: "Reunião de alinhamento — time cível",
    coluna: "A Fazer",
    prioridade: "Baixa",
    responsavel: "Helena Voss",
    vinculo: "Interno",
    prazo: "12/04",
    minutos: 0,
    daSemana: true,
    subtarefas: [],
    comentarios: [],
  },
  {
    id: "t6",
    titulo: "Protocolar recurso de apelação",
    coluna: "Em Andamento",
    prioridade: "Alta",
    responsavel: "Diego Lacerda",
    vinculo: "0721456-88.2024.8.26.0100",
    prazo: "10/04",
    minutos: 210,
    daSemana: false,
    subtarefas: [
      { id: "s6", texto: "Conferir preparo", feita: true },
      { id: "s7", texto: "Anexar guia paga", feita: false },
    ],
    comentarios: [],
  },
  {
    id: "t7",
    titulo: "Organizar provas da perícia",
    coluna: "A Fazer",
    prioridade: "Média",
    responsavel: "Jordy Peixoto",
    vinculo: "5001245-70.2023.4.03.6100",
    prazo: "15/04",
    minutos: 45,
    daSemana: false,
    subtarefas: [],
    comentarios: [],
  },
  {
    id: "t8",
    titulo: "Elaborar acordo de partilha",
    coluna: "A Fazer",
    prioridade: "Alta",
    responsavel: "Camila Rocha",
    vinculo: "1004551-09.2024.8.26.0011",
    prazo: "17/04",
    minutos: 0,
    daSemana: false,
    subtarefas: [],
    comentarios: [],
  },
  {
    id: "t9",
    titulo: "Arquivar autos findos do 1º trimestre",
    coluna: "Concluído",
    prioridade: "Baixa",
    responsavel: "Jordy Peixoto",
    vinculo: "Interno",
    prazo: "05/04",
    minutos: 60,
    daSemana: false,
    subtarefas: [],
    comentarios: [],
  },
];

export const eventos: Evento[] = [
  {
    id: "e1",
    titulo: "Audiência de conciliação — Ação de Cobrança",
    tipo: "Audiência",
    dia: 9,
    hora: "09:30",
    advogado: "Marcos Tavares",
    local: "Fórum João Mendes · Sala 402",
    juiz: "Dr. Roberto Salgado",
    lembrete: "1 dia antes",
    urgencia: "critico",
  },
  {
    id: "e2",
    titulo: "Prazo de contestação — Reclamação Trabalhista",
    tipo: "Prazo",
    dia: 10,
    hora: "18:00",
    advogado: "Camila Rocha",
    local: "Protocolo eletrônico PJe",
    lembrete: "2 dias antes",
    urgencia: "hoje",
  },
  {
    id: "e3",
    titulo: "Sessão de arbitragem — Contrato de Parceria",
    tipo: "Audiência",
    dia: 12,
    hora: "14:00",
    advogado: "Felipe Andrade",
    local: "Câmara CAMARB",
    linkOnline: "https://meet.google.com/arb-camarb",
    juiz: "Tribunal Arbitral",
    lembrete: "1 semana antes",
    urgencia: "proximo",
  },
  {
    id: "e4",
    titulo: "Interlocutória — Tutela de Urgência",
    tipo: "Audiência",
    dia: 16,
    hora: "10:00",
    advogado: "Marcos Tavares",
    local: "1ª Vara Cível",
    juiz: "Dra. Lúcia Prado",
    lembrete: "3 dias antes",
    urgencia: "agendado",
  },
  {
    id: "e5",
    titulo: "Reunião com cliente — Solaris Energia",
    tipo: "Reunião",
    dia: 18,
    hora: "15:30",
    advogado: "Helena Voss",
    local: "Online",
    linkOnline: "https://teams.microsoft.com/l/solaris",
    lembrete: "1 hora antes",
    urgencia: "agendado",
  },
  {
    id: "e6",
    titulo: "Perícia médica — INSS",
    tipo: "Audiência",
    dia: 23,
    hora: "08:40",
    advogado: "Marcos Tavares",
    local: "APS Santo Amaro",
    lembrete: "2 dias antes",
    urgencia: "agendado",
  },
];

export const clientes: Cliente[] = [
  {
    id: "c1",
    nome: "Meridiano Logística Ltda.",
    tipo: "Pessoa Jurídica",
    documento: "18.442.907/0001-55",
    email: "juridico@meridianolog.com.br",
    telefone: "(11) 3388-2200",
    desde: "03/2021",
    pendencia: "Documentação Pendente",
    processos: ["0721456-88.2024.8.26.0100"],
    historico: [
      { quando: "26/07 às 17:45", texto: "Réplica protocolada por Helena Voss" },
      { quando: "23/07 às 14:10", texto: "Contrato assinado juntado por Diego Lacerda" },
    ],
  },
  {
    id: "c2",
    nome: "Grupo Atlas Participações",
    tipo: "Pessoa Jurídica",
    documento: "09.771.223/0001-10",
    email: "contencioso@grupoatlas.com",
    telefone: "(11) 2299-8800",
    desde: "08/2019",
    processos: ["1003882-15.2024.5.02.0007"],
    historico: [{ quando: "18/07 às 11:05", texto: "Cartão de ponto anexado por Jordy Peixoto" }],
  },
  {
    id: "c3",
    nome: "Sebastião Ferreira",
    tipo: "Pessoa Física",
    documento: "142.558.909-31",
    email: "sebastiao.f@email.com",
    telefone: "(11) 98822-1100",
    desde: "01/2023",
    processos: ["5001245-70.2023.4.03.6100"],
    historico: [{ quando: "09/07 às 16:32", texto: "Laudo médico complementar juntado por Diego Lacerda" }],
  },
  {
    id: "c4",
    nome: "Rafael Queiroz",
    tipo: "Pessoa Física",
    documento: "330.912.774-08",
    email: "rafael.q@email.com",
    telefone: "(11) 97733-5522",
    desde: "05/2024",
    pendencia: "Documentação Pendente",
    processos: ["0009987-44.2024.8.26.0050"],
    historico: [{ quando: "02/06 às 13:15", texto: "Audiência de suspensão registrada por Felipe Andrade" }],
  },
  {
    id: "c5",
    nome: "Beatriz Camargo",
    tipo: "Pessoa Física",
    documento: "552.104.331-90",
    email: "bia.camargo@email.com",
    telefone: "(11) 99100-4477",
    desde: "11/2023",
    processos: ["1004551-09.2024.8.26.0011"],
    historico: [{ quando: "21/07 às 15:02", texto: "Fase processual atualizada por Camila Rocha" }],
  },
  {
    id: "c6",
    nome: "Solaris Energia S.A.",
    tipo: "Pessoa Jurídica",
    documento: "27.004.881/0001-72",
    email: "legal@solarisenergia.com",
    telefone: "(11) 3040-9090",
    desde: "02/2018",
    processos: ["1007733-28.2024.8.26.0100"],
    historico: [{ quando: "19/07 às 18:22", texto: "Memoriais enviados por Felipe Andrade" }],
  },
  {
    id: "c7",
    nome: "Nara Belmonte",
    tipo: "Pessoa Física",
    documento: "701.338.552-14",
    email: "nara.belmonte@email.com",
    telefone: "(11) 96655-3311",
    desde: "09/2022",
    processos: ["0033120-62.2023.8.26.0100"],
    historico: [{ quando: "30/05 às 11:40", texto: "Processo arquivado por Jordy Peixoto" }],
  },
];

export const documentosIniciais: Documento[] = [
  {
    id: "d1",
    nome: "Petição inicial — Ação de Cobrança.pdf",
    pasta: "Petições",
    processo: "0721456-88.2024.8.26.0100",
    versoes: [
      { versao: "V1", autor: "Diego Lacerda", quando: "12/06 às 09:10", tamanho: "412 KB" },
      { versao: "V2", autor: "Helena Voss", quando: "14/06 às 15:40", tamanho: "436 KB" },
      { versao: "V3", autor: "Helena Voss", quando: "18/06 às 08:55", tamanho: "441 KB" },
    ],
  },
  {
    id: "d2",
    nome: "Contrato de prestação — Meridiano.docx",
    pasta: "Contratos",
    processo: "0721456-88.2024.8.26.0100",
    versoes: [
      { versao: "V1", autor: "Camila Rocha", quando: "02/03 às 11:20", tamanho: "180 KB" },
      { versao: "V2", autor: "Camila Rocha", quando: "05/03 às 17:02", tamanho: "188 KB" },
    ],
  },
  {
    id: "d3",
    nome: "Cartões de ponto — reclamante.pdf",
    pasta: "Provas",
    processo: "1003882-15.2024.5.02.0007",
    versoes: [{ versao: "V1", autor: "Jordy Peixoto", quando: "18/07 às 11:05", tamanho: "2,1 MB" }],
  },
  {
    id: "d4",
    nome: "Laudo médico complementar.pdf",
    pasta: "Provas",
    processo: "5001245-70.2023.4.03.6100",
    versoes: [
      { versao: "V1", autor: "Marcos Tavares", quando: "05/07 às 10:00", tamanho: "960 KB" },
      { versao: "V2", autor: "Diego Lacerda", quando: "09/07 às 16:32", tamanho: "1,0 MB" },
    ],
  },
  {
    id: "d5",
    nome: "Acordo de partilha — minuta.docx",
    pasta: "Petições",
    processo: "1004551-09.2024.8.26.0011",
    versoes: [{ versao: "V1", autor: "Camila Rocha", quando: "21/07 às 15:02", tamanho: "96 KB" }],
  },
  {
    id: "d6",
    nome: "Contrato de parceria — Solaris.pdf",
    pasta: "Contratos",
    processo: "1007733-28.2024.8.26.0100",
    versoes: [
      { versao: "V1", autor: "Felipe Andrade", quando: "10/01 às 09:00", tamanho: "3,4 MB" },
      { versao: "V2", autor: "Felipe Andrade", quando: "22/02 às 14:15", tamanho: "3,5 MB" },
    ],
  },
];

export const lancamentos: Lancamento[] = [
  { id: "f1", descricao: "Honorários contratuais — 2ª parcela", cliente: "Meridiano Logística Ltda.", tipo: "Receber", modelo: "Mensalidade", valor: 18500, vencimento: "15/04", situacao: "Em aberto" },
  { id: "f2", descricao: "Êxito — acordo trabalhista", cliente: "Grupo Atlas Participações", tipo: "Receber", modelo: "Ad Exitum", valor: 62400, vencimento: "30/04", situacao: "Em aberto" },
  { id: "f3", descricao: "Horas técnicas — arbitragem (38h)", cliente: "Solaris Energia S.A.", tipo: "Receber", modelo: "Por Hora", valor: 45600, vencimento: "05/04", situacao: "Atrasado" },
  { id: "f4", descricao: "Consultoria mensal", cliente: "Solaris Energia S.A.", tipo: "Receber", modelo: "Mensalidade", valor: 12000, vencimento: "01/04", situacao: "Pago" },
  { id: "f5", descricao: "Custas processuais e preparo", cliente: "Beatriz Camargo", tipo: "Pagar", modelo: "Por Hora", valor: 3850, vencimento: "12/04", situacao: "Em aberto" },
  { id: "f6", descricao: "Aluguel do escritório", cliente: "Interno", tipo: "Pagar", modelo: "Mensalidade", valor: 22000, vencimento: "10/04", situacao: "Em aberto" },
  { id: "f7", descricao: "Perito técnico — laudo contábil", cliente: "Interno", tipo: "Pagar", modelo: "Por Hora", valor: 7400, vencimento: "20/04", situacao: "Em aberto" },
  { id: "f8", descricao: "Honorários de sucumbência recebidos", cliente: "Nara Belmonte", tipo: "Receber", modelo: "Ad Exitum", valor: 9800, vencimento: "02/04", situacao: "Pago" },
];

export const fluxoCaixa = [
  { mes: "Nov", entradas: 148000, saidas: 96000 },
  { mes: "Dez", entradas: 192000, saidas: 104000 },
  { mes: "Jan", entradas: 121000, saidas: 88000 },
  { mes: "Fev", entradas: 167000, saidas: 99000 },
  { mes: "Mar", entradas: 203000, saidas: 112000 },
  { mes: "Abr", entradas: 88000, saidas: 61000 },
];

export const modelos: Modelo[] = [
  {
    id: "mo1",
    nome: "Contrato de Honorários Ad Exitum",
    categoria: "Contratos",
    tags: ["{NOME_DO_CLIENTE}", "{CPF}", "{PERCENTUAL_EXITO}"],
    corpo:
      "CONTRATO DE HONORÁRIOS ADVOCATÍCIOS\n\nContratante: {NOME_DO_CLIENTE}, inscrito(a) no CPF sob o nº {CPF}.\n\nO contratante pagará, a título de honorários de êxito, o percentual de {PERCENTUAL_EXITO} sobre o proveito econômico obtido.",
  },
  {
    id: "mo2",
    nome: "Procuração Ad Judicia",
    categoria: "Peças",
    tags: ["{NOME_DO_CLIENTE}", "{CPF}", "{ENDERECO}"],
    corpo:
      "PROCURAÇÃO AD JUDICIA ET EXTRA\n\nOutorgante: {NOME_DO_CLIENTE}, CPF {CPF}, residente em {ENDERECO}, nomeia e constitui seus bastantes procuradores os advogados do escritório Lacerda & Voss.",
  },
  {
    id: "mo3",
    nome: "Petição de Juntada de Documentos",
    categoria: "Peças",
    tags: ["{NUMERO_PROCESSO}", "{VARA}", "{NOME_DO_CLIENTE}"],
    corpo:
      "EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DE DIREITO DA {VARA}\n\nProcesso nº {NUMERO_PROCESSO}\n\n{NOME_DO_CLIENTE}, já qualificado(a) nos autos, vem respeitosamente à presença de Vossa Excelência requerer a juntada dos documentos anexos.",
  },
  {
    id: "mo4",
    nome: "Contestação Trabalhista — Modelo Base",
    categoria: "Peças",
    tags: ["{NUMERO_PROCESSO}", "{NOME_DO_CLIENTE}", "{PARTE_CONTRARIA}"],
    corpo:
      "RECLAMAÇÃO TRABALHISTA Nº {NUMERO_PROCESSO}\n\n{NOME_DO_CLIENTE} apresenta CONTESTAÇÃO à reclamação proposta por {PARTE_CONTRARIA}, pelos fatos e fundamentos a seguir expostos.",
  },
  {
    id: "mo5",
    nome: "Acordo Extrajudicial",
    categoria: "Contratos",
    tags: ["{NOME_DO_CLIENTE}", "{PARTE_CONTRARIA}", "{VALOR_ACORDO}"],
    corpo:
      "INSTRUMENTO PARTICULAR DE ACORDO\n\n{NOME_DO_CLIENTE} e {PARTE_CONTRARIA} ajustam o pagamento de {VALOR_ACORDO}, dando plena e geral quitação.",
  },
];

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
