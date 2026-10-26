import { Check, Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, NotaPrototipo, inputCls, selectCls, type Tone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  brl,
  HOJE,
  minToH,
  parseISO,
  recebidoDe,
  saldoDe,
  toISO,
  uid,
  type Lancamento,
} from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const situacaoTone: Record<Lancamento["situacao"], Tone> = {
  Pago: "success",
  "Em aberto": "neutral",
  Atrasado: "critical",
};
const MODELOS: Lancamento["modelo"][] = ["Avulso", "Partido (Mensal)", "Ad Exitum", "Por Hora"];

export const lerValor = (v: string) => Number(v.replace(/\./g, "").replace(",", "."));

export function useAcoesLancamento() {
  const { setLancamentos, registrar } = useApp();

  const receber = (l: Lancamento, quanto: number) => {
    const total = Math.min(l.valor, recebidoDe(l) + quanto);
    const quitado = total >= l.valor - 0.005;
    setLancamentos((prev) =>
      prev.map((x) =>
        x.id === l.id ? { ...x, valorRecebido: total, situacao: quitado ? "Pago" : x.situacao } : x,
      ),
    );
    registrar(
      "Editou",
      "Financeiro",
      `${quitado ? "Quitou" : "Recebeu parcial de"} ${l.descricao} — ${l.cliente} (${brl(quanto)})`,
    );
    toast.success(quitado ? "Lançamento quitado" : "Recebimento parcial registrado", {
      description: quitado ? undefined : `Falta ${brl(l.valor - total)}`,
    });
  };

  const baixar = (l: Lancamento) => {
    setLancamentos((prev) =>
      prev.map((x) => (x.id === l.id ? { ...x, situacao: "Pago", valorRecebido: x.valor } : x)),
    );
    registrar("Editou", "Financeiro", `Baixou ${l.descricao} (${brl(l.valor)})`);
    toast.success(l.tipo === "Receber" ? "Recebimento registrado" : "Pagamento registrado");
  };

  const estornar = (l: Lancamento) => {
    setLancamentos((prev) =>
      prev.map((x) => (x.id === l.id ? { ...x, situacao: "Em aberto", valorRecebido: 0 } : x)),
    );
    registrar("Editou", "Financeiro", `Estornou ${l.descricao} — ${l.cliente}`);
    toast.success("Lançamento reaberto");
  };

  const excluir = (l: Lancamento) => {
    setLancamentos((prev) => prev.filter((x) => x.id !== l.id));
    registrar("Excluiu", "Financeiro", `Excluiu ${l.descricao} — ${l.cliente} (${brl(l.valor)})`);
    toast.success("Lançamento excluído");
  };

  return { receber, baixar, estornar, excluir };
}

export function EditarLancamentoDialog({
  lancamento,
  onClose,
}: {
  lancamento: Lancamento | null;
  onClose: () => void;
}) {
  const { setLancamentos, registrar } = useApp();
  const [f, setF] = useState({ descricao: "", valor: "", recebido: "", vencimento: HOJE });
  const fmt = (n: number) => String(n).replace(".", ",");

  useEffect(() => {
    if (lancamento)
      setF({
        descricao: lancamento.descricao,
        valor: fmt(lancamento.valor),
        recebido: fmt(recebidoDe(lancamento)),
        vencimento: lancamento.vencimento,
      });
  }, [lancamento]);

  if (!lancamento) return null;
  const receita = lancamento.tipo === "Receber";

  const salvar = () => {
    const valor = lerValor(f.valor);
    const recebido = receita ? lerValor(f.recebido || "0") : 0;
    if (!f.descricao.trim() || !valor || valor <= 0) {
      toast.error("Informe descrição e valor");
      return;
    }
    if (Number.isNaN(recebido) || recebido < 0 || recebido > valor + 0.005) {
      toast.error("O valor recebido não pode passar do pré-acordado");
      return;
    }
    setLancamentos((prev) =>
      prev.map((x) => {
        if (x.id !== lancamento.id) return x;
        const quitado = receita ? recebido >= valor - 0.005 : x.situacao === "Pago";
        return {
          ...x,
          descricao: f.descricao.trim(),
          valor,
          vencimento: f.vencimento,
          ...(receita && { valorRecebido: recebido }),
          situacao: quitado ? "Pago" : x.situacao === "Pago" ? "Em aberto" : x.situacao,
        };
      }),
    );
    registrar("Editou", "Financeiro", `Editou ${f.descricao.trim()} — ${lancamento.cliente}`);
    toast.success("Lançamento atualizado");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar lançamento</DialogTitle>
          <DialogDescription>{lancamento.cliente}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Descrição" className="col-span-2">
            <input
              autoFocus
              className={inputCls}
              value={f.descricao}
              onChange={(e) => setF({ ...f, descricao: e.target.value })}
            />
          </Field>
          <Field label={receita ? "Valor pré-acordado (R$)" : "Valor (R$)"}>
            <input
              className={cn(inputCls, "font-mono")}
              inputMode="decimal"
              value={f.valor}
              onChange={(e) => setF({ ...f, valor: e.target.value })}
            />
          </Field>
          <Field label="Data">
            <input
              type="date"
              className={inputCls}
              value={f.vencimento}
              onChange={(e) => setF({ ...f, vencimento: e.target.value })}
            />
          </Field>
          {receita && (
            <Field label="Valor recebido (R$)" className="col-span-2">
              <input
                className={cn(inputCls, "font-mono")}
                inputMode="decimal"
                value={f.recebido}
                onChange={(e) => setF({ ...f, recebido: e.target.value })}
              />
            </Field>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RecebimentoDialog({
  lancamento,
  onClose,
}: {
  lancamento: Lancamento | null;
  onClose: () => void;
}) {
  const { receber } = useAcoesLancamento();
  const [valor, setValor] = useState("");

  useEffect(() => {
    if (lancamento) setValor(String(saldoDe(lancamento)).replace(".", ","));
  }, [lancamento]);

  if (!lancamento) return null;
  const falta = saldoDe(lancamento);

  const salvar = () => {
    const v = lerValor(valor);
    if (!v || v <= 0) {
      toast.error("Informe o valor recebido");
      return;
    }
    if (v > falta + 0.005) {
      toast.error(`O valor passa do saldo em aberto (${brl(falta)})`);
      return;
    }
    receber(lancamento, v);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar recebimento</DialogTitle>
          <DialogDescription>
            {lancamento.descricao} · {lancamento.cliente}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-3 gap-2 rounded-xl bg-accent/50 p-3 text-center">
          <div>
            <dt className="text-[10px] text-muted-foreground">Pré-acordado</dt>
            <dd className="font-mono text-xs font-semibold">{brl(lancamento.valor)}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted-foreground">Recebido</dt>
            <dd className="font-mono text-xs font-semibold text-[var(--success)]">
              {brl(recebidoDe(lancamento))}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted-foreground">Em aberto</dt>
            <dd className="font-mono text-xs font-semibold">{brl(falta)}</dd>
          </div>
        </dl>
        <Field label="Valor recebido agora (R$)">
          <input
            autoFocus
            className={cn(inputCls, "font-mono")}
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && salvar()}
          />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar}>
            <Check className="size-4" /> Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NovoLancamentoDialog({
  tipo,
  onClose,
  clienteFixo,
}: {
  tipo: Lancamento["tipo"] | null;
  onClose: () => void;
  clienteFixo?: string;
}) {
  if (!tipo) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tipo === "Receber" ? "Nova receita (a receber)" : "Nova despesa (a pagar)"}
          </DialogTitle>
          <DialogDescription>
            Parcelamentos geram automaticamente as parcelas mensais (1/N, 2/N…).
          </DialogDescription>
        </DialogHeader>
        <NovoLancamentoForm
          tipo={tipo}
          clienteFixo={clienteFixo}
          onSalvo={onClose}
          onCancelar={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

export function NovoLancamentoForm({
  tipo,
  clienteFixo,
  onSalvo,
  onCancelar,
}: {
  tipo: Lancamento["tipo"];
  clienteFixo?: string | undefined;
  onSalvo?: () => void;
  onCancelar?: () => void;
}) {
  const { clientes, processos, tarefas, setLancamentos, registrar, categorias } = useApp();
  const vazio = () => ({
    descricao: "",
    cliente: clienteFixo ?? clientes[0]?.nome ?? "Interno",
    processo: "",
    categoria: "Honorários",
    modelo: "Avulso" as Lancamento["modelo"],
    valor: "",
    vencimento: HOJE,
    parcelas: 1,
    valorHora: "450",
  });
  const [f, setF] = useState(vazio);

  useEffect(() => {
    setF(vazio());
  }, [tipo, clienteFixo]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const minutosCliente = useMemo(() => {
    const id = clientes.find((c) => c.nome === f.cliente)?.id;
    return tarefas
      .filter((t) => id && t.clienteId === id)
      .flatMap((t) => t.apontamentos)
      .reduce((s, a) => s + a.minutos, 0);
  }, [tarefas, clientes, f.cliente]);

  const salvar = () => {
    const valor = lerValor(f.valor);
    if (!f.descricao.trim() || !valor) {
      toast.error("Informe descrição e valor");
      return;
    }
    const n = Math.max(1, f.parcelas);
    const base = parseISO(f.vencimento);
    const novos: Lancamento[] = Array.from({ length: n }, (_, i) => {
      const d = new Date(base);
      d.setMonth(d.getMonth() + i);
      return {
        id: uid(),
        descricao: f.descricao.trim(),
        cliente: f.cliente,
        ...(f.processo && { processo: f.processo }),
        tipo,
        categoria: tipo === "Receber" ? "Honorários" : f.categoria,
        modelo: f.modelo,
        valor: Math.round((valor / n) * 100) / 100,
        vencimento: toISO(d),
        ...(n > 1 && { parcela: `${i + 1}/${n}` }),
        situacao: "Em aberto",
      };
    });
    setLancamentos((prev) => [...novos, ...prev]);
    registrar(
      "Criou",
      "Financeiro",
      `Lançou ${tipo === "Receber" ? "receita" : "despesa"} "${f.descricao.trim()}" (${brl(valor)}${n > 1 ? ` em ${n}x` : ""})`,
    );
    toast.success(n > 1 ? `${n} parcelas geradas` : "Lançamento criado");
    setF(vazio());
    onSalvo?.();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Descrição" className="sm:col-span-2">
          <input
            className={inputCls}
            value={f.descricao}
            onChange={(e) => set("descricao", e.target.value)}
          />
        </Field>
        <Field label="Cliente">
          <select
            className={selectCls}
            value={f.cliente}
            disabled={!!clienteFixo}
            onChange={(e) => set("cliente", e.target.value)}
          >
            {tipo === "Pagar" && <option>Interno</option>}
            {clientes.map((c) => (
              <option key={c.id}>{c.nome}</option>
            ))}
          </select>
        </Field>
        <Field label="Processo (opcional)">
          <select
            className={selectCls}
            value={f.processo}
            onChange={(e) => set("processo", e.target.value)}
          >
            <option value="">—</option>
            {processos
              .filter((p) => p.cliente === f.cliente)
              .map((p) => (
                <option key={p.id}>{p.numero}</option>
              ))}
          </select>
        </Field>
        {tipo === "Receber" ? (
          <Field label="Modelo de faturamento" className="sm:col-span-2">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {MODELOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set("modelo", m)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-[11px] font-semibold",
                    f.modelo === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </Field>
        ) : (
          <Field label="Categoria" className="sm:col-span-2">
            <select
              className={selectCls}
              value={f.categoria}
              onChange={(e) => set("categoria", e.target.value)}
            >
              {(categorias["Categorias financeiras"] ?? []).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        )}
        {tipo === "Receber" && f.modelo === "Por Hora" && (
          <div className="space-y-2 rounded-xl border border-border p-3 sm:col-span-2">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="size-4 text-muted-foreground" />
              Timesheet deste cliente:{" "}
              <strong className="font-mono">{minToH(minutosCliente)}</strong>
            </div>
            <div className="flex items-end gap-2">
              <Field label="Valor da hora (R$)" className="flex-1">
                <input
                  className={inputCls}
                  value={f.valorHora}
                  onChange={(e) => set("valorHora", e.target.value)}
                />
              </Field>
              <Button
                variant="secondary"
                className="h-9"
                onClick={() => {
                  const v = Math.round((minutosCliente / 60) * Number(f.valorHora || 0));
                  setF((x) => ({
                    ...x,
                    valor: String(v),
                    descricao: x.descricao || `Horas técnicas (${minToH(minutosCliente)})`,
                  }));
                }}
              >
                Converter horas em valor
              </Button>
            </div>
          </div>
        )}
        {tipo === "Receber" && f.modelo === "Ad Exitum" && (
          <div className="sm:col-span-2">
            <NotaPrototipo>
              Ad Exitum: o valor fica vinculado ao êxito no processo e pode ser lançado com
              vencimento estimado.
            </NotaPrototipo>
          </div>
        )}
        <Field label={tipo === "Receber" ? "Valor pré-acordado (R$)" : "Valor total (R$)"}>
          <input
            className={cn(inputCls, "font-mono")}
            inputMode="decimal"
            value={f.valor}
            onChange={(e) => set("valor", e.target.value)}
          />
        </Field>
        <Field label="Data (1º vencimento)">
          <input
            type="date"
            className={inputCls}
            value={f.vencimento}
            onChange={(e) => set("vencimento", e.target.value)}
          />
        </Field>
        <Field
          label="Parcelas"
          hint={
            f.parcelas > 1 && f.valor
              ? `${f.parcelas}x de ${brl(Number(f.valor.replace(/\./g, "").replace(",", ".")) / f.parcelas)}`
              : undefined
          }
        >
          <select
            className={selectCls}
            value={f.parcelas}
            onChange={(e) => set("parcelas", Number(e.target.value))}
          >
            {[1, 2, 3, 4, 6, 10, 12, 18, 24].map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "À vista" : `${n}x`}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancelar && (
          <Button variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
        <Button onClick={salvar}>Lançar</Button>
      </div>
    </div>
  );
}
