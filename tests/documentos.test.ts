import { beforeAll, describe, expect, it } from "vitest";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { inject } from "vitest";
import { db } from "@/server/db";
import * as documentos from "@/app/api/documentos/route";
import * as arquivo from "@/app/api/documentos/[id]/versoes/[versaoId]/arquivo/route";
import * as restaurar from "@/app/api/documentos/[id]/versoes/[versaoId]/restaurar/route";
import * as pastas from "@/app/api/pastas/route";
import * as processos from "@/app/api/processos/route";
import * as clientes from "@/app/api/clientes/route";
import * as docCliente from "@/app/api/clientes/[id]/documentos/[docId]/arquivo/route";
import { nomeSeguro, validarArquivo } from "@/server/storage/arquivos";
import { cenario, chamar, novoCliente } from "./helpers";

type Cenario = Awaited<ReturnType<typeof cenario>>;

const PDF = new TextEncoder().encode("%PDF-1.7\n%conteúdo de teste\n");
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03]);

function form(nome: string, bytes: Uint8Array, campos: Record<string, string> = {}) {
  const f = new FormData();
  f.set("arquivo", new File([Buffer.from(bytes)], nome));
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

describe("documentos e anexos", () => {
  let a: Cenario;
  let b: Cenario;

  beforeAll(async () => {
    a = await cenario();
    b = await cenario();
  });

  it("aceita PDF válido, grava com nome gerado pelo servidor e versiona pelo nome", async () => {
    const r1 = await chamar(documentos.POST, {
      cookie: a.cookieAdvogado,
      corpo: form("Petição inicial.pdf", PDF, { pasta: "Petições" }),
    });
    expect(r1.status).toBe(201);
    expect(r1.json.documento.versoes).toHaveLength(1);
    const r2 = await chamar(documentos.POST, {
      cookie: a.cookieAdvogado,
      corpo: form("Petição inicial.pdf", PDF, { pasta: "Petições" }),
    });
    expect(r2.json.versao).toBe("V2");
    expect(r2.json.documento.id).toBe(r1.json.documento.id);
    const v = await db().documentoVersao.findFirstOrThrow({
      where: { documentoId: r1.json.documento.id },
    });
    expect(v.storageKey).toMatch(/^[0-9a-f-]{36}\/[0-9a-f-]{36}$/);
    expect(v.storageKey).not.toContain("Petição");
    expect(v.mime).toBe("application/pdf");
    expect(v.sha256).toHaveLength(64);
  });

  it("recusa executável disfarçado de PDF, extensões proibidas e arquivo vazio", async () => {
    expect(
      (
        await chamar(documentos.POST, {
          cookie: a.cookieAdvogado,
          corpo: form("contrato.pdf", EXE, { pasta: "Petições" }),
        })
      ).status,
    ).toBe(415);
    expect(
      (
        await chamar(documentos.POST, {
          cookie: a.cookieAdvogado,
          corpo: form("virus.exe", EXE, { pasta: "Petições" }),
        })
      ).status,
    ).toBe(415);
    expect(
      (
        await chamar(documentos.POST, {
          cookie: a.cookieAdvogado,
          corpo: form("pagina.html", new TextEncoder().encode("<script>alert(1)</script>"), {
            pasta: "Petições",
          }),
        })
      ).status,
    ).toBe(415);
    expect(
      (
        await chamar(documentos.POST, {
          cookie: a.cookieAdvogado,
          corpo: form("vazio.pdf", new Uint8Array(), { pasta: "Petições" }),
        })
      ).status,
    ).toBe(422);
  });

  it("neutraliza path traversal no nome e nunca escreve fora do diretório de armazenamento", async () => {
    expect(nomeSeguro("../../etc/passwd.txt")).toBe("passwd.txt");
    expect(nomeSeguro("..\\..\\win.ini.txt")).toBe("win.ini.txt");
    const r = await chamar(documentos.POST, {
      cookie: a.cookieAdvogado,
      corpo: form("../../../fora.txt", new TextEncoder().encode("texto"), { pasta: "Provas" }),
    });
    expect(r.status).toBe(201);
    expect(r.json.documento.nome).toBe("fora.txt");
    const raiz = path.dirname(inject("storageDir"));
    expect(await readdir(raiz)).not.toContain("fora.txt");
  });

  it("recusa arquivo acima do limite", async () => {
    const grande = new Uint8Array(5 * 1024 * 1024);
    grande.set(PDF);
    const r = await chamar(documentos.POST, {
      cookie: a.cookieAdvogado,
      corpo: form("grande.pdf", grande, { pasta: "Petições" }),
    });
    expect(r.status).toBe(413);
  });

  it("download exige autorização e devolve cabeçalhos seguros", async () => {
    const up = (
      await chamar(documentos.POST, {
        cookie: a.cookieAdvogado,
        corpo: form("Parecer.pdf", PDF, { pasta: "Pareceres" }),
      })
    ).json.documento;
    const params = { id: up.id, versaoId: up.versoes[0].id };
    const ok = await chamar(arquivo.GET, { cookie: a.cookieEstagiario, params });
    expect(ok.status).toBe(200);
    expect(ok.res.headers.get("content-disposition")).toMatch(/^attachment;/);
    expect(ok.res.headers.get("content-type")).toBe("application/pdf");
    expect(ok.res.headers.get("content-security-policy")).toContain("sandbox");
    expect(new Uint8Array(await ok.res.arrayBuffer())).toEqual(PDF);
    expect((await chamar(arquivo.GET, { params })).status).toBe(401);
    expect((await chamar(arquivo.GET, { cookie: b.cookieAdmin, params })).status).toBe(404);
    const versaoDeOutro = await chamar(arquivo.GET, {
      cookie: a.cookieAdvogado,
      params: { id: up.id, versaoId: "00000000-0000-4000-8000-000000000000" },
    });
    expect(versaoDeOutro.status).toBe(404);
    expect(await db().auditoria.count({ where: { recursoId: up.id, acao: "Visualizou" } })).toBe(1);
  });

  it("pasta confidencial: só quem está na lista vê, envia ou baixa — o admin não entra automaticamente", async () => {
    const p = await chamar(pastas.POST, {
      cookie: a.cookieAdvogado,
      corpo: { nome: "Estratégia", confidencial: true, acesso: [] },
    });
    expect(p.status).toBe(201);
    expect(p.json.acesso).toEqual([a.advogado.nome]);
    const up = (
      await chamar(documentos.POST, {
        cookie: a.cookieAdvogado,
        corpo: form("tese.pdf", PDF, { pasta: "Estratégia" }),
      })
    ).json.documento;
    const lista = await chamar(documentos.GET, { cookie: a.cookieAdmin });
    expect(lista.json.itens.map((d: { id: string }) => d.id)).not.toContain(up.id);
    expect(
      (
        await chamar(arquivo.GET, {
          cookie: a.cookieAdmin,
          params: { id: up.id, versaoId: up.versoes[0].id },
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await chamar(documentos.POST, {
          cookie: a.cookieEstagiario,
          corpo: form("x.pdf", PDF, { pasta: "Estratégia" }),
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await chamar(restaurar.POST, {
          metodo: "POST",
          cookie: a.cookieAdmin,
          params: { id: up.id, versaoId: up.versoes[0].id },
        })
      ).status,
    ).toBe(404);
  });

  it("documento de processo sigiloso segue o sigilo do processo", async () => {
    const cl = await novoCliente(a.escritorioId);
    const proc = (
      await chamar(processos.POST, {
        cookie: a.cookieAdvogado,
        corpo: {
          numero: `${Date.now()}-44.2024.8.26.0001`,
          titulo: "S",
          cliente: cl.nome,
          area: "Criminal",
          status: "Ativo",
          responsavel: a.advogado.nome,
          risco: "Remoto",
          sigiloso: true,
        },
      })
    ).json;
    const up = await chamar(documentos.POST, {
      cookie: a.cookieAdvogado,
      corpo: form("prova.pdf", PDF, { pasta: "Provas", processo: proc.numero }),
    });
    expect(up.status).toBe(201);
    const lista = await chamar(documentos.GET, { cookie: a.cookieEstagiario });
    expect(lista.json.itens.map((d: { id: string }) => d.id)).not.toContain(up.json.documento.id);
    const tentativa = await chamar(documentos.POST, {
      cookie: a.cookieEstagiario,
      corpo: form("outra.pdf", PDF, { pasta: "Provas", processo: proc.numero }),
    });
    expect(tentativa.status).toBe(422);
  });

  it("restaurar versão cria nova versão sem apagar as anteriores", async () => {
    const d1 = (
      await chamar(documentos.POST, {
        cookie: a.cookieAdvogado,
        corpo: form("minuta.txt", new TextEncoder().encode("v1"), { pasta: "Contratos" }),
      })
    ).json.documento;
    await chamar(documentos.POST, {
      cookie: a.cookieAdvogado,
      corpo: form("minuta.txt", new TextEncoder().encode("v2"), { pasta: "Contratos" }),
    });
    const r = await chamar(restaurar.POST, {
      metodo: "POST",
      cookie: a.cookieAdvogado,
      params: { id: d1.id, versaoId: d1.versoes[0].id },
    });
    expect(r.status).toBe(200);
    expect(r.json.versoes.map((v: { versao: string }) => v.versao)).toEqual(["V1", "V2", "V3"]);
    const baixado = await chamar(arquivo.GET, {
      cookie: a.cookieAdvogado,
      params: { id: d1.id, versaoId: r.json.versoes[2].id },
    });
    expect(baixado.texto).toBe("v1");
  });

  it("documento pessoal do cliente: anexa, baixa, isola por escritório e respeita permissão", async () => {
    const cl = (
      await chamar(clientes.POST, {
        cookie: a.cookieAdmin,
        corpo: {
          nome: `PF ${Date.now()}`,
          tipo: "Pessoa Física",
          documento: "123.456.789-00",
          status: "Ativo",
        },
      })
    ).json;
    const doc = cl.documentos[0];
    const params = { id: cl.id, docId: doc.id };
    expect(
      (
        await chamar(docCliente.POST, {
          cookie: a.cookieEstagiario,
          params,
          corpo: form("rg.pdf", PDF),
        })
      ).status,
    ).toBe(403);
    const r = await chamar(docCliente.POST, {
      cookie: a.cookieAdvogado,
      params,
      corpo: form("rg.pdf", PDF),
    });
    expect(r.status).toBe(200);
    expect(r.json.documentos[0].arquivo).toBe("rg.pdf");
    expect(r.json.documentos[0].enviadoPor).toBe(a.advogado.nome);
    expect((await chamar(docCliente.GET, { cookie: a.cookieEstagiario, params })).status).toBe(200);
    expect((await chamar(docCliente.GET, { cookie: b.cookieAdmin, params })).status).toBe(404);
    expect(
      (await chamar(docCliente.POST, { cookie: b.cookieAdmin, params, corpo: form("rg.pdf", PDF) }))
        .status,
    ).toBe(404);
  });

  it("validação de tipo confere a assinatura binária de cada formato aceito", () => {
    expect(
      validarArquivo("a.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))
        .mime,
    ).toBe("image/png");
    expect(() => validarArquivo("a.png", PDF)).toThrow();
    expect(() => validarArquivo("a.txt", new Uint8Array([0x61, 0x00, 0x62]))).toThrow();
    expect(() => validarArquivo("a.docx", PDF)).toThrow();
    expect(() => validarArquivo("semextensao", PDF)).toThrow();
  });
});
