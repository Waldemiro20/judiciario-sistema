import { parseISO, toISO, type Evento, type TipoEvento } from "./data";

export type Ocorrencia = { evento: Evento; data: string };

/** Expande eventos (inclusive recorrentes) dentro do intervalo [inicio, fim]. */
export function ocorrencias(eventos: Evento[], inicio: Date, fim: Date): Ocorrencia[] {
  const out: Ocorrencia[] = [];
  const ini = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()).getTime();
  const end = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate()).getTime();

  for (const e of eventos) {
    const base = parseISO(e.data);
    if (e.recorrencia === "Não repete") {
      if (base.getTime() >= ini && base.getTime() <= end) out.push({ evento: e, data: e.data });
      continue;
    }
    const cur = new Date(base);
    let guard = 0;
    while (cur.getTime() <= end && guard++ < 800) {
      if (cur.getTime() >= ini) out.push({ evento: e, data: toISO(cur) });
      if (e.recorrencia === "Diária") cur.setDate(cur.getDate() + 1);
      else if (e.recorrencia === "Semanal") cur.setDate(cur.getDate() + 7);
      else cur.setMonth(cur.getMonth() + 1);
    }
  }
  return out.sort((a, b) => (a.data + a.evento.hora).localeCompare(b.data + b.evento.hora));
}

export const tipoTone: Record<TipoEvento, { dot: string; bg: string; text: string }> = {
  Audiência: {
    dot: "bg-[var(--critical)]",
    bg: "bg-[var(--critical-soft)]",
    text: "text-[var(--critical)]",
  },
  Prazo: {
    dot: "bg-[var(--warning)]",
    bg: "bg-[var(--warning-soft)]",
    text: "text-[var(--warning)]",
  },
  Reunião: {
    dot: "bg-primary",
    bg: "bg-[var(--brand-soft)]",
    text: "text-[var(--brand-soft-foreground)]",
  },
};

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
