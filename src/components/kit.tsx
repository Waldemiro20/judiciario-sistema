import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { iniciais, type ProcessStatus } from "@/lib/data";
import { cn } from "@/lib/utils";

/** Cartão de vidro padrão com cabeçalho opcional. */
export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
  delay = 0,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  delay?: number;
}) {
  return (
    <section
      className={cn("glass-panel rise overflow-hidden rounded-2xl", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          {title && (
            <h2 className="min-w-0 truncate text-sm font-semibold tracking-tight">{title}</h2>
          )}
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export type Tone = "critical" | "warning" | "success" | "brand" | "neutral";

const toneClass: Record<Tone, string> = {
  critical: "bg-[var(--critical-soft)] text-[var(--critical)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  brand: "bg-[var(--brand-soft)] text-[var(--brand-soft-foreground)]",
  neutral: "bg-accent text-muted-foreground",
};

export function Chip({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({ nome, className }: { nome: string; className?: string }) {
  return (
    <span
      title={nome}
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[10px] font-semibold text-[var(--brand-soft-foreground)] ring-2 ring-background",
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}

export function AvatarStack({ nomes }: { nomes: string[] }) {
  return (
    <div className="flex -space-x-2">
      {nomes.map((n) => (
        <Avatar key={n} nome={n} />
      ))}
    </div>
  );
}

export function Stat({
  label,
  value,
  note,
  tone,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: Tone;
  delay?: number;
}) {
  const color =
    tone === "critical"
      ? "text-[var(--critical)]"
      : tone === "warning"
        ? "text-[var(--warning)]"
        : tone === "success"
          ? "text-[var(--success)]"
          : "text-muted-foreground";
  return (
    <div
      className={cn(
        "glass-panel rise rounded-2xl p-4",
        tone === "critical" && "ring-1 ring-[var(--critical)]/25",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="truncate text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-2 text-2xl font-bold tracking-tight md:text-3xl",
          tone === "critical" && color,
        )}
      >
        {value}
      </div>
      {note && <div className={cn("mt-1 text-[11px] font-medium", color)}>{note}</div>}
    </div>
  );
}

export function Field({
  label,
  children,
  className,
  hint,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  hint?: string | undefined;
}) {
  return (
    <label className={cn("grid gap-1.5 text-sm", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground/80">{hint}</span>}
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-muted-foreground">{children}</div>;
}

export function AcessoRestrito({ modulo }: { modulo: string }) {
  return (
    <div className="glass-panel mx-auto mt-10 max-w-md rounded-2xl p-8 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--critical-soft)] text-[var(--critical)]">
        <Lock className="size-5" />
      </div>
      <h2 className="mt-4 text-base font-semibold">Acesso restrito</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        O módulo <strong>{modulo}</strong> não está disponível para o seu perfil. Fale com o
        Advogado Administrador caso precise de acesso.
      </p>
    </div>
  );
}

/** Aviso fixo usado em recursos que dependem de back-end/integração. */
export function NotaPrototipo({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-accent/40 px-3 py-2 text-[11px] text-muted-foreground">
      {children}
    </div>
  );
}

export const inputCls =
  "h-9 w-full rounded-lg border border-input bg-background/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-2 focus:ring-ring";

export const selectCls = inputCls + " pr-2";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[] | { value: T; label: ReactNode }[];
  className?: string;
}) {
  const opts = (options as readonly (T | { value: T; label: ReactNode })[]).map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg bg-accent p-0.5 text-xs font-medium",
        className,
      )}
    >
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "whitespace-nowrap rounded-md px-2.5 py-1.5 transition-colors",
            value === o.value
              ? "glass-soft text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const statusTone: Record<ProcessStatus, Tone> = {
  Ativo: "success",
  "Aguardando Prazo": "warning",
  Suspenso: "neutral",
  Arquivado: "neutral",
};
