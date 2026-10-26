import { describe, expect, it, beforeAll } from "vitest";
import { db } from "@/server/db";
import { hashToken } from "@/server/auth/sessao";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as sessao } from "@/app/api/auth/sessao/route";
import { POST as senha } from "@/app/api/auth/senha/route";
import { GET as listarProcessos } from "@/app/api/processos/route";
import { limparLimites } from "@/server/http/rede";
import { chamar, entrar, novoEscritorio, novoUsuario, SENHA } from "./helpers";

describe("autenticação", () => {
  let escritorioId: string;
  let email: string;

  beforeAll(async () => {
    const e = await novoEscritorio();
    escritorioId = e.escritorioId;
    email = e.admin.email;
  });

  it("login válido cria sessão com cookie HttpOnly/SameSite=Strict e grava só o hash do token", async () => {
    limparLimites();
    const r = await chamar(login, { corpo: { email: email.toUpperCase(), senha: SENHA } });
    expect(r.status).toBe(200);
    expect(r.json.usuario.email).toBe(email);
    expect(r.json.usuario).not.toHaveProperty("senhaHash");
    const cookie = r.res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    const token = cookie.split(";")[0]!.split("=")[1]!;
    const s = await db().sessao.findUnique({ where: { tokenHash: hashToken(token) } });
    expect(s).not.toBeNull();
    expect(await db().sessao.count({ where: { tokenHash: token } })).toBe(0);
    const u = await db().usuario.findUniqueOrThrow({ where: { email } });
    expect(u.senhaHash.startsWith("$argon2id$")).toBe(true);
  });

  it("credenciais inválidas e e-mail inexistente recebem a mesma resposta genérica", async () => {
    limparLimites();
    const errada = await chamar(login, {
      corpo: { email, senha: "senha-errada-123456" },
      ip: "10.1.0.1",
    });
    const inexistente = await chamar(login, {
      corpo: { email: "ninguem@teste.local", senha: "x" },
      ip: "10.1.0.2",
    });
    expect(errada.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(errada.json.erro.mensagem).toBe(inexistente.json.erro.mensagem);
    expect(errada.res.headers.get("set-cookie")).toBeNull();
  });

  it("usuário desativado não consegue entrar, mesmo com a senha certa", async () => {
    const u = await novoUsuario(escritorioId, "advogado", { ativo: false });
    limparLimites();
    const r = await chamar(login, { corpo: { email: u.email, senha: SENHA }, ip: "10.1.0.3" });
    expect(r.status).toBe(401);
    expect(r.json.erro.mensagem).toBe("E-mail ou senha incorretos.");
  });

  it("bloqueia após tentativas excessivas e mantém o bloqueio mesmo com a senha certa", async () => {
    const u = await novoUsuario(escritorioId, "advogado");
    limparLimites();
    for (let i = 0; i < 5; i++) {
      const r = await chamar(login, {
        corpo: { email: u.email, senha: `errada-${i}-xxxxxxxx` },
        ip: `10.2.0.${i}`,
      });
      expect(r.status).toBe(401);
    }
    const bloqueado = await chamar(login, {
      corpo: { email: u.email, senha: SENHA },
      ip: "10.2.0.99",
    });
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.res.headers.get("retry-after")).toBeTruthy();
  });

  it("limita tentativas por IP mesmo variando o e-mail", async () => {
    limparLimites();
    let ultimo = 0;
    for (let i = 0; i < 31; i++) {
      const r = await chamar(login, {
        corpo: { email: `x${i}@teste.local`, senha: "y" },
        ip: "10.3.3.3",
      });
      ultimo = r.status;
    }
    expect(ultimo).toBe(429);
  });

  it("rejeita requisição sem cookie, com token malformado e com token desconhecido", async () => {
    expect((await chamar(sessao)).status).toBe(401);
    expect((await chamar(sessao, { cookie: "lv_sessao=abc" })).status).toBe(401);
    expect((await chamar(sessao, { cookie: `lv_sessao=${"A".repeat(43)}` })).status).toBe(401);
  });

  it("rejeita sessão expirada, revogada e ociosa", async () => {
    const cookie = await entrar(email);
    const token = cookie.split("=")[1]!;
    const where = { tokenHash: hashToken(token) };
    expect((await chamar(sessao, { cookie })).status).toBe(200);

    await db().sessao.update({ where, data: { ultimoUsoEm: new Date(Date.now() - 2 * 3600_000) } });
    expect((await chamar(sessao, { cookie })).status).toBe(401);

    const c2 = await entrar(email);
    await db().sessao.update({
      where: { tokenHash: hashToken(c2.split("=")[1]!) },
      data: { expiraEm: new Date(Date.now() - 1000) },
    });
    expect((await chamar(sessao, { cookie: c2 })).status).toBe(401);
  });

  it("logout revoga a sessão no servidor", async () => {
    const cookie = await entrar(email);
    const r = await chamar(logout, { metodo: "POST", cookie });
    expect(r.status).toBe(204);
    expect(r.res.headers.get("set-cookie")).toMatch(/Max-Age=0/);
    expect((await chamar(sessao, { cookie })).status).toBe(401);
  });

  it("desativar o usuário derruba a sessão já aberta", async () => {
    const u = await novoUsuario(escritorioId, "advogado");
    const cookie = await entrar(u.email);
    await db().usuario.update({ where: { id: u.id }, data: { ativo: false } });
    expect((await chamar(sessao, { cookie })).status).toBe(401);
  });

  it("senha temporária: só permite trocar a senha até definir uma nova", async () => {
    const u = await novoUsuario(escritorioId, "advogado", { deveTrocarSenha: true });
    const cookie = await entrar(u.email);
    const negado = await chamar(listarProcessos, { cookie });
    expect(negado.status).toBe(403);
    expect(negado.json.erro.codigo).toBe("SENHA_EXPIRADA");

    const fraca = await chamar(senha, { cookie, corpo: { senhaAtual: SENHA, novaSenha: "curta" } });
    expect(fraca.status).toBe(422);
    const errada = await chamar(senha, {
      cookie,
      corpo: { senhaAtual: "nao-e-essa-1234", novaSenha: "outra-senha-boa-987" },
    });
    expect(errada.status).toBe(422);

    const ok = await chamar(senha, {
      cookie,
      corpo: { senhaAtual: SENHA, novaSenha: "outra-senha-boa-987" },
    });
    expect(ok.status).toBe(200);
    expect(ok.json.usuario.deveTrocarSenha).toBe(false);
    expect((await chamar(sessao, { cookie })).status).toBe(401);
    const novoCookie = ok.res.headers.get("set-cookie")!.split(";")[0]!;
    expect((await chamar(listarProcessos, { cookie: novoCookie })).status).toBe(200);
    await expect(entrar(u.email)).rejects.toThrow();
    expect(await entrar(u.email, "outra-senha-boa-987")).toBeTruthy();
  });

  it("registra login e falha de login na auditoria sem gravar a senha", async () => {
    const u = await novoUsuario(escritorioId, "advogado");
    limparLimites();
    await chamar(login, { corpo: { email: u.email, senha: "senha-errada-xyz-1" }, ip: "10.4.0.1" });
    await entrar(u.email);
    const eventos = await db().auditoria.findMany({ where: { usuarioId: u.id, acao: "Login" } });
    expect(eventos.map((e) => e.resultado).sort()).toEqual(["falha", "sucesso"]);
    expect(JSON.stringify(eventos.map((e) => ({ ...e, id: String(e.id) })))).not.toContain(
      "senha-errada-xyz-1",
    );
  });

  it("não aceita campos extras nem corpo que não seja JSON no login", async () => {
    limparLimites();
    const texto = await chamar(login, {
      corpo: "email=a&senha=b",
      cabecalhos: { "content-type": "application/x-www-form-urlencoded" },
    });
    expect(texto.status).toBe(415);
    const extra = await chamar(login, { corpo: { email, senha: SENHA, role: "admin" } });
    expect(extra.status).toBe(422);
  });
});
