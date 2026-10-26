import { createHash } from "node:crypto";
import { config } from "../config";
import { erro } from "../http/erros";
import { lerBytes } from "../http/corpo";

type Tipo = { mime: string; extensoes: string[]; confere: (b: Uint8Array) => boolean };

const comeca = (b: Uint8Array, assinatura: number[]) => assinatura.every((x, i) => b[i] === x);

const ehTexto = (b: Uint8Array) => {
  if (b.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(b);
    return true;
  } catch {
    return false;
  }
};

const TIPOS: Tipo[] = [
  {
    mime: "application/pdf",
    extensoes: ["pdf"],
    confere: (b) => comeca(b, [0x25, 0x50, 0x44, 0x46, 0x2d]),
  },
  {
    mime: "image/png",
    extensoes: ["png"],
    confere: (b) => comeca(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  { mime: "image/jpeg", extensoes: ["jpg", "jpeg"], confere: (b) => comeca(b, [0xff, 0xd8, 0xff]) },
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extensoes: ["docx"],
    confere: (b) => comeca(b, [0x50, 0x4b, 0x03, 0x04]),
  },
  {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extensoes: ["xlsx"],
    confere: (b) => comeca(b, [0x50, 0x4b, 0x03, 0x04]),
  },
  {
    mime: "application/vnd.oasis.opendocument.text",
    extensoes: ["odt"],
    confere: (b) => comeca(b, [0x50, 0x4b, 0x03, 0x04]),
  },
  {
    mime: "application/msword",
    extensoes: ["doc"],
    confere: (b) => comeca(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  },
  {
    mime: "application/vnd.ms-excel",
    extensoes: ["xls"],
    confere: (b) => comeca(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  },
  {
    mime: "application/rtf",
    extensoes: ["rtf"],
    confere: (b) => comeca(b, [0x7b, 0x5c, 0x72, 0x74, 0x66]),
  },
  { mime: "text/plain; charset=utf-8", extensoes: ["txt"], confere: ehTexto },
  { mime: "text/csv; charset=utf-8", extensoes: ["csv"], confere: ehTexto },
];

export const EXTENSOES_ACEITAS = TIPOS.flatMap((t) => t.extensoes);

export function nomeSeguro(bruto: string) {
  const base = bruto.split(/[\\/]/).pop() ?? "";
  const limpo = base
    .normalize("NFC")
    .split("")
    .filter((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127 && !'"<>|*?:'.includes(ch))
    .join("")
    .replace(/^\.+/, "")
    .trim()
    .slice(-200);
  if (!limpo || !limpo.includes(".")) throw erro.validacao("Nome de arquivo inválido.");
  return limpo;
}

export type ArquivoValidado = {
  nome: string;
  mime: string;
  bytes: Uint8Array;
  tamanho: number;
  sha256: string;
};

export function validarArquivo(nomeBruto: string, bytes: Uint8Array): ArquivoValidado {
  const nome = nomeSeguro(nomeBruto);
  const ext = nome.split(".").pop()!.toLowerCase();
  if (bytes.byteLength === 0) throw erro.validacao("Arquivo vazio.");
  const tipo = TIPOS.find((t) => t.extensoes.includes(ext));
  if (!tipo)
    throw erro.tipo(`Tipo de arquivo não permitido. Aceitos: ${EXTENSOES_ACEITAS.join(", ")}.`);
  if (!tipo.confere(bytes)) throw erro.tipo("O conteúdo do arquivo não corresponde à extensão.");
  return {
    nome,
    mime: tipo.mime,
    bytes,
    tamanho: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export async function lerUpload(req: Request) {
  const tipo = req.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data;/i.test(tipo))
    throw erro.tipo("Envie o arquivo como multipart/form-data.");
  const limite = Math.floor(config().MAX_UPLOAD_MB * 1024 * 1024);
  const bruto = await lerBytes(req, limite + 64 * 1024);
  let form: FormData;
  try {
    form = await new Response(Buffer.from(bruto), { headers: { "content-type": tipo } }).formData();
  } catch {
    throw erro.validacao("Formulário inválido.");
  }
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File)) throw erro.validacao("Envie o campo 'arquivo'.");
  if (arquivo.size > limite) throw erro.corpoGrande();
  const campos: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") campos[k] = v;
  return {
    arquivo: validarArquivo(arquivo.name, new Uint8Array(await arquivo.arrayBuffer())),
    campos,
  };
}

export function respostaArquivo(nome: string, mime: string, dados: Uint8Array) {
  const ascii = nome.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(Buffer.from(dados), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(dados.byteLength),
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
