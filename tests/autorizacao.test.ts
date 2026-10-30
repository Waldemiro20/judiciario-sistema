import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import * as processos from "@/app/api/processos/route";
import * as processo from "@/app/api/processos/[id]/route";
import * as clientes from "@/app/api/clientes/route";
import * as cliente from "@/app/api/clientes/[id]/route";
import * as tarefas from "@/app/api/tarefas/route";
import * as tarefa from "@/app/api/tarefas/[id]/route";
import * as lancamentos from "@/app/api/lancamentos/route";
import * as usuarios from "@/app/api/usuarios/route";
import * as usuario from "@/app/api/usuarios/[id]/route";
import * as senhaUsuario from "@/app/api/usuarios/[id]/senha/route";
import * as permissoes from "@/app/api/permissoes/route";
import * as auditoria from "@/app/api/auditoria/route";
import * as eventos from "@/app/api/eventos/route";
import * as intimacoes from "@/app/api/intimacoes/route";
import * as escritorio from "@/app/api/escritorio/route";
import { cenario, chamar, novoCliente, novoUsuario } from "./helpers";

type Cenario = Awaited<ReturnType<typeof cenario>>;

const novoProcesso = (c: Cenario, clienteNome: string, extra: Record<string, unknown> = {}) => ({
  numero: `${Math.floor(Math.random() * 1e7)}-11.2024.8.26.0100`,
  titulo: "Ação de teste",
  cliente: clienteNome,
  area: "Direito Civil",
  status: "Ativo",
  responsavel: c.advogado.nome,
  risco: "Possível",
  ...extra,
});

describe("autorização", () => {
  let a: Cenario;
  let b: Cenario;
  let clienteA: { id: string; nome: string };
  let processoA: { id: string; numero: string };
  let sigiloso: { id: string; numero: string };

  beforeAll(async () => {
    a = await cenario();
    b = await cenario();
    clienteA = await novoCliente(a.escritorioId);
    processoA = (
      await chamar(processos.POST, {
        cookie: a.cookieAdvogado,
        corpo: novoProcesso(a, clienteA.nome),
      })
    ).json;
    sigiloso = (
      await chamar(processos.POST, {
        cookie: a.cookieAdvogado,
        corpo: novoProcesso(a, clienteA.nome, { sigiloso: true }),
      })
    ).json;
  });

  it("endpoints protegidos exigem autenticação", async () => {
    for (const h of [
      processos.GET,
      clientes.GET,
      tarefas.GET,
      lancamentos.GET,
      usuarios.GET,
      auditoria.GET,
      eventos.GET,
    ]) {
      expect((await chamar(h)).status).toBe(401);
    }
    expect((await chamar(processos.POST, { corpo: {} })).status).toBe(401);
  });

  it("estagiário só lê clientes; não cria nem altera", async () => {
    expect((await chamar(clientes.GET, { cookie: a.cookieEstagiario })).status).toBe(200);
    const criar = await chamar(clientes.POST, {
      cookie: a.cookieEstagiario,
      corpo: { nome: "Novo", tipo: "Pessoa Física", documento: "111.111.111-11", status: "Ativo" },
    });
    expect(criar.status).toBe(403);
    const alterar = await chamar(cliente.PATCH, {
      metodo: "PATCH",
      cookie: a.cookieEstagiario,
      params: { id: clienteA.id },
      corpo: { nome: "Hackeado", versao: 1 },
    });
    expect(alterar.status).toBe(403);
    expect((await db().cliente.findUniqueOrThrow({ where: { id: clienteA.id } })).nome).toBe(
      clienteA.nome,
    );
  });

  it("financeiro é exclusivo do administrador", async () => {
    expect((await chamar(lancamentos.GET, { cookie: a.cookieAdvogado })).status).toBe(403);
    expect((await chamar(lancamentos.GET, { cookie: a.cookieEstagiario })).status).toBe(403);
    expect((await chamar(lancamentos.GET, { cookie: a.cookieAdmin })).status).toBe(200);
  });

  it("usuário comum não acessa recursos administrativos", async () => {
    expect((await chamar(auditoria.GET, { cookie: a.cookieAdvogado })).status).toBe(403);
    expect((await chamar(permissoes.GET, { cookie: a.cookieAdvogado })).status).toBe(403);
    const criar = await chamar(usuarios.POST, {
      cookie: a.cookieAdvogado,
      corpo: { nome: "Intruso", email: "intruso@teste.local", role: "admin" },
    });
    expect(criar.status).toBe(403);
    expect(await db().usuario.count({ where: { email: "intruso@teste.local" } })).toBe(0);
    const esc = await chamar(escritorio.PATCH, {
      metodo: "PATCH",
      cookie: a.cookieAdvogado,
      corpo: { nomeEscritorio: "X" },
    });
    expect(esc.status).toBe(403);
  });

  it("ninguém altera a própria função nem se desativa (nem o admin)", async () => {
    const r = await chamar(usuario.PATCH, {
      metodo: "PATCH",
      cookie: a.cookieAdvogado,
      params: { id: a.advogado.id },
      corpo: { role: "admin" },
    });
    expect(r.status).toBe(403);
    const admin = await chamar(usuario.PATCH, {
      metodo: "PATCH",
      cookie: a.cookieAdmin,
      params: { id: a.admin.id },
      corpo: { ativo: false },
    });
    expect(admin.status).toBe(403);
    expect((await db().usuario.findUniqueOrThrow({ where: { id: a.advogado.id } })).role).toBe(
      "advogado",
    );
  });

  it("rejeita campos de privilégio enviados pelo cliente", async () => {
    const r = await chamar(usuario.PATCH, {
      metodo: "PATCH",
      cookie: a.cookieAdmin,
      params: { id: a.estagiario.id },
      corpo: { nome: a.estagiario.nome, escritorioId: b.escritorioId, senhaHash: "x" },
    });
    expect(r.status).toBe(422);
    const u = await db().usuario.findUniqueOrThrow({ where: { id: a.estagiario.id } });
    expect(u.escritorioId).toBe(a.escritorioId);
  });

  it("perfil com Configurações liberada ainda não consegue promover alguém a admin", async () => {
    await db().permissaoPerfil.update({
      where: {
        escritorioId_role_modulo: {
          escritorioId: a.escritorioId,
          role: "advogado",
          modulo: "Configurações",
        },
      },
      data: { nivel: "editar" },
    });
    try {
      const promover = await chamar(usuario.PATCH, {
        metodo: "PATCH",
        cookie: a.cookieAdvogado,
        params: { id: a.estagiario.id },
        corpo: { role: "admin" },
      });
      expect(promover.status).toBe(403);
      const propria = await chamar(permissoes.PUT, {
        metodo: "PUT",
        cookie: a.cookieAdvogado,
        corpo: { role: "advogado", modulo: "Financeiro", nivel: "editar" },
      });
      expect(propria.status).toBe(403);
      const perfil = await chamar(permissoes.PUT, {
        metodo: "PUT",
        cookie: a.cookieAdvogado,
        corpo: { role: "advogado", modulo: "Relatórios", nivel: "editar" },
      });
      expect(perfil.status).toBe(403);
      const resetar = await chamar(senhaUsuario.POST, {
        metodo: "POST",
        cookie: a.cookieAdvogado,
        params: { id: a.admin.id },
      });
      expect(resetar.status).toBe(403);
    } finally {
      await db().permissaoPerfil.update({
        where: {
          escritorioId_role_modulo: {
            escritorioId: a.escritorioId,
            role: "advogado",
            modulo: "Configurações",
          },
        },
        data: { nivel: "nenhum" },
      });
    }
  });

  it("um admin pode rebaixar outro admin, mas o escritório nunca fica sem admin ativo", async () => {
    const outro = await cenario();
    const segundo = await novoUsuario(outro.escritorioId, "admin");
    const rebaixar = await chamar(usuario.PATCH, {
      metodo: "PATCH",
      cookie: outro.cookieAdmin,
      params: { id: segundo.id },
      corpo: { role: "advogado" },
    });
    expect(rebaixar.status).toBe(200);
    const proprio = await chamar(usuario.PATCH, {
      metodo: "PATCH",
      cookie: outro.cookieAdmin,
      params: { id: outro.admin.id },
      corpo: { role: "advogado" },
    });
    expect(proprio.status).toBe(403);
    expect(
      await db().usuario.count({
        where: { escritorioId: outro.escritorioId, role: "admin", ativo: true },
      }),
    ).toBe(1);
  });

  it("só o admin exclui cliente, e não quando há processo vinculado", async () => {
    const outro = await cenario();
    const livre = await novoCliente(outro.escritorioId);
    for (const cookie of [outro.cookieAdvogado, outro.cookieEstagiario]) {
      const negado = await chamar(cliente.DELETE, {
        metodo: "DELETE",
        cookie,
        params: { id: livre.id },
      });
      expect(negado.status).toBe(403);
    }
    const excluir = await chamar(cliente.DELETE, {
      metodo: "DELETE",
      cookie: outro.cookieAdmin,
      params: { id: livre.id },
    });
    expect(excluir.status).toBe(204);
    const sumiu = await chamar(cliente.GET, {
      cookie: outro.cookieAdmin,
      params: { id: livre.id },
    });
    expect(sumiu.status).toBe(404);
    const lista = await chamar(clientes.GET, { cookie: outro.cookieAdmin });
    expect(lista.json.itens.some((x: { id: string }) => x.id === livre.id)).toBe(false);
    const recriado = await chamar(clientes.POST, {
      cookie: outro.cookieAdmin,
      corpo: {
        nome: livre.nome,
        tipo: "Pessoa Física",
        documento: "000.000.000-00",
        status: "Ativo",
      },
    });
    expect(recriado.status).toBe(201);

    const comProcesso = await novoCliente(outro.escritorioId);
    const criado = await chamar(processos.POST, {
      cookie: outro.cookieAdvogado,
      corpo: novoProcesso(outro, comProcesso.nome),
    });
    expect(criado.status).toBe(201);
    const bloqueado = await chamar(cliente.DELETE, {
      metodo: "DELETE",
      cookie: outro.cookieAdmin,
      params: { id: comProcesso.id },
    });
    expect(bloqueado.status).toBe(409);
  });

  it("admin exclui usuário sem vínculos, mas não a si mesmo nem quem é responsável por processos", async () => {
    const outro = await cenario();
    const livre = await novoUsuario(outro.escritorioId, "estagiario");
    const negado = await chamar(usuario.DELETE, {
      metodo: "DELETE",
      cookie: outro.cookieAdvogado,
      params: { id: livre.id },
    });
    expect(negado.status).toBe(403);
    const excluir = await chamar(usuario.DELETE, {
      metodo: "DELETE",
      cookie: outro.cookieAdmin,
      params: { id: livre.id },
    });
    expect(excluir.status).toBe(204);
    expect(await db().usuario.findUnique({ where: { id: livre.id } })).toBeNull();
    const proprio = await chamar(usuario.DELETE, {
      metodo: "DELETE",
      cookie: outro.cookieAdmin,
      params: { id: outro.admin.id },
    });
    expect(proprio.status).toBe(403);
    const cliente = await novoCliente(outro.escritorioId);
    const criado = await chamar(processos.POST, {
      cookie: outro.cookieAdvogado,
      corpo: novoProcesso(outro, cliente.nome),
    });
    expect(criado.status).toBe(201);
    const comVinculo = await chamar(usuario.DELETE, {
      metodo: "DELETE",
      cookie: outro.cookieAdmin,
      params: { id: outro.advogado.id },
    });
    expect(comVinculo.status).toBe(409);
  });

  it("senha definida pelo admin vale sem troca obrigatória", async () => {
    const outro = await cenario();
    const r = await chamar(usuarios.POST, {
      cookie: outro.cookieAdmin,
      corpo: {
        nome: "Nova Pessoa",
        email: `nova-${Date.now()}@teste.local`,
        role: "advogado",
        senha: "abc123",
      },
    });
    expect(r.status).toBe(201);
    const u = await db().usuario.findUniqueOrThrow({ where: { id: r.json.usuario.id } });
    expect(u.deveTrocarSenha).toBe(false);
  });

  it("alteração de permissão pelo admin vale na hora e fica auditada", async () => {
    const antes = await chamar(clientes.POST, {
      cookie: a.cookieEstagiario,
      corpo: {
        nome: `Cliente E ${Date.now()}`,
        tipo: "Pessoa Física",
        documento: "123",
        status: "Ativo",
      },
    });
    expect(antes.status).toBe(403);
    const r = await chamar(permissoes.PUT, {
      metodo: "PUT",
      cookie: a.cookieAdmin,
      corpo: { role: "estagiario", modulo: "Clientes", nivel: "editar" },
    });
    expect(r.status).toBe(200);
    expect(r.json.estagiario.Clientes).toBe("editar");
    const depois = await chamar(clientes.POST, {
      cookie: a.cookieEstagiario,
      corpo: {
        nome: `Cliente E ${Date.now()}`,
        tipo: "Pessoa Física",
        documento: "123",
        status: "Ativo",
      },
    });
    expect(depois.status).toBe(201);
    const log = await db().auditoria.findFirst({
      where: { escritorioId: a.escritorioId, recursoTipo: "PermissaoPerfil" },
    });
    expect(log?.descricao).toContain("estagiario em Clientes");
    const financeiro = await chamar(permissoes.PUT, {
      metodo: "PUT",
      cookie: a.cookieAdmin,
      corpo: { role: "advogado", modulo: "Financeiro", nivel: "editar" },
    });
    expect(financeiro.status).toBe(403);
  });

  describe("isolamento entre escritórios", () => {
    it("não lista, não lê e não altera processos de outro escritório", async () => {
      const lista = await chamar(processos.GET, { cookie: b.cookieAdmin });
      expect(lista.json.itens.map((p: { id: string }) => p.id)).not.toContain(processoA.id);
      expect(
        (await chamar(processo.GET, { cookie: b.cookieAdmin, params: { id: processoA.id } }))
          .status,
      ).toBe(404);
      const alterar = await chamar(processo.PATCH, {
        metodo: "PATCH",
        cookie: b.cookieAdmin,
        params: { id: processoA.id },
        corpo: { titulo: "Invadido", versao: 1 },
      });
      expect(alterar.status).toBe(404);
      expect((await db().processo.findUniqueOrThrow({ where: { id: processoA.id } })).titulo).toBe(
        "Ação de teste",
      );
    });

    it("não lê cliente de outro escritório por ID", async () => {
      expect(
        (await chamar(cliente.GET, { cookie: b.cookieAdmin, params: { id: clienteA.id } })).status,
      ).toBe(404);
    });

    it("não vincula registros a clientes ou usuários de outro escritório pelo nome", async () => {
      const r = await chamar(processos.POST, {
        cookie: b.cookieAdmin,
        corpo: novoProcesso(b, clienteA.nome, { responsavel: b.admin.nome }),
      });
      expect(r.status).toBe(422);
      const t = await chamar(tarefas.POST, {
        cookie: b.cookieAdmin,
        corpo: {
          titulo: "T",
          coluna: "A Fazer",
          prioridade: "Baixa",
          responsavel: a.advogado.nome,
          vinculoTipo: "Interno",
          prazo: "2030-01-01",
        },
      });
      expect(t.status).toBe(422);
    });

    it("lista de usuários só traz o próprio escritório e esconde e-mail de quem não administra", async () => {
      const r = await chamar(usuarios.GET, { cookie: b.cookieAdvogado });
      expect(r.json.map((u: { id: string }) => u.id)).not.toContain(a.admin.id);
      expect(r.json.every((u: { email: string }) => u.email === "")).toBe(true);
    });
  });

  describe("processo sigiloso", () => {
    it("fica invisível para quem não é responsável nem da equipe — inclusive o administrador", async () => {
      for (const cookie of [a.cookieAdmin, a.cookieEstagiario]) {
        const lista = await chamar(processos.GET, { cookie });
        expect(lista.json.itens.map((p: { id: string }) => p.id)).not.toContain(sigiloso.id);
        expect((await chamar(processo.GET, { cookie, params: { id: sigiloso.id } })).status).toBe(
          404,
        );
      }
      const resp = await chamar(processo.GET, {
        cookie: a.cookieAdvogado,
        params: { id: sigiloso.id },
      });
      expect(resp.status).toBe(200);
    });

    it("tarefas e intimações ligadas ao processo sigiloso também ficam ocultas", async () => {
      const t = await chamar(tarefas.POST, {
        cookie: a.cookieAdvogado,
        corpo: {
          titulo: "Prazo sigiloso",
          coluna: "A Fazer",
          prioridade: "Alta",
          responsavel: a.advogado.nome,
          vinculoTipo: "Processo",
          vinculo: sigiloso.numero,
          prazo: "2030-01-01",
        },
      });
      expect(t.status).toBe(201);
      const listaAdmin = await chamar(tarefas.GET, { cookie: a.cookieAdmin });
      expect(listaAdmin.json.itens.map((x: { id: string }) => x.id)).not.toContain(t.json.id);
      expect(
        (await chamar(tarefa.GET, { cookie: a.cookieAdmin, params: { id: t.json.id } })).status,
      ).toBe(404);
      const del = await chamar(tarefa.DELETE, {
        metodo: "DELETE",
        cookie: a.cookieAdmin,
        params: { id: t.json.id },
      });
      expect(del.status).toBe(404);

      const i = await chamar(intimacoes.POST, {
        cookie: a.cookieAdvogado,
        corpo: {
          processo: sigiloso.numero,
          resumo: "Intimação sigilosa",
          prazoDias: 5,
          lida: false,
        },
      });
      expect(i.status).toBe(201);
      const listaI = await chamar(intimacoes.GET, { cookie: a.cookieAdmin });
      expect(listaI.json.itens.map((x: { id: string }) => x.id)).not.toContain(i.json.id);
    });

    it("quem não tem acesso não consegue vincular nada ao processo sigiloso nem descobrir que ele existe", async () => {
      const t = await chamar(tarefas.POST, {
        cookie: a.cookieAdmin,
        corpo: {
          titulo: "x",
          coluna: "A Fazer",
          prioridade: "Alta",
          responsavel: a.admin.nome,
          vinculoTipo: "Processo",
          vinculo: sigiloso.numero,
          prazo: "2030-01-01",
        },
      });
      expect(t.status).toBe(422);
      const i = await chamar(intimacoes.POST, {
        cookie: a.cookieAdmin,
        corpo: { processo: sigiloso.numero, resumo: "x", prazoDias: 1, lida: false },
      });
      expect(i.status).toBe(422);
      expect(t.json.erro.detalhes[0].mensagem).toBe(
        `Processo "${sigiloso.numero}" não encontrado.`,
      );
      expect(i.json.erro.mensagem).toBe("Processo não encontrado.");
    });

    it("só o responsável retira o sigilo ou mexe na equipe", async () => {
      const comEquipe = (
        await chamar(processos.POST, {
          cookie: a.cookieAdvogado,
          corpo: novoProcesso(a, clienteA.nome, { sigiloso: true, equipe: [a.estagiario.nome] }),
        })
      ).json;
      const atual = (
        await chamar(processo.GET, { cookie: a.cookieEstagiario, params: { id: comEquipe.id } })
      ).json;
      const tirar = await chamar(processo.PATCH, {
        metodo: "PATCH",
        cookie: a.cookieEstagiario,
        params: { id: comEquipe.id },
        corpo: { ...atual, sigiloso: false },
      });
      expect(tirar.status).toBe(403);
      const editarNormal = await chamar(processo.PATCH, {
        metodo: "PATCH",
        cookie: a.cookieEstagiario,
        params: { id: comEquipe.id },
        corpo: { ...atual, fase: "Instrução" },
      });
      expect(editarNormal.status).toBe(200);
      expect(
        (await db().processo.findUniqueOrThrow({ where: { id: comEquipe.id } })).sigiloso,
      ).toBe(true);
    });

    it("o acesso ao processo sigiloso fica auditado", async () => {
      const n = await db().auditoria.count({
        where: { recursoId: sigiloso.id, acao: "Visualizou" },
      });
      expect(n).toBeGreaterThan(0);
    });
  });

  it("tentativas de acesso negado são registradas na auditoria", async () => {
    await chamar(lancamentos.GET, { cookie: a.cookieEstagiario });
    const negados = await db().auditoria.count({
      where: { usuarioId: a.estagiario.id, resultado: "negado", modulo: "Financeiro" },
    });
    expect(negados).toBeGreaterThan(0);
  });
});
