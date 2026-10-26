import { config } from "./config";

function partes(d: Date) {
  const f = new Intl.DateTimeFormat("pt-BR", {
    timeZone: config().APP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { dia: p["day"]!, mes: p["month"]!, ano: p["year"]!, hora: `${p["hour"]}:${p["minute"]}` };
}

export const dataHora = (d: Date) => {
  const p = partes(d);
  return `${p.dia}/${p.mes}/${p.ano} ${p.hora}`;
};

export const dataHoraAs = (d: Date) => {
  const p = partes(d);
  return `${p.dia}/${p.mes}/${p.ano} às ${p.hora}`;
};

export const curtoAs = (d: Date) => {
  const p = partes(d);
  return `${p.dia}/${p.mes} às ${p.hora}`;
};

export const dataEHora = (d: Date) => {
  const p = partes(d);
  return { data: `${p.dia}/${p.mes}/${p.ano}`, hora: p.hora };
};

export const isoDeData = (d: Date) => d.toISOString().slice(0, 10);

export const dataDeIso = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

export const numero = (v: { toNumber(): number } | null | undefined) =>
  v == null ? undefined : v.toNumber();

export function tamanhoLegivel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
