ALTER TABLE "Cliente" ADD COLUMN "excluidoEm" TIMESTAMPTZ(3);

DROP INDEX "Cliente_escritorioId_nome_key";
CREATE INDEX "Cliente_escritorioId_nome_idx" ON "Cliente"("escritorioId", "nome");
CREATE UNIQUE INDEX "Cliente_escritorioId_nome_ativo_key" ON "Cliente"("escritorioId", "nome") WHERE "excluidoEm" IS NULL;
CREATE INDEX "Cliente_escritorioId_excluidoEm_idx" ON "Cliente"("escritorioId", "excluidoEm");
