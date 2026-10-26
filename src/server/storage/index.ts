import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config";

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

function local(): Armazenamento {
  const base = path.resolve(config().STORAGE_LOCAL_DIR);
  const caminho = (chave: string) => {
    const p = path.resolve(base, conferir(chave));
    if (!p.startsWith(base + path.sep)) throw new Error("caminho fora do armazenamento");
    return p;
  };
  return {
    async salvar(chave, dados) {
      const p = caminho(chave);
      await mkdir(path.dirname(p), { recursive: true, mode: 0o700 });
      await writeFile(p, dados, { flag: "wx", mode: 0o600 });
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
  const base = `${c.SUPABASE_URL!.replace(/\/$/, "")}/storage/v1/object`;
  const bucket = c.SUPABASE_STORAGE_BUCKET;
  const auth = {
    Authorization: `Bearer ${c.SUPABASE_SERVICE_ROLE_KEY!}`,
    apikey: c.SUPABASE_SERVICE_ROLE_KEY!,
  };
  const sinal = () => AbortSignal.timeout(20_000);
  return {
    async salvar(chave, dados, mime) {
      const r = await fetch(`${base}/${bucket}/${conferir(chave)}`, {
        method: "POST",
        headers: {
          ...auth,
          "Content-Type": mime,
          "x-upsert": "false",
          "Cache-Control": "no-store",
        },
        body: Buffer.from(dados),
        signal: sinal(),
      });
      if (!r.ok) throw new Error(`falha ao enviar arquivo ao storage (${r.status})`);
    },
    async ler(chave) {
      const r = await fetch(`${base}/authenticated/${bucket}/${conferir(chave)}`, {
        headers: auth,
        signal: sinal(),
      });
      if (!r.ok) throw new Error(`falha ao ler arquivo do storage (${r.status})`);
      return new Uint8Array(await r.arrayBuffer());
    },
    async remover(chave) {
      const r = await fetch(`${base}/${bucket}`, {
        method: "DELETE",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [conferir(chave)] }),
        signal: sinal(),
      });
      if (!r.ok) throw new Error(`falha ao remover arquivo do storage (${r.status})`);
    },
  };
}

export function armazenamento(): Armazenamento {
  return config().STORAGE_DRIVER === "supabase" ? supabase() : local();
}
