# Gestão Jurídica

Sistema interno de gestão jurídica (processos, clientes, tarefas, agenda, audiências, documentos,
financeiro, contratos e intimações), feito em **Next.js 16 (App Router)**, React 19 e Tailwind CSS v4,
com backend em Route Handlers, **Prisma 7** e **PostgreSQL (Supabase)**.

Todos os dados vêm do banco. Não há dados de exemplo nem usuário padrão.

## Rodando localmente

Precisa de Node.js 22.12+ (ou 24).

```sh
npm install
cp .env.example .env.local      # ajuste DATABASE_URL e APP_ORIGIN
npm run db:local                # (opcional) Postgres local, em outro terminal
npm run db:migrate
npm run db:criar-escritorio -- --escritorio "Nome do Escritório" --sigla NE --nome "Nome do Admin" --email admin@exemplo.com
npm run dev                     # http://localhost:3000
```

O `db:criar-escritorio` mostra uma senha temporária uma única vez; ela precisa ser trocada no primeiro acesso.

## Comandos

```sh
npm test            # testes (sobe um PostgreSQL temporário próprio)
npm run typecheck
npm run lint
npm run build
npm run db:status   # situação das migrations
```

## Estrutura

| Pasta | O que tem |
| --- | --- |
| `src/app/` | Rotas do Next (páginas) e `src/app/api/` (API REST) |
| `src/server/` | Backend: configuração, autenticação, autorização, serviços, armazenamento de arquivos |
| `src/views/` | Telas do sistema |
| `src/components/` | Componentes compartilhados e `ui/` (shadcn) |
| `src/lib/store.tsx` | Estado do app, carregado da API |
| `src/lib/sincronia.ts` | Envia à API cada alteração feita nas listas |
| `prisma/` | Schema e migrations versionadas |
| `tests/` | Testes de autenticação, autorização, integridade, segurança e documentos |

Arquitetura, endpoints, segurança, configuração do Supabase, produção e limitações conhecidas:
[`docs/BACKEND.md`](docs/BACKEND.md).
