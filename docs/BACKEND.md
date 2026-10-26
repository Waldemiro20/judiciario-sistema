# Backend — Gestão Jurídica

Este documento descreve a API, as decisões de segurança e o procedimento de operação do backend.
O sistema é a gestão interna de um escritório de advocacia: processos, clientes, tarefas, agenda e
audiências, documentos, financeiro, contratos e modelos, intimações, usuários, permissões e auditoria.

## 1. Arquitetura

| Camada | Onde | Responsabilidade |
| --- | --- | --- |
| Rotas HTTP | `src/app/api/**/route.ts` | Route Handlers do Next.js 16, finos: leem a entrada e chamam o serviço |
| Wrapper de rota | `src/server/http/rota.ts` | request id, rate limit, verificação de origem (CSRF), sessão, senha temporária, permissão por módulo, tratamento de erros, logs, auditoria de acesso negado |
| Entrada | `src/server/http/corpo.ts` | limite de bytes, `Content-Type`, JSON e validação com Zod, paginação |
| Serviços | `src/server/modulos/*.ts` | regras de negócio, autorização por registro, transações, auditoria |
| Autorização | `src/server/authz/` | RBAC por módulo (`permissoes.ts`) e filtros por registro (`acesso.ts`: escritório, sigilo, pasta confidencial) |
| Autenticação | `src/server/auth/` | Argon2id, sessões opacas, limitação de login |
| Dados | `prisma/schema.prisma`, `src/server/db.ts` | Prisma 7 com `@prisma/adapter-pg` sobre o PostgreSQL do Supabase |
| Arquivos | `src/server/storage/` | Supabase Storage privado ou disco local, validação de tipo por assinatura binária |
| Configuração | `src/server/config.ts` | variáveis de ambiente validadas com Zod (falha clara e sem expor valores) |
| Frontend | `src/lib/store.tsx`, `src/lib/sincronia.ts`, `src/lib/api.ts` | carrega tudo da API e envia cada alteração ao servidor |

O frontend não tem mais dados locais: todas as listas vêm da API. As telas continuam usando
`setProcessos`, `setTarefas` etc.; `src/lib/sincronia.ts` compara a lista anterior com a nova e envia
`POST`, `PATCH`/`PUT` ou `DELETE` para cada item alterado, reconciliando com a resposta do servidor
(o servidor é a fonte da verdade: ids, versões, autores e datas vêm dele).

## 2. Requisitos e instalação

- Node.js 22.12+ ou 24 (testado com 24.21), npm 11.
- Um projeto Supabase (PostgreSQL 15+). Para desenvolvimento local há um Postgres embarcado.

```sh
npm install                 # roda "prisma generate" no postinstall
cp .env.example .env.local  # preencha os valores
```

### Banco local (sem Docker)

```sh
npm run db:local            # sobe um Postgres em .pgdata e mostra a DATABASE_URL
npm run db:migrate          # aplica as migrations
npm run db:criar-escritorio -- --escritorio "Nome do Escritório" --sigla NE --nome "Nome do Admin" --email admin@exemplo.com
npm run dev
```

O comando `db:criar-escritorio` cria o escritório, as permissões padrão, as pastas iniciais e o
primeiro administrador, e mostra **uma única vez** uma senha temporária. A troca é obrigatória
no primeiro acesso. Não existe usuário ou senha padrão.

## 3. Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | sim | Conexão usada pela aplicação. No Supabase, use o pooler (Supavisor) em modo sessão, porta 5432, ou o modo transação, porta 6543, em ambientes serverless |
| `DIRECT_URL` | para migrations | Conexão direta (`db.<projeto>.supabase.co:5432`), usada só pela CLI do Prisma (`prisma.config.ts`) |
| `DATABASE_POOL_MAX` | não | Conexões por instância (padrão 5) |
| `DATABASE_SSL_CA` | não | Certificado raiz (PEM) para verificar o TLS do banco. Com `sslmode` na URL a verificação é sempre completa; para hosts `*.supabase.co`/`*.supabase.com` a raiz pública do Supabase já vem embutida em `src/server/certificados.ts`. Variáveis vazias são tratadas como ausentes. |
| `APP_ORIGIN` | em produção | Origem pública (ex.: `https://gestao.exemplo.com.br`). Base da verificação de origem (CSRF), do HSTS e do `upgrade-insecure-requests` (estes dois no build) |
| `ALLOWED_ORIGINS` | não | Outras origens aceitas, separadas por vírgula |
| `TRUST_PROXY` | não | `true` quando atrás de proxy confiável (Vercel): passa a usar `x-real-ip`/`x-forwarded-for` para limitação e auditoria |
| `COOKIE_SECURE` | não | Força o atributo `Secure`; o padrão é `true` em produção |
| `SESSION_TTL_HORAS` / `SESSION_IDLE_MINUTOS` | não | Duração máxima da sessão (12 h) e tempo sem uso até expirar (60 min) |
| `LOGIN_MAX_TENTATIVAS`, `LOGIN_MAX_TENTATIVAS_IP`, `LOGIN_JANELA_MINUTOS` | não | Limitação de força bruta (5 por e-mail e 30 por IP em 15 min) |
| `API_LIMITE_POR_MINUTO` | não | Limite geral por IP e por instância (600/min) |
| `STORAGE_DRIVER` | não | `local` (padrão) ou `supabase`. Em produção, `local` só com `STORAGE_LOCAL_EM_PRODUCAO=true` (servidor único com disco persistente) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | com `supabase` | Acesso ao Storage. **A service role key fica só no servidor**; nunca use o prefixo `NEXT_PUBLIC_` nela |
| `MAX_UPLOAD_MB` | não | Tamanho máximo do upload (padrão 4 MB; o limite de corpo da Vercel é 4,5 MB) |
| `NEXT_PUBLIC_NOME_ESCRITORIO`, `NEXT_PUBLIC_SIGLA_ESCRITORIO` | não | Nome exibido na tela de login, antes de haver sessão |

`JWT_SECRET` **não é usado**: veja a seção 5.

## 4. Supabase e Prisma

1. Crie o projeto e anote as strings de conexão (direta e pooler).
2. Defina `DIRECT_URL` e `DATABASE_URL` e rode `npm run db:migrate` (`prisma migrate deploy`).
   Nunca use `prisma migrate reset` nem `prisma db push` em um banco com dados reais.
3. Para os documentos, crie no Storage um bucket **privado** chamado `documentos` (ou o nome em
   `SUPABASE_STORAGE_BUCKET`). Não crie políticas de Storage para `anon`/`authenticated`: o backend
   acessa o bucket com a service role e libera o download só depois de autorizar o usuário.
4. Migrations versionadas em `prisma/migrations`:
   - `..._inicial`: tabelas, chaves, índices e FKs `RESTRICT` (sem cascata em registros jurídicos);
   - `..._seguranca`: CHECKs dos domínios, triggers de "somente inclusão" e RLS (seção 9).
5. Para evoluir o schema: altere `prisma/schema.prisma`, rode `npm run db:migrate:dev -- --create-only --name descricao`
   contra um banco de desenvolvimento, **revise o SQL gerado** (risco de perda de dados) e só então aplique.

## 5. Autenticação

- Autenticação própria, porque o projeto não usava Supabase Auth. Não há dois mecanismos concorrentes.
- Senhas com **Argon2id** (`@node-rs/argon2`, 19 MiB, t=2, p=1). Política: de 12 a 128 caracteres, sem
  regras de composição e bloqueando sequências triviais. Para e-mails inexistentes é feita uma
  verificação com um hash fictício, para não revelar pelo tempo de resposta se o e-mail existe.
- **Sessões opacas em vez de JWT**: o login gera 256 bits aleatórios, enviados no cookie
  `__Host-lv_sessao` (`HttpOnly; Secure; SameSite=Strict; Path=/`). O banco guarda apenas o SHA-256 do token.
  Assim, a revogação é imediata (logout, troca de senha, usuário desativado ou com perfil alterado),
  sem refresh token e sem segredo de assinatura para proteger. Expiram por inatividade e por duração máxima.
- Respostas genéricas ("E-mail ou senha incorretos.") para senha errada, e-mail inexistente e usuário desativado.
- Limitação de força bruta persistida no banco (funciona com várias instâncias), por e-mail e por IP.
- Senha temporária (primeiro acesso ou redefinida pelo admin): até a troca, a API só aceita
  `/api/auth/*` e responde `403 SENHA_EXPIRADA` para o resto.
- Troca de senha exige a senha atual, encerra todas as sessões e emite um novo cookie.
- Recuperação de senha por e-mail **não existe** (não há serviço de e-mail configurado); o administrador
  redefine a senha pela tela de Usuários, gerando uma nova senha temporária.

Endpoints: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/sessao`,
`POST /api/auth/senha`, `DELETE /api/auth/sessoes` (encerra as outras sessões).

## 6. Autorização

Três camadas, todas no servidor:

1. **RBAC por módulo**: os perfis existentes no projeto (`admin`, `advogado`, `estagiario`) × módulos
   × nível (`nenhum`/`ver`/`editar`), guardados em `PermissaoPerfil` por escritório e editáveis em
   Configurações. A ausência de uma linha significa `nenhum`. Regras fixas no código:
   o Financeiro é exclusivo do admin; o admin sempre mantém Configurações.
2. **Isolamento por escritório**: toda consulta filtra pelo `escritorioId` da sessão. Ids de outro
   escritório retornam 404, e a resolução de nomes (cliente, responsável, número do processo) só
   procura dentro do escritório.
3. **Por registro**:
   - **Processo sigiloso** (`sigiloso = true`): só o responsável e a equipe do processo o veem; **o admin
     não entra automaticamente**. Tarefas, eventos, documentos, lançamentos e intimações vinculados
     herdam o sigilo. Só o responsável retira o sigilo ou mexe na equipe de um processo sigiloso. O acesso fica auditado.
   - **Pasta confidencial**: só quem está na lista de acesso vê, envia ou baixa documentos dela; quem cria a pasta entra automaticamente.
   - Agenda × Audiências: eventos do tipo Audiência seguem o módulo Audiências; os demais, o módulo Agenda.

Proteções adicionais: ninguém altera o próprio perfil nem se desativa; só um admin cria, promove ou
altera admins e redefine senhas; ninguém altera as permissões do próprio perfil; o escritório nunca
fica sem admin ativo. Toda tentativa negada (403) é gravada na auditoria com `resultado = negado`.

O identificador e as condições de acesso são verificados na **mesma consulta**
(`findFirst({ where: { id, ...visivel(usuario) } })`), o que impede IDOR/BOLA.

## 7. API

Formato de erro (sem stack, SQL ou mensagens internas):

```json
{ "erro": { "codigo": "VALIDACAO", "mensagem": "Dados inválidos.", "detalhes": [{ "campo": "area", "mensagem": "Invalid option" }], "requestId": "…" } }
```

Códigos: `VALIDACAO` 422, `NAO_AUTENTICADO` 401, `SENHA_EXPIRADA` 403, `PROIBIDO` 403,
`ORIGEM_INVALIDA` 403, `NAO_ENCONTRADO` 404, `CONFLITO` 409, `VERSAO_DESATUALIZADA` 409,
`CORPO_GRANDE` 413, `TIPO_NAO_SUPORTADO` 415, `MUITAS_REQUISICOES` 429 (com `Retry-After`),
`INDISPONIVEL` 503, `ERRO_INTERNO` 500. Toda resposta traz `X-Request-Id` e `Cache-Control: no-store`.

Listagens: `?pagina=1&porPagina=50` (máximo 200), resposta `{ itens, total, pagina, porPagina }`.
Parâmetros desconhecidos são rejeitados.

| Recurso | Métodos | Módulo |
| --- | --- | --- |
| `/api/processos` · `/:id` | GET, POST · GET, PATCH (`?status=`, `?ordem=recentes\|numero\|atualizacao`) | Processos |
| `/api/clientes` · `/:id` | GET, POST · GET, PATCH | Clientes |
| `/api/clientes/:id/documentos/:docId/arquivo` | GET (download), POST (upload multipart `arquivo`) | Clientes |
| `/api/tarefas` · `/:id` | GET, POST · GET, PATCH, DELETE | Tarefas |
| `/api/eventos` · `/:id` | GET, POST · GET, PUT, DELETE | Agenda / Audiências |
| `/api/lancamentos` · `/:id` | GET, POST (um ou `{ lancamentos: [...] }`) · PUT, DELETE | Financeiro |
| `/api/contratos` · `/:id` | GET, POST · PUT | Contratos e Peças |
| `/api/modelos` · `/:id` | GET, POST · PUT | Contratos e Peças |
| `/api/intimacoes` · `/:id` | GET, POST · PUT, DELETE | Processos |
| `/api/pastas` | GET, POST | Documentos |
| `/api/documentos` | GET, POST (multipart: `arquivo`, `pasta`, `processo`) | Documentos |
| `/api/documentos/:id/versoes/:versaoId/arquivo` | GET | Documentos |
| `/api/documentos/:id/versoes/:versaoId/restaurar` | POST | Documentos |
| `/api/usuarios` · `/:id` · `/:id/senha` | GET (todos), POST · PATCH · POST | Configurações |
| `/api/permissoes` | GET, PUT `{ role, modulo, nivel }` | Configurações |
| `/api/escritorio` | PATCH | Configurações |
| `/api/preferencias` | PATCH (tema, widgets do próprio usuário) | — |
| `/api/auditoria` | GET (Configurações) · POST (só `Exportou`/`Visualizou`, marcado como "informado pela interface") | — |
| `/api/health` | GET (`?pronto` também testa o banco) | público |

- **PATCH** (processos, clientes, tarefas): campos omitidos ficam como estão.
- **PUT** (eventos, lançamentos, contratos, modelos, intimações): substituição completa; campo opcional omitido é apagado.
- Toda atualização exige o campo `versao` (controle otimista de concorrência): versão desatualizada → `409 VERSAO_DESATUALIZADA`.
- `POST` aceita `Idempotency-Key` (8 a 64 caracteres `[A-Za-z0-9-]`): repetir a requisição devolve o mesmo registro (200) em vez de duplicar.
- Campos controlados pelo servidor (`id`, `escritorioId`, `versao`, datas, autores, `role` no próprio usuário) são ignorados ou rejeitados.
- Andamentos de processo, histórico de cliente e comentários, histórico e apontamentos de tarefa são **só inclusão**: itens novos ganham autor e data do servidor e itens existentes não mudam.
- Exclusões permitidas pela interface (tarefas, eventos, lançamentos, intimações) são lógicas (`excluidoEm`). Processos, clientes, contratos e documentos não têm exclusão.

Exemplos (dados fictícios):

```sh
curl -c jar -X POST http://localhost:3000/api/auth/login \
  -H 'Origin: http://localhost:3000' -H 'Content-Type: application/json' \
  -d '{"email":"admin@exemplo.com","senha":"uma senha longa de exemplo"}'

curl -b jar -X POST http://localhost:3000/api/processos \
  -H 'Origin: http://localhost:3000' -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"numero":"0000001-00.2026.8.26.0100","titulo":"Ação de exemplo","cliente":"Cliente Exemplo","area":"Família","status":"Ativo","responsavel":"Nome do Admin","risco":"Remoto","sigiloso":true}'

curl -b jar -X POST http://localhost:3000/api/documentos \
  -H 'Origin: http://localhost:3000' -F 'arquivo=@peticao.pdf' -F 'pasta=Petições'
```

## 8. Documentos e anexos

- Upload com limite de bytes antes do parse, extensão em lista permitida (pdf, png, jpg, docx, xlsx,
  odt, doc, xls, rtf, txt, csv) **e** conferência da assinatura binária; o tipo MIME é definido pelo servidor.
- O nome original é saneado (path traversal, caracteres de controle) e serve só para exibição; o objeto é
  gravado como `<escritorioId>/<uuid>`, sem sobrescrita (`wx` no disco, `x-upsert: false` no Supabase).
- Download sempre pelo backend, depois da autorização (não existem URLs públicas nem permanentes), com
  `Content-Disposition: attachment`, `nosniff` e `CSP: sandbox`. Todo download é auditado.
- Novo envio com o mesmo nome na mesma pasta gera uma nova versão; restaurar cria outra versão sem apagar as anteriores.
- **Não há antivírus.** Se o risco justificar, adicione uma varredura assíncrona antes de liberar o download.

## 9. RLS e credenciais do banco

- O sistema **não usa** a Data API do Supabase (PostgREST). Mesmo assim, como ela expõe o schema
  `public` aos papéis `anon` e `authenticated`, a migration `..._seguranca`:
  - liga RLS em **todas** as tabelas (inclusive `_prisma_migrations`) **sem políticas** (negação total);
  - revoga os privilégios de `anon` e `authenticated`, inclusive os privilégios padrão para tabelas futuras.
  O teste `RLS` confirma, com papéis reais, que esses papéis não leem nem gravam nada.
- O backend conecta com o papel dono das tabelas, que **não** é afetado pela RLS (não usamos `FORCE`). Por isso
  a autorização é integralmente aplicada no servidor (seção 6): a RLS aqui é uma barreira contra a
  exposição via Data API, não o mecanismo de autorização. O Prisma não herda a identidade do usuário.
- Operações com credencial privilegiada: as migrations (`DIRECT_URL`), a aplicação (`DATABASE_URL`) e o
  Storage (service role, só no servidor). Recomendação para produção: criar um papel dedicado
  (sem `BYPASSRLS` e sem ser superusuário) dono das tabelas, em vez do usuário `postgres`.

## 10. Auditoria

Tabela `Auditoria`: usuário, ação, módulo, descrição, tipo/id do recurso, resultado
(`sucesso`/`negado`/`falha`), IP (com `TRUST_PROXY`), request id e data. Registra login e falhas de login,
logout, criação/edição/exclusão em todos os módulos, alteração de perfis e permissões, acesso a processo
sigiloso, downloads e tentativas negadas. Não registra senhas, tokens nem o conteúdo de documentos.

Triggers impedem `UPDATE`, `DELETE` e `TRUNCATE` na auditoria, nos andamentos, nos históricos e nas
versões de documentos. **Isso não torna a tabela inviolável**: o dono das tabelas ou um superusuário pode
desativar os triggers. Para evidência forte, exporte periodicamente a auditoria para um armazenamento
separado, com retenção e imutabilidade (ex.: bucket com object lock).

## 11. Outras proteções

- **CSRF**: cookie `SameSite=Strict` + verificação de `Origin` (ou `Sec-Fetch-Site: same-origin`) em todo
  método que altera dados + exigência de `application/json` ou `multipart/form-data`.
- **CORS**: a API não emite cabeçalhos CORS; só a própria origem é aceita.
- **Cabeçalhos** (`next.config.ts`): CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, COOP, HSTS (com `APP_ORIGIN` https). A CSP de páginas usa `'unsafe-inline'` em
  scripts por causa dos scripts inline do Next.js; trocar por nonce exige renderização dinâmica (melhoria futura).
- **SQL injection**: só Prisma com consultas parametrizadas; o único SQL bruto é o `SELECT 1` do health check.
  Ordenação e filtros só por listas permitidas.
- **DoS**: limite de 256 KB por JSON (16 KB em preferências, 4 KB no login), páginas de até 200 itens,
  `statement_timeout` de 15 s, timeouts de conexão e limitação por IP.
- **Logs**: JSON estruturado com request id; chaves sensíveis (senha, token, cookie, CPF, documento, conteúdo…) são redigidas.
- **SSRF**: o servidor só faz requisições para o `SUPABASE_URL` configurado; não busca URLs informadas por usuários.

## 12. Testes

```sh
npm test          # Vitest: sobe um PostgreSQL real embarcado, aplica as migrations e roda tudo
npm run typecheck
npm run lint
npm run build
```

Os testes nunca tocam o banco configurado no `.env`: cada execução cria um Postgres temporário, que é
apagado no fim. A suíte cobre autenticação (sessão expirada, ociosa, revogada, token malformado, usuário
desativado, força bruta por e-mail e por IP, senha temporária), autorização (sem login, módulo sem
permissão, próprio perfil, admin, isolamento entre escritórios, processo sigiloso, IDOR em processos,
tarefas, documentos e anexos, pasta confidencial), integridade (validação, mass assignment, 404, 409,
concorrência, idempotência, rollback de transação, registros só de inclusão no banco), segurança da API
(SQL injection, CSRF, CORS, corpo grande, paginação, vazamento em erros, RLS) e upload (assinatura binária,
path traversal, tamanho, versões).

## 13. Produção (Vercel + Supabase)

1. Variáveis no projeto da Vercel: `DATABASE_URL` (pooler), `DIRECT_URL`, `APP_ORIGIN` (https),
   `TRUST_PROXY=true`, `STORAGE_DRIVER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Aplicar as migrations a partir de uma máquina confiável ou de um passo de CI (`npm run db:migrate` com `DIRECT_URL`).
3. Criar o primeiro escritório com `npm run db:criar-escritorio` apontando para o banco de produção.
4. Backups: habilite os backups (e o PITR, se o plano permitir) no painel do Supabase e **teste a restauração**
   em um projeto separado. Os arquivos do Storage não entram no backup do banco; planeje uma cópia própria.

## 14. Limitações conhecidas e pendências

- **Contexto**: não há Supabase Auth, serviço de e-mail, antivírus nem integração de assinatura eletrônica. As exportações em PDF/Excel e o envio para assinatura continuam simulados na interface (e indicados como tal).
- **Rate limit geral em memória**: vale por instância; em serverless, cada instância tem o seu. O login usa o banco e vale globalmente.
- **Bloqueio de conta**: 5 erros por e-mail bloqueiam aquele e-mail por 15 minutos, o que permite a um atacante atrapalhar o login de alguém (troca consciente contra força bruta).
- **Upload**: até ~4 MB por causa do limite de corpo da Vercel. Arquivos maiores exigiriam URL assinada de upload direto ao Storage, com validação depois do envio.
- **Relações por nome**: a interface identifica clientes, usuários e processos pelo nome ou número, por isso eles são únicos por escritório (`Cliente.nome`, `Usuario.nome`, `Processo.numero`).
- **Listas carregadas inteiras**: a interface carrega todas as páginas de cada coleção ao entrar (como fazia com os dados locais). Para volumes grandes, as telas precisariam paginar sob demanda.
- **CSP** com `'unsafe-inline'` em scripts (seção 11).
- **LGPD**: os controles técnicos (menor privilégio, minimização no retorno de usuários, auditoria, sigilo, exclusão lógica) não tornam o sistema juridicamente adequado por si só. Dependem de validação pelo responsável jurídico e pelo encarregado (DPO): bases legais, prazos de retenção (não definidos no código), atendimento a titulares, resposta a incidentes e criptografia em repouso (a do Supabase é a da infraestrutura).
- **Fuso**: datas exibidas em `APP_TIMEZONE`; "hoje" no navegador usa o relógio local do usuário.
