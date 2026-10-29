import { afterEach, describe, expect, it, vi } from "vitest";
import { config, ConfiguracaoInvalida, redefinirConfig } from "@/server/config";
import { log } from "@/server/log";
import { senhaForte, senhaTemporaria } from "@/server/auth/senha";
import { cookieSessao, tokenDaRequisicao } from "@/server/auth/sessao";
import { aplicarRegrasFixas, permite } from "@/server/authz/permissoes";
import { PERMISSOES_PADRAO } from "@/lib/data";
import { conexao } from "@/server/db";
import { SUPABASE_ROOT_CA_2021 } from "@/server/certificados";

describe("configuração", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
    redefinirConfig();
  });

  it("falha de forma clara quando falta variável crítica, sem expor valores", () => {
    delete process.env["DATABASE_URL"];
    redefinirConfig();
    expect(() => config()).toThrow(ConfiguracaoInvalida);
    expect(() => config()).toThrow(/DATABASE_URL/);
  });

  it("em produção exige APP_ORIGIN e armazenamento persistente", () => {
    Object.assign(process.env, { NODE_ENV: "production", STORAGE_DRIVER: "local" });
    delete process.env["APP_ORIGIN"];
    redefinirConfig();
    expect(() => config()).toThrow(/APP_ORIGIN/);
    expect(() => config()).toThrow(/STORAGE_DRIVER/);
  });

  it("em produção o cookie é Secure e usa o prefixo __Host-", () => {
    Object.assign(process.env, {
      NODE_ENV: "production",
      APP_ORIGIN: "https://app.exemplo.test",
      STORAGE_DRIVER: "supabase",
      SUPABASE_URL: "https://projeto.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "chave-de-servico-ficticia-1234567890",
    });
    redefinirConfig();
    const c = cookieSessao("A".repeat(43));
    expect(c).toMatch(/^__Host-lv_sessao=/);
    expect(c).toMatch(/Secure/);
    expect(c).toMatch(/HttpOnly/);
    expect(c).not.toMatch(/Domain=/);
    const req = new Request("https://app.exemplo.test", {
      headers: { cookie: `lv_sessao=${"A".repeat(43)}` },
    });
    expect(tokenDaRequisicao(req)).toBeUndefined();
  });
});

describe("logs", () => {
  it("redige campos sensíveis e não registra tokens nem senhas", () => {
    const espiao = vi.spyOn(console, "error").mockImplementation(() => undefined);
    log.error("teste", {
      senha: "segredo-1",
      token: "tok",
      cookie: "c",
      cpf: "123",
      dados: { authorization: "Bearer x" },
    });
    const linha = espiao.mock.calls[0]![0] as string;
    espiao.mockRestore();
    expect(linha).not.toMatch(/segredo-1|Bearer x|"tok"/);
    expect(JSON.parse(linha).senha).toBe("[REDIGIDO]");
  });
});

describe("senhas", () => {
  it("aplica política mínima", () => {
    expect(senhaForte.safeParse("curta").success).toBe(false);
    expect(senhaForte.safeParse("123456").success).toBe(true);
    expect(senhaForte.safeParse("uma frase longa e única").success).toBe(true);
  });

  it("senhas temporárias são aleatórias e longas", () => {
    const a = senhaTemporaria();
    expect(a).toHaveLength(20);
    expect(a).not.toBe(senhaTemporaria());
  });
});

describe("regras fixas de permissão", () => {
  it("financeiro só para admin e admin nunca perde Configurações, mesmo com o banco adulterado", () => {
    const adulterado = { ...PERMISSOES_PADRAO.estagiario, Financeiro: "editar" as const };
    expect(aplicarRegrasFixas("estagiario", adulterado).Financeiro).toBe("nenhum");
    const adminSemConfig = { ...PERMISSOES_PADRAO.admin, Configurações: "nenhum" as const };
    expect(aplicarRegrasFixas("admin", adminSemConfig).Configurações).toBe("editar");
    expect(permite(PERMISSOES_PADRAO.estagiario, "Clientes", "editar")).toBe(false);
    expect(permite(PERMISSOES_PADRAO.estagiario, "Clientes", "ver")).toBe(true);
  });
});

describe("conexão com o banco", () => {
  it("sem sslmode mantém a URL como está", () => {
    const url = "postgresql://u:s@127.0.0.1:5432/db";
    expect(conexao({ DATABASE_URL: url, DATABASE_SSL_CA: undefined })).toEqual({
      connectionString: url,
    });
  });

  it("no Supabase verifica o certificado com a raiz do Supabase", () => {
    const r = conexao({
      DATABASE_URL:
        "postgresql://u:s@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require",
      DATABASE_SSL_CA: undefined,
    });
    expect(r.connectionString).not.toContain("sslmode");
    expect(r.ssl).toEqual({ rejectUnauthorized: true, ca: SUPABASE_ROOT_CA_2021 });
  });

  it("em outros servidores usa a raiz informada ou as raízes do sistema, sempre verificando", () => {
    const base = "postgresql://u:s@db.exemplo.com:5432/postgres?sslmode=require";
    expect(conexao({ DATABASE_URL: base, DATABASE_SSL_CA: undefined }).ssl).toEqual({
      rejectUnauthorized: true,
    });
    const ca = "-----BEGIN CERTIFICATE-----x";
    expect(conexao({ DATABASE_URL: base, DATABASE_SSL_CA: ca }).ssl).toEqual({
      rejectUnauthorized: true,
      ca,
    });
  });

  it("não aceita sslmode=no-verify como atalho para desligar a verificação", () => {
    const r = conexao({
      DATABASE_URL: "postgresql://u:s@x.supabase.co:5432/postgres?sslmode=no-verify",
      DATABASE_SSL_CA: undefined,
    });
    expect(r.ssl?.rejectUnauthorized).toBe(true);
  });
});

describe("variáveis vazias", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
    redefinirConfig();
  });

  it("são tratadas como ausentes", () => {
    process.env["COOKIE_SECURE"] = "";
    process.env["APP_ORIGIN"] = "";
    redefinirConfig();
    expect(config().COOKIE_SECURE).toBeUndefined();
    expect(config().APP_ORIGIN).toBeUndefined();
  });
});
