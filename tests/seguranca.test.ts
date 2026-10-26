import { beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { inject } from "vitest";
import { db } from "@/server/db";
import * as processos from "@/app/api/processos/route";
import * as clientes from "@/app/api/clientes/route";
import * as login from "@/app/api/auth/login/route";
import * as auditoria from "@/app/api/auditoria/route";
import * as health from "@/app/api/health/route";
import * as preferencias from "@/app/api/preferencias/route";
import { consumirLimite, limparLimites } from "@/server/http/rede";
import { cenario, chamar, novoCliente } from "./helpers";

type Cenario = Awaited<ReturnType<typeof cenario>>;

describe("segurança da API", () => {
  let c: Cenario;

  beforeAll(async () => {
    c = await cenario();
  });

  it("entradas com SQL injection são tratadas como texto e não afetam outras linhas", async () => {
    const nome = `Robert'); DROP TABLE "Cliente";-- ${Date.now()}`;
    const r = await chamar(clientes.POST, {
      cookie: c.cookieAdmin,
      corpo: { nome, tipo: "Pessoa Física", documento: "000", status: "Ativo" },
    });
    expect(r.status).toBe(201);
    expect(r.json.nome).toBe(nome);
    expect(await db().cliente.count()).toBeGreaterThan(0);
    const filtro = await chamar(processos.GET, {
      cookie: c.cookieAdmin,
      caminho: "/api/processos?status=Ativo' OR '1'='1",
    });
    expect(filtro.status).toBe(422);
    const ordem = await chamar(processos.GET, {
      cookie: c.cookieAdmin,
      caminho: '/api/processos?ordem=numero;DROP TABLE "Processo"',
    });
    expect(ordem.status).toBe(422);
    const login1 = await chamar(login.POST, {
      corpo: { email: "' OR 1=1 --@x.com", senha: "' OR '1'='1" },
    });
    expect([401, 422]).toContain(login1.status);
  });

  it("bloqueia requisições que alteram dados sem Origin confiável (CSRF)", async () => {
    const corpo = {
      nome: `CSRF ${Date.now()}`,
      tipo: "Pessoa Física",
      documento: "1",
      status: "Ativo",
    };
    const semOrigem = await chamar(clientes.POST, { cookie: c.cookieAdmin, corpo, origem: null });
    expect(semOrigem.status).toBe(403);
    expect(semOrigem.json.erro.codigo).toBe("ORIGEM_INVALIDA");
    const outra = await chamar(clientes.POST, {
      cookie: c.cookieAdmin,
      corpo,
      origem: "https://atacante.example",
    });
    expect(outra.status).toBe(403);
    const mesmoSite = await chamar(clientes.POST, {
      cookie: c.cookieAdmin,
      corpo,
      origem: null,
      cabecalhos: { "sec-fetch-site": "same-origin" },
    });
    expect(mesmoSite.status).toBe(201);
    expect(await db().cliente.count({ where: { nome: corpo.nome } })).toBe(1);
  });

  it("formulário simples (sem JSON) é recusado, fechando outra via de CSRF", async () => {
    const r = await chamar(clientes.POST, {
      cookie: c.cookieAdmin,
      corpo: "nome=x",
      cabecalhos: { "content-type": "text/plain" },
    });
    expect(r.status).toBe(415);
  });

  it("não devolve cabeçalhos CORS para origens de fora", async () => {
    const r = await chamar(processos.GET, {
      cookie: c.cookieAdmin,
      cabecalhos: { origin: "https://atacante.example" },
    });
    expect(r.res.headers.get("access-control-allow-origin")).toBeNull();
    expect(r.res.headers.get("access-control-allow-credentials")).toBeNull();
  });

  it("recusa corpo grande demais", async () => {
    const r = await chamar(preferencias.PATCH, {
      metodo: "PATCH",
      cookie: c.cookieAdmin,
      corpo: JSON.stringify({ tema: "dark", lixo: "x".repeat(40_000) }),
    });
    expect(r.status).toBe(413);
    const grande = await chamar(clientes.POST, {
      cookie: c.cookieAdmin,
      corpo: JSON.stringify({ nome: "x".repeat(300 * 1024) }),
    });
    expect(grande.status).toBe(413);
  });

  it("valida paginação e limita o tamanho das páginas", async () => {
    for (const q of [
      "pagina=0",
      "porPagina=1000",
      "pagina=abc",
      "porPagina=-1",
      "campo=senhaHash",
    ]) {
      const r = await chamar(processos.GET, {
        cookie: c.cookieAdmin,
        caminho: `/api/processos?${q}`,
      });
      expect(r.status, q).toBe(422);
    }
    const cl = await novoCliente(c.escritorioId);
    for (let i = 0; i < 3; i++)
      await chamar(processos.POST, {
        cookie: c.cookieAdvogado,
        corpo: {
          numero: `${i}${Date.now()}-33.2024.8.26.0001`,
          titulo: "P",
          cliente: cl.nome,
          area: "Criminal",
          status: "Ativo",
          responsavel: c.advogado.nome,
          risco: "Remoto",
        },
      });
    const p = await chamar(processos.GET, {
      cookie: c.cookieAdmin,
      caminho: "/api/processos?porPagina=2&pagina=1",
    });
    expect(p.status).toBe(200);
    expect(p.json.itens).toHaveLength(2);
    expect(p.json.total).toBeGreaterThanOrEqual(3);
  });

  it("respostas de erro não vazam stack, SQL nem configuração", async () => {
    const r = await chamar(processos.POST, { cookie: c.cookieAdvogado, corpo: "{ json quebrado" });
    expect(r.status).toBe(422);
    expect(r.texto).not.toMatch(/at \w+ \(|node_modules|SyntaxError|postgres(ql)?:\/\//i);
    expect(r.json.erro.requestId).toBeTruthy();
    expect(r.res.headers.get("x-request-id")).toBe(r.json.erro.requestId);
    expect(r.res.headers.get("cache-control")).toBe("no-store");
    expect(r.res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("health check não expõe detalhes da infraestrutura", async () => {
    const r = await chamar(health.GET);
    expect(r.json).toEqual({ status: "ok" });
    const pronto = await chamar(health.GET, { caminho: "/api/health?pronto" });
    expect(pronto.json).toEqual({ status: "ok", banco: "ok" });
    expect(pronto.texto).not.toMatch(/postgres|localhost|senha/i);
  });

  it("eventos informados pela interface são limitados a exportação/visualização e ficam marcados", async () => {
    const forjado = await chamar(auditoria.POST, {
      cookie: c.cookieAdvogado,
      corpo: { acao: "Excluiu", modulo: "Processos", descricao: "x" },
    });
    expect(forjado.status).toBe(422);
    const semPermissao = await chamar(auditoria.POST, {
      cookie: c.cookieEstagiario,
      corpo: { acao: "Exportou", modulo: "Financeiro", descricao: "x" },
    });
    expect(semPermissao.status).toBe(403);
    const ok = await chamar(auditoria.POST, {
      cookie: c.cookieAdvogado,
      corpo: { acao: "Exportou", modulo: "Relatórios", descricao: "Exportou relatório" },
    });
    expect(ok.status).toBe(204);
    const l = await db().auditoria.findFirstOrThrow({
      where: { usuarioId: c.advogado.id, acao: "Exportou" },
    });
    expect(l.descricao).toContain("informado pela interface");
  });

  it("limitador de requisições bloqueia excesso por IP", () => {
    limparLimites();
    let espera = 0;
    for (let i = 0; i < 11; i++) espera = consumirLimite("teste:1", 10);
    expect(espera).toBeGreaterThan(0);
    expect(consumirLimite("teste:2", 10)).toBe(0);
  });

  it("RLS: os papéis anon/authenticated do Supabase não leem nem escrevem nas tabelas", async () => {
    const cliente = new pg.Client({ connectionString: inject("databaseUrl") });
    await cliente.connect();
    try {
      for (const papel of ["anon", "authenticated"]) {
        await cliente.query(`SET ROLE ${papel}`);
        for (const tabela of ["Usuario", "Processo", "Sessao", "Auditoria", "_prisma_migrations"]) {
          await expect(
            cliente.query(`SELECT * FROM "${tabela}" LIMIT 1`),
            `${papel} ${tabela}`,
          ).rejects.toThrow(/permission denied/);
        }
        await expect(
          cliente.query(
            `INSERT INTO "Escritorio"(id, nome, sigla) VALUES (gen_random_uuid(), 'x', 'x')`,
          ),
        ).rejects.toThrow();
        await cliente.query("RESET ROLE");
      }
      const semRls = await cliente.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity`,
      );
      expect(semRls.rows).toEqual([]);
    } finally {
      await cliente.end();
    }
  });
});
