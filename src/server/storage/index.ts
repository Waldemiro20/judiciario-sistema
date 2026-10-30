import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config";
import { ErroApi } from "../http/erros";
import { log } from "../log";

export type Armazenamento = {
  salvar(chave: string, dados: Uint8Array, mime: string): Promise<void>;
  ler(chave: string): Promise<Uint8Array>;
  remover(chave: string): Promise<void>;
};

const CHAVE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}$/;

export function novaChave(escritorioId: string) {
  return `${escritorioId}/${randomUUID()}`;
}

function conferir(chave: string) {
  if (!CHAVE.test(chave)) throw new Error("chave de armazenamento inválida");
  return chave;
}

function indisponivel(motivo: string, detalhe?: unknown) {
  log.error("falha no armazenamento de arquivos", { motivo, detalhe });
  return new ErroApi(503, "INDISPONIVEL", `Armazenamento de arquivos indisponível: ${motivo}`);
}

function local(): Armazenamento {
  if (process.env["VERCEL"])
    throw indisponivel(
      "configure STORAGE_DRIVER=supabase na Vercel (o disco do servidor não é gravável).",
    );
  const base = path.resolve(config().STORAGE_LOCAL_DIR);
  const caminho = (chave: string) => {
    const p = path.resolve(base, conferir(chave));
    if (!p.startsWith(base + path.sep)) throw new Error("caminho fora do armazenamento");
    return p;
  };
  return {
    async salvar(chave, dados) {
      const p = caminho(chave);
      try {
        await mkdir(path.dirname(p), { recursive: true, mode: 0o700 });
        await writeFile(p, dados, { flag: "wx", mode: 0o600 });
      } catch (e) {
        throw indisponivel("não foi possível gravar no disco do servidor.", e);
      }
    },
    async ler(chave) {
      return new Uint8Array(await readFile(caminho(chave)));
    },
    async remover(chave) {
      await rm(caminho(chave), { force: true });
    },
  };
}

function supabase(): Armazenamento {
  const c = config();
  const raiz = `${c.SUPABASE_URL!.replace(/\/$/, "")}/storage/v1`;
  const base = `${raiz}/object`;
  const bucket = c.SUPABASE_STORAGE_BUCKET;
  const chaveApi = c.SUPABASE_SERVICE_ROLE_KEY!.trim();
  const auth = { Authorization: `Bearer ${chaveApi}`, apikey: chaveApi };
  const sinal = () => AbortSignal.timeout(20_000);
  const chamar = async (url: string, init: RequestInit) => {
    try {
      return await fetch(url, { ...init, signal: sinal() });
    } catch (e) {
      throw indisponivel("sem resposta do Supabase Storage. Tente novamente.", e);
    }
  };
  const falha = async (r: Response, acao: string) => {
    const texto = await r.text().catch(() => "");
    if (r.status === 401 || r.status === 403 || /jws|jwt|signature|unauthorized/i.test(texto))
      return indisponivel(
        "a chave SUPABASE_SERVICE_ROLE_KEY foi recusada pelo Supabase. Confira a variável na Vercel.",
        { acao, status: r.status, texto },
      );
    if (/bucket not found/i.test(texto))
      return indisponivel(`o bucket "${bucket}" não existe no Supabase Storage.`, {
        acao,
        status: r.status,
        texto,
      });
    return indisponivel(`erro ${r.status} ao ${acao}.`, { acao, status: r.status, texto });
  };
  const criarBucket = async () => {
    const r = await chamar(`${raiz}/bucket`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id: bucket, name: bucket, public: false }),
    });
    if (!r.ok && r.status !== 409) {
      const texto = await r.text().catch(() => "");
      if (!/already exists/i.test(texto))
        log.error("falha ao criar bucket", { status: r.status, texto });
    }
  };
  const enviar = (chave: string, dados: Uint8Array, mime: string) =>
    chamar(`${base}/${bucket}/${conferir(chave)}`, {
      method: "POST",
      headers: {
        ...auth,
        "Content-Type": mime,
        "x-upsert": "false",
        "Cache-Control": "no-store",
      },
      body: Buffer.from(dados),
    });
  return {
    async salvar(chave, dados, mime) {
      let r = await enviar(chave, dados, mime);
      if (!r.ok) {
        const texto = await r
          .clone()
          .text()
          .catch(() => "");
        if (/bucket not found/i.test(texto)) {
          await criarBucket();
          r = await enviar(chave, dados, mime);
        }
      }
      if (!r.ok) throw await falha(r, "enviar o arquivo");
    },
    async ler(chave) {
      const r = await chamar(`${base}/authenticated/${bucket}/${conferir(chave)}`, {
        headers: auth,
      });
      if (!r.ok) throw await falha(r, "ler o arquivo");
      return new Uint8Array(await r.arrayBuffer());
    },
    async remover(chave) {
      const r = await chamar(`${base}/${bucket}`, {
        method: "DELETE",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [conferir(chave)] }),
      });
      if (!r.ok) throw await falha(r, "remover o arquivo");
    },
  };
}

export function armazenamento(): Armazenamento {
  return config().STORAGE_DRIVER === "supabase" ? supabase() : local();
}
