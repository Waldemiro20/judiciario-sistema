import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import * as processos from "@/app/api/processos/route";
import * as processo from "@/app/api/processos/[id]/route";
import * as clientes from "@/app/api/clientes/route";
import * as cliente from "@/app/api/clientes/[id]/route";
import * as tarefas from "@/app/api/tarefas/route";
import * as tarefa from "@/app/api/tarefas/[id]/route";
import * as lancamentos from "@/app/api/lancamentos/route";
import * as lancamento from "@/app/api/lancamentos/[id]/route";
import * as eventos from "@/app/api/eventos/route";
import * as evento from "@/app/api/eventos/[id]/route";
import { cenario, chamar, novoCliente } from "./helpers";

type Cenario = Awaited<ReturnType<typeof cenario>>;

describe("integridade dos dados", () => {
  let c: Cenario;
  let outro: Cenario;
  let clienteNome: string;

  const corpoProcesso = (extra: Record<string, unknown> = {}) => ({
    numero: `${Math.floor(Math.random() * 1e9)}-22.2024.8.26.0001`,
    titulo: "Processo íntegro",
    cliente: clienteNome,
    area: "Família",
    status: "Ativo",
    responsavel: c.advogado.nome,
    risco: "Remoto",
    ...extra,
  });

  beforeAll(async () => {
    c = await cenario();
    outro = await cenario();
    clienteNome = (await novoCliente(c.escritorioId)).nome;
  });

  it("rejeita dados inválidos com detalhes por campo e sem eco do valor", async () => {
    const r = await chamar(processos.POST, {
      cookie: c.cookieAdvogado,
      corpo: corpoProcesso({
        area: "Inventada",
        status: "Qualquer",
        valorCausa: -10,
        numero: "<script>",
      }),
    });
    expect(r.status).toBe(422);
    const campos = r.json.erro.detalhes.map((d: { campo: string }) => d.campo);
    expect(campos).toEqual(expect.arrayContaining(["area", "status", "valorCausa", "numero"]));
    expect(r.texto).not.toContain("<script>");
  });

  it("ignora campos controlados pelo servidor (mass assignment)", async () => {
    const r = await chamar(processos.POST, {
      cookie: c.cookieAdvogado,
      corpo: {
        ...corpoProcesso(),
        id: "00000000-0000-0000-0000-000000000000",
        escritorioId: outro.escritorioId,
        versao: 99,
        criadoEm: "2000-01-01T00:00:00Z",
        movimentacoes: [
          {
            id: "x",
            autor: "Juiz Falso",
            acao: "sentença forjada",
            data: "01/01/2000",
            hora: "00:00",
          },
        ],
      },
    });
    expect(r.status).toBe(201);
    const p = await db().processo.findUniqueOrThrow({
      where: { id: r.json.id },
      include: { movimentacoes: true },
    });
    expect(p.id).not.toBe("00000000-0000-0000-0000-000000000000");
    expect(p.escritorioId).toBe(c.escritorioId);
    expect(p.versao).toBe(1);
    expect(p.criadoEm.getFullYear()).toBeGreaterThan(2000);
    expect(p.movimentacoes.map((m) => m.acao)).toEqual(["cadastrou o processo no sistema"]);
  });

  it("andamentos são só inclusão: autor e data vêm do servidor e os antigos não mudam", async () => {
    const criado = (
      await chamar(processos.POST, { cookie: c.cookieAdvogado, corpo: corpoProcesso() })
    ).json;
    const original = criado.movimentacoes[0];
    const r = await chamar(processo.PATCH, {
      metodo: "PATCH",
      cookie: c.cookieEstagiario,
      params: { id: criado.id },
      corpo: {
        versao: criado.versao,
        movimentacoes: [
          { ...original, acao: "texto adulterado" },
          {
            id: "tmp-1",
            autor: "Outra pessoa",
            acao: "juntou petição",
            data: "01/01/1999",
            hora: "03:00",
          },
        ],
      },
    });
    expect(r.status).toBe(200);
    expect(r.json.movimentacoes).toHaveLength(2);
    expect(r.json.movimentacoes[0].acao).toBe("cadastrou o processo no sistema");
    expect(r.json.movimentacoes[1].autor).toBe(c.estagiario.nome);
    expect(r.json.movimentacoes[1].data).not.toBe("01/01/1999");
  });

  it("o banco recusa alterar ou apagar andamentos e auditoria, mesmo fora da API", async () => {
    const m = await db().movimentacao.findFirstOrThrow();
    await expect(
      db().movimentacao.update({ where: { id: m.id }, data: { acao: "x" } }),
    ).rejects.toThrow();
    await expect(db().movimentacao.delete({ where: { id: m.id } })).rejects.toThrow();
    const a = await db().auditoria.findFirstOrThrow();
    await expect(
      db().auditoria.update({ where: { id: a.id }, data: { descricao: "x" } }),
    ).rejects.toThrow();
    await expect(db().auditoria.deleteMany({})).rejects.toThrow();
    await expect(db().$executeRawUnsafe('TRUNCATE "Auditoria"')).rejects.toThrow();
  });

  it("IDs inexistentes e malformados retornam 404", async () => {
    expect(
      (
        await chamar(processo.GET, {
          cookie: c.cookieAdmin,
          params: { id: "00000000-0000-4000-8000-000000000000" },
        })
      ).status,
    ).toBe(404);
    expect(
      (await chamar(processo.GET, { cookie: c.cookieAdmin, params: { id: "1 OR 1=1" } })).status,
    ).toBe(404);
    expect(
      (
        await chamar(tarefa.DELETE, {
          metodo: "DELETE",
          cookie: c.cookieAdmin,
          params: { id: "../../etc" },
        })
      ).status,
    ).toBe(404);
  });

  it("registro duplicado retorna 409 sem detalhes internos do banco", async () => {
    const corpo = corpoProcesso();
    expect((await chamar(processos.POST, { cookie: c.cookieAdvogado, corpo })).status).toBe(201);
    const dup = await chamar(processos.POST, { cookie: c.cookieAdvogado, corpo });
    expect(dup.status).toBe(409);
    expect(dup.texto).not.toMatch(/prisma|unique|constraint|P2002|Processo_escritorioId/i);
    const nome = await chamar(clientes.POST, {
      cookie: c.cookieAdmin,
      corpo: { nome: clienteNome, tipo: "Pessoa Física", documento: "1", status: "Ativo" },
    });
    expect(nome.status).toBe(409);
  });

  it("atualização concorrente com versão desatualizada é recusada", async () => {
    const criado = (
      await chamar(processos.POST, { cookie: c.cookieAdvogado, corpo: corpoProcesso() })
    ).json;
    const primeira = await chamar(processo.PATCH, {
      metodo: "PATCH",
      cookie: c.cookieAdvogado,
      params: { id: criado.id },
      corpo: { fase: "A", versao: criado.versao },
    });
    expect(primeira.status).toBe(200);
    const segunda = await chamar(processo.PATCH, {
      metodo: "PATCH",
      cookie: c.cookieAdmin,
      params: { id: criado.id },
      corpo: { fase: "B", versao: criado.versao },
    });
    expect(segunda.status).toBe(409);
    expect(segunda.json.erro.codigo).toBe("VERSAO_DESATUALIZADA");
    expect((await db().processo.findUniqueOrThrow({ where: { id: criado.id } })).fase).toBe("A");
  });

  it("atualizações simultâneas: só uma vence", async () => {
    const criado = (
      await chamar(processos.POST, { cookie: c.cookieAdvogado, corpo: corpoProcesso() })
    ).json;
    const rs = await Promise.all(
      ["X", "Y", "Z"].map((fase) =>
        chamar(processo.PATCH, {
          metodo: "PATCH",
          cookie: c.cookieAdvogado,
          params: { id: criado.id },
          corpo: { fase, versao: criado.versao },
        }),
      ),
    );
    expect(rs.filter((r) => r.status === 200)).toHaveLength(1);
    expect(rs.filter((r) => r.status === 409)).toHaveLength(2);
  });

  it("requisição repetida com a mesma Idempotency-Key não duplica", async () => {
    const chave = crypto.randomUUID();
    const corpo = {
      descricao: "Honorários parcelados",
      cliente: clienteNome,
      tipo: "Receber",
      categoria: "Honorários",
      modelo: "Avulso",
      valor: 1000,
      vencimento: "2030-05-10",
      situacao: "Em aberto",
    };
    const r1 = await chamar(lancamentos.POST, {
      cookie: c.cookieAdmin,
      corpo,
      cabecalhos: { "idempotency-key": chave },
    });
    const r2 = await chamar(lancamentos.POST, {
      cookie: c.cookieAdmin,
      corpo,
      cabecalhos: { "idempotency-key": chave },
    });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(200);
    expect(r2.json.id).toBe(r1.json.id);
    expect(
      await db().lancamento.count({
        where: { escritorioId: c.escritorioId, descricao: "Honorários parcelados" },
      }),
    ).toBe(1);
  });

  it("falha no meio da operação desfaz tudo (transação)", async () => {
    const corpo = corpoProcesso({ equipe: [c.estagiario.nome, "Pessoa Inexistente"] });
    const r = await chamar(processos.POST, { cookie: c.cookieAdvogado, corpo });
    expect(r.status).toBe(422);
    expect(await db().processo.count({ where: { numero: corpo.numero } })).toBe(0);
    const lote = await chamar(lancamentos.POST, {
      cookie: c.cookieAdmin,
      corpo: {
        lancamentos: [
          {
            descricao: "Parcela 1",
            cliente: clienteNome,
            tipo: "Receber",
            categoria: "Honorários",
            modelo: "Avulso",
            valor: 10,
            vencimento: "2030-01-01",
            situacao: "Em aberto",
          },
          {
            descricao: "Parcela 2",
            cliente: "Cliente Fantasma",
            tipo: "Receber",
            categoria: "Honorários",
            modelo: "Avulso",
            valor: 10,
            vencimento: "2030-02-01",
            situacao: "Em aberto",
          },
        ],
      },
    });
    expect(lote.status).toBe(422);
    expect(
      await db().lancamento.count({
        where: { escritorioId: c.escritorioId, descricao: "Parcela 1" },
      }),
    ).toBe(0);
  });

  it("valida regras de negócio que o tipo não expressa", async () => {
    const recebidoMaior = await chamar(lancamentos.POST, {
      cookie: c.cookieAdmin,
      corpo: {
        descricao: "X",
        cliente: "Interno",
        tipo: "Pagar",
        categoria: "Custas",
        modelo: "Avulso",
        valor: 100,
        valorRecebido: 200,
        vencimento: "2030-01-01",
        situacao: "Em aberto",
      },
    });
    expect(recebidoMaior.status).toBe(422);
    const dataInvalida = await chamar(tarefas.POST, {
      cookie: c.cookieAdvogado,
      corpo: {
        titulo: "T",
        coluna: "A Fazer",
        prioridade: "Baixa",
        responsavel: c.advogado.nome,
        vinculoTipo: "Interno",
        prazo: "2030-02-31",
      },
    });
    expect(dataInvalida.status).toBe(422);
    const semVinculo = await chamar(tarefas.POST, {
      cookie: c.cookieAdvogado,
      corpo: {
        titulo: "T",
        coluna: "A Fazer",
        prioridade: "Baixa",
        responsavel: c.advogado.nome,
        vinculoTipo: "Processo",
        prazo: "2030-02-01",
      },
    });
    expect(semVinculo.status).toBe(422);
  });

  it("comentários e apontamentos de tarefa recebem autor do servidor; exclusão é lógica e auditada", async () => {
    const t = (
      await chamar(tarefas.POST, {
        cookie: c.cookieAdvogado,
        corpo: {
          titulo: "Revisar",
          coluna: "A Fazer",
          prioridade: "Média",
          responsavel: c.advogado.nome,
          vinculoTipo: "Cliente",
          vinculo: clienteNome,
          prazo: "2030-03-01",
        },
      })
    ).json;
    const r = await chamar(tarefa.PATCH, {
      metodo: "PATCH",
      cookie: c.cookieEstagiario,
      params: { id: t.id },
      corpo: {
        versao: t.versao,
        coluna: "Em Andamento",
        comentarios: [{ id: "tmp", autor: "Admin falso", texto: "ok", quando: "01/01" }],
        apontamentos: [{ id: "tmp2", autor: "x", minutos: 30, quando: "x", nota: "pesquisa" }],
      },
    });
    expect(r.status).toBe(200);
    expect(r.json.comentarios[0].autor).toBe(c.estagiario.nome);
    expect(r.json.apontamentos[0].minutos).toBe(30);
    expect(r.json.clienteId).toBeTruthy();
    expect(
      (
        await chamar(tarefa.DELETE, {
          metodo: "DELETE",
          cookie: c.cookieAdvogado,
          params: { id: t.id },
        })
      ).status,
    ).toBe(204);
    expect(
      (await db().tarefa.findUniqueOrThrow({ where: { id: t.id } })).excluidoEm,
    ).not.toBeNull();
    expect(
      (await chamar(tarefa.GET, { cookie: c.cookieAdvogado, params: { id: t.id } })).status,
    ).toBe(404);
    expect(await db().auditoria.count({ where: { recursoId: t.id, acao: "Excluiu" } })).toBe(1);
  });

  it("evento: estagiário só vê agenda; advogado cria e edita com substituição completa", async () => {
    const corpo = {
      titulo: "Audiência de conciliação",
      tipo: "Audiência",
      data: "2030-04-10",
      hora: "14:30",
      duracaoMin: 60,
      advogado: c.advogado.nome,
      local: "Fórum",
      juiz: "Dr. Fulano",
      lembretes: ["1h antes"],
      recorrencia: "Não repete",
    };
    expect((await chamar(eventos.POST, { cookie: c.cookieEstagiario, corpo })).status).toBe(403);
    const e = await chamar(eventos.POST, { cookie: c.cookieAdvogado, corpo });
    expect(e.status).toBe(201);
    const { juiz: _juiz, ...semJuiz } = e.json;
    const r = await chamar(evento.PUT, {
      metodo: "PUT",
      cookie: c.cookieAdvogado,
      params: { id: e.json.id },
      corpo: semJuiz,
    });
    expect(r.status).toBe(200);
    expect(r.json.juiz).toBeUndefined();
    expect((await chamar(eventos.GET, { cookie: c.cookieEstagiario })).status).toBe(200);
  });

  it("cliente: histórico só cresce e documento com arquivo não pode ser removido", async () => {
    const criado = (
      await chamar(clientes.POST, {
        cookie: c.cookieAdmin,
        corpo: {
          nome: `Cliente H ${Date.now()}`,
          tipo: "Pessoa Jurídica",
          documento: "12.345.678/0001-90",
          status: "Ativo",
        },
      })
    ).json;
    expect(criado.documentos.map((d: { nome: string }) => d.nome)).toEqual([
      "Contrato social",
      "Cartão CNPJ",
      "Procuração",
    ]);
    const r = await chamar(cliente.PATCH, {
      metodo: "PATCH",
      cookie: c.cookieAdmin,
      params: { id: criado.id },
      corpo: { ...criado, historico: [{ quando: "x", texto: "Ligação com o cliente" }] },
    });
    expect(r.status).toBe(200);
    expect(r.json.historico.map((h: { texto: string }) => h.texto)).toContain(
      "Ligação com o cliente",
    );
    expect(r.json.historico.length).toBe(criado.historico.length + 1);
    await db().docPessoal.update({
      where: { id: criado.documentos[0].id },
      data: { storageKey: `${c.escritorioId}/${crypto.randomUUID()}`, arquivo: "a.pdf" },
    });
    const remover = await chamar(cliente.PATCH, {
      metodo: "PATCH",
      cookie: c.cookieAdmin,
      params: { id: criado.id },
      corpo: { versao: r.json.versao, documentos: r.json.documentos.slice(1) },
    });
    expect(remover.status).toBe(409);
  });

  it("lançamento: edição troca situação com versão e exclusão é lógica", async () => {
    const l = (
      await chamar(lancamentos.POST, {
        cookie: c.cookieAdmin,
        corpo: {
          descricao: "Custas",
          cliente: "Interno",
          tipo: "Pagar",
          categoria: "Custas",
          modelo: "Avulso",
          valor: 50.555,
          vencimento: "2030-01-01",
          situacao: "Em aberto",
        },
      })
    ).json;
    expect(l.valor).toBe(50.56);
    expect(l.cliente).toBe("Interno");
    const pago = await chamar(lancamento.PUT, {
      metodo: "PUT",
      cookie: c.cookieAdmin,
      params: { id: l.id },
      corpo: { ...l, situacao: "Pago" },
    });
    expect(pago.status).toBe(200);
    expect(pago.json.versao).toBe(2);
    expect(
      (
        await chamar(lancamento.DELETE, {
          metodo: "DELETE",
          cookie: c.cookieAdmin,
          params: { id: l.id },
        })
      ).status,
    ).toBe(204);
    expect(await db().lancamento.count({ where: { id: l.id } })).toBe(1);
  });
});
