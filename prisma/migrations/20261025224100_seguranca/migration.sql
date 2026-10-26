
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_role_check"
  CHECK ("role" IN ('admin', 'advogado', 'estagiario'));
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_email_minusculo_check"
  CHECK ("email" = lower("email"));

ALTER TABLE "PermissaoPerfil" ADD CONSTRAINT "PermissaoPerfil_role_check"
  CHECK ("role" IN ('admin', 'advogado', 'estagiario'));
ALTER TABLE "PermissaoPerfil" ADD CONSTRAINT "PermissaoPerfil_nivel_check"
  CHECK ("nivel" IN ('nenhum', 'ver', 'editar'));
ALTER TABLE "PermissaoPerfil" ADD CONSTRAINT "PermissaoPerfil_modulo_check"
  CHECK ("modulo" IN ('Dashboard', 'Processos', 'Tarefas', 'Agenda', 'Audiências', 'Clientes',
                      'Documentos', 'Financeiro', 'Contratos e Peças', 'Relatórios', 'Configurações'));

ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_tipo_check"
  CHECK ("tipo" IN ('Pessoa Física', 'Pessoa Jurídica'));
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_status_check"
  CHECK ("status" IN ('Ativo', 'Inativo'));

ALTER TABLE "Processo" ADD CONSTRAINT "Processo_status_check"
  CHECK ("status" IN ('Ativo', 'Suspenso', 'Aguardando Prazo', 'Arquivado'));
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_risco_check"
  CHECK ("risco" IN ('Provável', 'Possível', 'Remoto'));
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_valorCausa_check" CHECK ("valorCausa" >= 0);

ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_coluna_check"
  CHECK ("coluna" IN ('A Fazer', 'Em Andamento', 'Concluído'));
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_prioridade_check"
  CHECK ("prioridade" IN ('Baixa', 'Média', 'Alta'));
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_vinculo_check" CHECK (
  ("vinculoTipo" = 'Processo' AND "processoId" IS NOT NULL) OR
  ("vinculoTipo" = 'Cliente' AND "clienteId" IS NOT NULL AND "processoId" IS NULL) OR
  ("vinculoTipo" = 'Interno' AND "processoId" IS NULL AND "clienteId" IS NULL)
);

ALTER TABLE "TarefaRegistro" ADD CONSTRAINT "TarefaRegistro_tipo_check"
  CHECK ("tipo" IN ('comentario', 'historico', 'apontamento'));
ALTER TABLE "TarefaRegistro" ADD CONSTRAINT "TarefaRegistro_minutos_check"
  CHECK ("minutos" IS NULL OR ("minutos" > 0 AND "minutos" <= 1440));

ALTER TABLE "Evento" ADD CONSTRAINT "Evento_tipo_check"
  CHECK ("tipo" IN ('Audiência', 'Reunião', 'Prazo'));
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_recorrencia_check"
  CHECK ("recorrencia" IN ('Não repete', 'Diária', 'Semanal', 'Mensal'));
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_duracao_check"
  CHECK ("duracaoMin" > 0 AND "duracaoMin" <= 1440);

ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_tipo_check"
  CHECK ("tipo" IN ('Receber', 'Pagar'));
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_modelo_check"
  CHECK ("modelo" IN ('Ad Exitum', 'Partido (Mensal)', 'Por Hora', 'Avulso'));
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_situacao_check"
  CHECK ("situacao" IN ('Em aberto', 'Pago', 'Atrasado'));
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_valores_check"
  CHECK ("valor" > 0 AND ("valorRecebido" IS NULL OR ("valorRecebido" >= 0 AND "valorRecebido" <= "valor")));

ALTER TABLE "Modelo" ADD CONSTRAINT "Modelo_categoria_check"
  CHECK ("categoria" IN ('Contratos', 'Peças', 'Procurações'));

ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_assinatura_check"
  CHECK ("assinatura" IN ('Não enviado', 'Aguardando assinatura', 'Assinado'));
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_periodo_check" CHECK ("fim" >= "inicio");
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_valor_check" CHECK ("valor" >= 0);

ALTER TABLE "Intimacao" ADD CONSTRAINT "Intimacao_prazo_check"
  CHECK ("prazoDias" >= 0 AND "prazoDias" <= 365);

ALTER TABLE "DocumentoVersao" ADD CONSTRAINT "DocumentoVersao_numero_check" CHECK ("numero" >= 1);
ALTER TABLE "DocumentoVersao" ADD CONSTRAINT "DocumentoVersao_tamanho_check" CHECK ("tamanho" >= 0);

ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_acao_check"
  CHECK ("acao" IN ('Criou', 'Editou', 'Excluiu', 'Visualizou', 'Login', 'Logout', 'Exportou'));
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_resultado_check"
  CHECK ("resultado" IN ('sucesso', 'negado', 'falha'));

CREATE OR REPLACE FUNCTION "bloquear_alteracao_registro"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Registro somente inclusão: % não permitido em %', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Auditoria', 'Movimentacao', 'TarefaRegistro', 'ClienteHistorico', 'DocumentoVersao']
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "bloquear_alteracao_registro"()',
                   t || '_somente_inclusao', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION "bloquear_alteracao_registro"()',
                   t || '_sem_truncate', t);
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM authenticated;
  END IF;
END $$;
