export type Coluna = { titulo: string; peso?: number; numero?: boolean; moeda?: boolean };
export type Celula = string | number;
export type Tabela = { titulo: string; subtitulo?: string; colunas: Coluna[]; linhas: Celula[][] };

const moeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const textoDe = (c: Coluna, v: Celula) =>
  typeof v === "number" ? (c.moeda ? moeda(v) : v.toLocaleString("pt-BR")) : v;

export function nomeArquivo(base: string, ext: string) {
  const limpo = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${limpo || "relatorio"}.${ext}`;
}

export function baixar(dados: Uint8Array, mime: string, nome: string) {
  const url = URL.createObjectURL(new Blob([dados as BlobPart], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const WIN_ANSI: Record<string, number> = {
  "€": 0x80,
  "‚": 0x82,
  "„": 0x84,
  "…": 0x85,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  " ": 0x20,
  " ": 0x20,
};

function paraWinAnsi(s: string) {
  let saida = "";
  for (const ch of s.normalize("NFC")) {
    const c = ch.codePointAt(0)!;
    if (WIN_ANSI[ch] !== undefined) saida += String.fromCharCode(WIN_ANSI[ch]);
    else if ((c >= 0x20 && c < 0x7f) || (c >= 0xa0 && c <= 0xff)) saida += ch;
    else saida += "?";
  }
  return saida.replace(/[\\()]/g, (m) => `\\${m}`);
}

const larguraAprox = (s: string, tamanho: number) => s.length * tamanho * 0.52;

function cortar(s: string, largura: number, tamanho: number) {
  if (larguraAprox(s, tamanho) <= largura) return s;
  let r = s;
  while (r.length > 1 && larguraAprox(`${r}…`, tamanho) > largura) r = r.slice(0, -1);
  return `${r}…`;
}

export function gerarPdf(t: Tabela, rodape: string): Uint8Array {
  const L = 595.28;
  const A = 841.89;
  const margem = 40;
  const util = L - margem * 2;
  const pesoTotal = t.colunas.reduce((s, c) => s + (c.peso ?? 1), 0);
  const larguras = t.colunas.map((c) => ((c.peso ?? 1) / pesoTotal) * util);
  const altLinha = 18;
  const tam = 9;

  const paginas: string[] = [];
  let ops: string[] = [];
  let y = 0;

  const texto = (x: number, yy: number, s: string, fonte: "F1" | "F2", tamanho: number) =>
    ops.push(`BT /${fonte} ${tamanho} Tf ${x.toFixed(2)} ${yy.toFixed(2)} Td (${s}) Tj ET`);

  const linhaTabela = (valores: string[], negrito: boolean) => {
    if (negrito) ops.push(`0.93 0.94 0.96 rg ${margem} ${y - 5} ${util} ${altLinha} re f 0 0 0 rg`);
    let x = margem;
    t.colunas.forEach((c, i) => {
      const w = larguras[i]!;
      const bruto = cortar(valores[i] ?? "", w - 8, tam);
      const s = paraWinAnsi(bruto);
      const dx = c.numero || c.moeda ? w - 4 - larguraAprox(bruto, tam) : 4;
      texto(x + dx, y, s, negrito ? "F2" : "F1", tam);
      x += w;
    });
    ops.push(
      `0.85 0.86 0.88 RG 0.5 w ${margem} ${(y - 6).toFixed(2)} m ${L - margem} ${(y - 6).toFixed(2)} l S`,
    );
    y -= altLinha;
  };

  const novaPagina = () => {
    if (ops.length) paginas.push(ops.join("\n"));
    ops = [];
    y = A - margem - 10;
    if (paginas.length === 0) {
      texto(margem, y, paraWinAnsi(t.titulo), "F2", 16);
      y -= 18;
      if (t.subtitulo) {
        ops.push("0.35 0.38 0.42 rg");
        texto(margem, y, paraWinAnsi(t.subtitulo), "F1", 10);
        ops.push("0 0 0 rg");
        y -= 14;
      }
      y -= 12;
    }
    linhaTabela(
      t.colunas.map((c) => c.titulo),
      true,
    );
  };

  novaPagina();
  if (t.linhas.length === 0) {
    ops.push("0.35 0.38 0.42 rg");
    texto(margem + 4, y, paraWinAnsi("Nenhum registro no período."), "F1", tam);
    ops.push("0 0 0 rg");
  }
  for (const l of t.linhas) {
    if (y < margem + 30) novaPagina();
    linhaTabela(
      t.colunas.map((c, i) => textoDe(c, l[i] ?? "")),
      false,
    );
  }
  paginas.push(ops.join("\n"));

  const total = paginas.length;
  const conteudos = paginas.map((p, i) => {
    const pe = paraWinAnsi(`${rodape} · Página ${i + 1} de ${total}`);
    return `${p}\n0.45 0.47 0.5 rg BT /F1 8 Tf ${margem} ${margem - 16} Td (${pe}) Tj ET`;
  });

  const objetos: string[] = [];
  const add = (o: string) => objetos.push(o);
  const catalogo = add("");
  const raizPaginas = add("");
  const f1 = add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  const f2 = add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );
  const filhas: number[] = [];
  for (const c of conteudos) {
    const cont = add(`<< /Length ${c.length} >>\nstream\n${c}\nendstream`);
    filhas.push(
      add(
        `<< /Type /Page /Parent ${raizPaginas} 0 R /MediaBox [0 0 ${L} ${A}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${cont} 0 R >>`,
      ),
    );
  }
  objetos[catalogo - 1] = `<< /Type /Catalog /Pages ${raizPaginas} 0 R >>`;
  objetos[raizPaginas - 1] =
    `<< /Type /Pages /Kids [${filhas.map((n) => `${n} 0 R`).join(" ")}] /Count ${filhas.length} >>`;

  let saida = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offsets: number[] = [];
  objetos.forEach((o, i) => {
    offsets.push(saida.length);
    saida += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = saida.length;
  saida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) saida += `${String(o).padStart(10, "0")} 00000 n \n`;
  saida += `trailer\n<< /Size ${objetos.length + 1} /Root ${catalogo} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  const bytes = new Uint8Array(saida.length);
  for (let i = 0; i < saida.length; i++) bytes[i] = saida.charCodeAt(i) & 0xff;
  return bytes;
}

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b: Uint8Array) {
  let c = 0xffffffff;
  for (const x of b) c = TABELA_CRC[(c ^ x) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(arquivos: { nome: string; dados: Uint8Array }[]) {
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const a of arquivos) {
    const nome = enc.encode(a.nome);
    const crc = crc32(a.dados);
    const local = new Uint8Array(30 + nome.length);
    const v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x0800, true);
    v.setUint16(8, 0, true);
    v.setUint16(10, 0, true);
    v.setUint16(12, 0x21, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, a.dados.length, true);
    v.setUint32(22, a.dados.length, true);
    v.setUint16(26, nome.length, true);
    v.setUint16(28, 0, true);
    local.set(nome, 30);
    const cd = new Uint8Array(46 + nome.length);
    const w = new DataView(cd.buffer);
    w.setUint32(0, 0x02014b50, true);
    w.setUint16(4, 20, true);
    w.setUint16(6, 20, true);
    w.setUint16(8, 0x0800, true);
    w.setUint16(10, 0, true);
    w.setUint16(12, 0, true);
    w.setUint16(14, 0x21, true);
    w.setUint32(16, crc, true);
    w.setUint32(20, a.dados.length, true);
    w.setUint32(24, a.dados.length, true);
    w.setUint16(28, nome.length, true);
    w.setUint32(42, offset, true);
    cd.set(nome, 46);
    partes.push(local, a.dados);
    central.push(cd);
    offset += local.length + a.dados.length;
  }
  const tamCentral = central.reduce((s, c) => s + c.length, 0);
  const fim = new Uint8Array(22);
  const f = new DataView(fim.buffer);
  f.setUint32(0, 0x06054b50, true);
  f.setUint16(8, arquivos.length, true);
  f.setUint16(10, arquivos.length, true);
  f.setUint32(12, tamCentral, true);
  f.setUint32(16, offset, true);
  const todas = [...partes, ...central, fim];
  const saida = new Uint8Array(todas.reduce((s, p) => s + p.length, 0));
  let p = 0;
  for (const x of todas) {
    saida.set(x, p);
    p += x.length;
  }
  return saida;
}

const xml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .split("")
    .filter((ch) => ch.charCodeAt(0) >= 32 || ch === "\t" || ch === "\n" || ch === "\r")
    .join("");

const colunaExcel = (i: number) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

export function gerarXlsx(t: Tabela): Uint8Array {
  const enc = new TextEncoder();
  const celula = (ref: string, v: Celula, estilo: number) =>
    typeof v === "number"
      ? `<c r="${ref}" s="${estilo}"><v>${v}</v></c>`
      : `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
  const linhas: string[] = [];
  let r = 1;
  linhas.push(`<row r="${r}">${celula(`A${r}`, t.titulo, 1)}</row>`);
  r++;
  if (t.subtitulo) {
    linhas.push(`<row r="${r}">${celula(`A${r}`, t.subtitulo, 0)}</row>`);
    r++;
  }
  r++;
  linhas.push(
    `<row r="${r}">${t.colunas.map((c, i) => celula(`${colunaExcel(i)}${r}`, c.titulo, 1)).join("")}</row>`,
  );
  r++;
  for (const l of t.linhas) {
    linhas.push(
      `<row r="${r}">${t.colunas
        .map((c, i) => celula(`${colunaExcel(i)}${r}`, l[i] ?? "", c.moeda ? 2 : 0))
        .join("")}</row>`,
    );
    r++;
  }
  const cols = t.colunas
    .map(
      (c, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${Math.min(60, Math.max(12, (c.peso ?? 1) * 14))}" customWidth="1"/>`,
    )
    .join("");
  const planilha = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData>${linhas.join("")}</sheetData></worksheet>`;
  const nomeAba = xml(t.titulo.replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
  const arquivos: [string, string][] = [
    [
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    ],
    [
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      "xl/workbook.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${nomeAba}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ],
    [
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ],
    [
      "xl/styles.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`,
    ],
    ["xl/worksheets/sheet1.xml", planilha],
  ];
  return zip(arquivos.map(([nome, conteudo]) => ({ nome, dados: enc.encode(conteudo) })));
}
