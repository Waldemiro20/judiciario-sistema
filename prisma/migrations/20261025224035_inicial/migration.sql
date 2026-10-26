CREATE TABLE "Escritorio" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT 'padrao',
    "categorias" JSONB NOT NULL DEFAULT '{}',
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Escritorio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Usuario" (
    "id" UUID NOT NULL,
    "escritorioId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "oab" TEXT,
    "role" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "senhaHash" TEXT NOT NULL,
    "deveTrocarSenha" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcessoEm" TIMESTAMPTZ(3),
    "preferencias" JSONB NOT NULL DEFAULT '{}',
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Sessao" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "usuarioId" UUID NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMPTZ(3) NOT NULL,
    "ultimoUsoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revogadaEm" TIMESTAMPTZ(3),
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Sessao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TentativaLogin" (
    "id" BIGSERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "sucesso" BOOLEAN NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TentativaLogin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Idempotencia" (
    "usuarioId" UUID NOT NULL,
    "chave" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Idempotencia_pkey" PRIMARY KEY ("usuarioId","chave")
);

CREATE TABLE "PermissaoPerfil" (
    "escritorioId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,

    CONSTRAINT "PermissaoPerfil_pkey" PRIMARY KEY ("escritorioId","role","modulo")
);

CREATE TABLE "Cliente" (
    "id" UUID NOT NULL,
    "escritorioId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "documento2" TEXT NOT NULL DEFAULT '',
    "desde" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "contatos" JSONB NOT NULL DEFAULT '[]',
    "enderecos" JSONB NOT NULL DEFAULT '[]',
    "descricaoCaso" TEXT,
    "descricaoCasoEm" TIMESTAMPTZ(3),
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClienteHistorico" (
    "id" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "autorId" UUID,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClienteHistorico_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocPessoal" (
    "id" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "nome" TEXT NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
    "arquivo" TEXT,
    "storageKey" TEXT,
    "mime" TEXT,
    "tamanho" INTEGER,
    "enviadoEm" TIMESTAMPTZ(3),
    "enviadoPorId" UUID,
    "enviadoPor" TEXT,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocPessoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Processo" (
    "id" UUID NOT NULL,
    "escritorioId" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "clienteId" UUID NOT NULL,
    "area" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "vara" TEXT NOT NULL DEFAULT '',
    "tribunal" TEXT NOT NULL DEFAULT '',
    "juiz" TEXT NOT NULL DEFAULT '',
    "parteContraria" TEXT NOT NULL DEFAULT '',
    "partes" JSONB NOT NULL DEFAULT '[]',
    "valorCausa" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "fase" TEXT NOT NULL DEFAULT '',
    "responsavelId" UUID NOT NULL,
    "risco" TEXT NOT NULL,
    "distribuicao" TEXT NOT NULL DEFAULT '',
    "sigiloso" BOOLEAN NOT NULL DEFAULT false,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Processo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProcessoEquipe" (
    "processoId" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,

    CONSTRAINT "ProcessoEquipe_pkey" PRIMARY KEY ("processoId","usuarioId")
);

CREATE TABLE "Movimentacao" (
    "id" UUID NOT NULL,
    "processoId" UUID NOT NULL,
    "autorId" UUID,
    "autorNome" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movimentacao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tarefa" (
    "id" UUID NOT NULL,
    "escritorioId" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "coluna" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL,
    "responsavelId" UUID NOT NULL,
    "vinculoTipo" TEXT NOT NULL,
    "processoId" UUID,
    "clienteId" UUID,
    "prazo" DATE NOT NULL,
    "subtarefas" JSONB NOT NULL DEFAULT '[]',
    "versao" INTEGER NOT NULL DEFAULT 1,
    "excluidoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Tarefa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TarefaRegistro" (
    "id" UUID NOT NULL,
    "tarefaId" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "autorId" UUID,
    "autorNome" TEXT NOT NULL,
    "texto" TEXT NOT NULL DEFAULT '',
    "minutos" INTEGER,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TarefaRegistro_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Evento" (
    "id" UUID NOT NULL,
    "escritorioId" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "hora" TEXT NOT NULL,
    "duracaoMin" INTEGER NOT NULL,
    "advogadoId" UUID NOT NULL,
    "local" TEXT NOT NULL DEFAULT '',
    "linkOnline" TEXT,
    "juiz" TEXT,
    "processoId" UUID,
    "clienteId" UUID,
    "clienteNome" TEXT,
    "testemunhas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lembretes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recorrencia" TEXT NOT NULL,
    "observacoes" TEXT,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "excluidoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Pasta" (
    "id" UUID NOT NULL,
    "escritorioId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "confidencial" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pasta_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PastaAcesso" (
    "pastaId" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,

    CONSTRAINT "PastaAcesso_pkey" PRIMARY KEY ("pastaId","usuarioId")
);

CREATE TABLE "Documento" (
    "id" UUID NOT NULL,
    "escritorioId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "pastaId" UUID NOT NULL,
    "processoId" UUID,
    "conteudo" TEXT NOT NULL DEFAULT '',
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentoVersao" (
    "id" UUID NOT NULL,
    "documentoId" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "autorId" UUID,
    "autorNome" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoVersao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lancamento" (
    "id" UUID NOT NULL,
    "escritorioId" UUID NOT NULL,
    "descricao" TEXT NOT NULL,
    "clienteId" UUID,
    "processoId" UUID,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "vencimento" DATE NOT NULL,
    "parcela" TEXT,
    "situacao" TEXT NOT NULL,
    "valorRecebido" DECIMAL(15,2),
    "versao" INTEGER NOT NULL DEFAULT 1,
    "excluidoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Lancamento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Modelo" (
    "id" UUID NOT NULL,
    "escritorioId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "corpo" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Modelo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Contrato" (
    "id" UUID NOT NULL,
    "escritorioId" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "clienteId" UUID NOT NULL,
    "inicio" DATE NOT NULL,
    "fim" DATE NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "assinatura" TEXT NOT NULL,
    "provedor" TEXT,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Intimacao" (
    "id" UUID NOT NULL,
    "escritorioId" UUID NOT NULL,
    "processoNumero" TEXT NOT NULL,
    "processoId" UUID,
    "resumo" TEXT NOT NULL,
    "recebidaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prazoDias" INTEGER NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "excluidoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Intimacao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Auditoria" (
    "id" BIGSERIAL NOT NULL,
    "escritorioId" UUID,
    "usuarioId" UUID,
    "usuarioNome" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "recursoTipo" TEXT,
    "recursoId" TEXT,
    "resultado" TEXT NOT NULL DEFAULT 'sucesso',
    "ip" TEXT,
    "requestId" TEXT,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

CREATE INDEX "Usuario_escritorioId_idx" ON "Usuario"("escritorioId");

CREATE UNIQUE INDEX "Usuario_escritorioId_nome_key" ON "Usuario"("escritorioId", "nome");

CREATE UNIQUE INDEX "Sessao_tokenHash_key" ON "Sessao"("tokenHash");

CREATE INDEX "Sessao_usuarioId_idx" ON "Sessao"("usuarioId");

CREATE INDEX "TentativaLogin_chave_criadoEm_idx" ON "TentativaLogin"("chave", "criadoEm");

CREATE INDEX "Cliente_escritorioId_idx" ON "Cliente"("escritorioId");

CREATE UNIQUE INDEX "Cliente_escritorioId_nome_key" ON "Cliente"("escritorioId", "nome");

CREATE INDEX "ClienteHistorico_clienteId_criadoEm_idx" ON "ClienteHistorico"("clienteId", "criadoEm");

CREATE UNIQUE INDEX "DocPessoal_storageKey_key" ON "DocPessoal"("storageKey");

CREATE INDEX "DocPessoal_clienteId_idx" ON "DocPessoal"("clienteId");

CREATE INDEX "Processo_escritorioId_status_idx" ON "Processo"("escritorioId", "status");

CREATE INDEX "Processo_clienteId_idx" ON "Processo"("clienteId");

CREATE INDEX "Processo_responsavelId_idx" ON "Processo"("responsavelId");

CREATE UNIQUE INDEX "Processo_escritorioId_numero_key" ON "Processo"("escritorioId", "numero");

CREATE INDEX "ProcessoEquipe_usuarioId_idx" ON "ProcessoEquipe"("usuarioId");

CREATE INDEX "Movimentacao_processoId_criadoEm_idx" ON "Movimentacao"("processoId", "criadoEm");

CREATE INDEX "Tarefa_escritorioId_excluidoEm_idx" ON "Tarefa"("escritorioId", "excluidoEm");

CREATE INDEX "Tarefa_responsavelId_idx" ON "Tarefa"("responsavelId");

CREATE INDEX "Tarefa_processoId_idx" ON "Tarefa"("processoId");

CREATE INDEX "TarefaRegistro_tarefaId_criadoEm_idx" ON "TarefaRegistro"("tarefaId", "criadoEm");

CREATE INDEX "Evento_escritorioId_data_idx" ON "Evento"("escritorioId", "data");

CREATE INDEX "Evento_processoId_idx" ON "Evento"("processoId");

CREATE UNIQUE INDEX "Pasta_escritorioId_nome_key" ON "Pasta"("escritorioId", "nome");

CREATE INDEX "Documento_escritorioId_idx" ON "Documento"("escritorioId");

CREATE INDEX "Documento_processoId_idx" ON "Documento"("processoId");

CREATE UNIQUE INDEX "Documento_pastaId_nome_key" ON "Documento"("pastaId", "nome");

CREATE UNIQUE INDEX "DocumentoVersao_documentoId_numero_key" ON "DocumentoVersao"("documentoId", "numero");

CREATE INDEX "Lancamento_escritorioId_vencimento_idx" ON "Lancamento"("escritorioId", "vencimento");

CREATE INDEX "Modelo_escritorioId_idx" ON "Modelo"("escritorioId");

CREATE INDEX "Contrato_escritorioId_idx" ON "Contrato"("escritorioId");

CREATE INDEX "Intimacao_escritorioId_excluidoEm_idx" ON "Intimacao"("escritorioId", "excluidoEm");

CREATE INDEX "Auditoria_escritorioId_criadoEm_idx" ON "Auditoria"("escritorioId", "criadoEm");

CREATE INDEX "Auditoria_usuarioId_criadoEm_idx" ON "Auditoria"("usuarioId", "criadoEm");

ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Sessao" ADD CONSTRAINT "Sessao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Idempotencia" ADD CONSTRAINT "Idempotencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PermissaoPerfil" ADD CONSTRAINT "PermissaoPerfil_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClienteHistorico" ADD CONSTRAINT "ClienteHistorico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DocPessoal" ADD CONSTRAINT "DocPessoal_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Processo" ADD CONSTRAINT "Processo_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Processo" ADD CONSTRAINT "Processo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Processo" ADD CONSTRAINT "Processo_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProcessoEquipe" ADD CONSTRAINT "ProcessoEquipe_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProcessoEquipe" ADD CONSTRAINT "ProcessoEquipe_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TarefaRegistro" ADD CONSTRAINT "TarefaRegistro_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "Tarefa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Evento" ADD CONSTRAINT "Evento_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Evento" ADD CONSTRAINT "Evento_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Evento" ADD CONSTRAINT "Evento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Evento" ADD CONSTRAINT "Evento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Pasta" ADD CONSTRAINT "Pasta_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PastaAcesso" ADD CONSTRAINT "PastaAcesso_pastaId_fkey" FOREIGN KEY ("pastaId") REFERENCES "Pasta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PastaAcesso" ADD CONSTRAINT "PastaAcesso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Documento" ADD CONSTRAINT "Documento_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Documento" ADD CONSTRAINT "Documento_pastaId_fkey" FOREIGN KEY ("pastaId") REFERENCES "Pasta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Documento" ADD CONSTRAINT "Documento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DocumentoVersao" ADD CONSTRAINT "DocumentoVersao_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Modelo" ADD CONSTRAINT "Modelo_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Intimacao" ADD CONSTRAINT "Intimacao_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Intimacao" ADD CONSTRAINT "Intimacao_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
