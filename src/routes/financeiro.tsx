import { createFileRoute } from "@tanstack/react-router";
import { Check, Clock, Download, Lock, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  AcessoRestrito,
  Chip,
  Empty,
  Field,
  NotaPrototipo,
  Panel,
  Segmented,
  Stat,
  inputCls,
  selectCls,
  type Tone,
} from "@/components/kit";
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
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  brl,
  diasAte,
  fluxoCaixa,
  fmtDM,
  HOJE,
  minToH,
  parseISO,
  toISO,
  uid,
  type Lancamento,
  type Risco,
} from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Gestão Jurídica" }] }),
  component: FinanceiroPage,
});

const situacaoTone: Record<Lancamento["situacao"], Tone> = {
  Pago: "success",
  "Em aberto": "neutral",
  Atrasado: "critical",
};
const MODELOS: Lancamento["modelo"][] = ["Avulso", "Partido (Mensal)", "Ad Exitum", "Por Hora"];

function FinanceiroPage() {
  const { isAdmin, lancamentos, setLancamentos, registrar } = useApp();
  const [novo, setNovo] = useState<Lancamento["tipo"] | null>(null);

  if (!isAdmin)
    return (
      <AppShell title="Financeiro" subtitle="acesso restrito">
        <AcessoRestrito modulo="Financeiro (Honorários a receber)" />
      </AppShell>
    );

  const receberAberto = lancamentos.filter((l) => l.tipo === "Receber" && l.situacao !== "Pago");
  const pagarAberto = lancamentos.filter((l) => l.tipo === "Pagar" && l.situacao !== "Pago");
  const soma = (ls: Lancamento[]) => ls.reduce((s, l) => s + l.valor, 0);
  const abr = fluxoCaixa[fluxoCaixa.length - 1]!;

  const baixar = (l: Lancamento) => {
    setLancamentos((prev) => prev.map((x) => (x.id === l.id ? { ...x, situacao: "Pago" } : x)));
    registrar("Editou", "Financeiro", `Baixou ${l.descricao} (${brl(l.valor)})`);
    toast.success(l.tipo === "Receber" ? "Recebimento registrado" : "Pagamento registrado");
  };

  return (
    <AppShell title="Financeiro" subtitle="visível somente para o Advogado Administrador">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Chip tone="warning">
          <Lock className="size-3" /> Área restrita — colaboradores não visualizam estes valores
        </Chip>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setNovo("Pagar")}>
            <Plus className="size-4" /> Despesa
          </Button>
          <Button onClick={() => setNovo("Receber")}>
            <Plus className="size-4" /> Receita
          </Button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          label="Honorários a receber"
          value={brl(soma(receberAberto))}
          note={`${receberAberto.length} lançamentos em aberto`}
        />
        <Stat
          label="Contas a pagar"
          value={brl(soma(pagarAberto))}
          note={`${pagarAberto.length} em aberto`}
          delay={60}
        />
        <Stat
          label="Saldo de abril"
          value={brl(abr.entradas - abr.saidas)}
          note="entradas − saídas"
          tone="success"
          delay={120}
        />
        <Stat
          label="Recebimentos atrasados"
          value={brl(
            soma(lancamentos.filter((l) => l.tipo === "Receber" && l.situacao === "Atrasado")),
          )}
          note={`${lancamentos.filter((l) => l.situacao === "Atrasado").length} em atraso`}
          tone="critical"
          delay={180}
        />
      </div>

      <Tabs defaultValue="receber">
        <TabsList className="mb-4 w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="receber">Contas a receber</TabsTrigger>
          <TabsTrigger value="pagar">Contas a pagar</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de caixa</TabsTrigger>
          <TabsTrigger value="prestacao">Prestação de contas</TabsTrigger>
          <TabsTrigger value="provisao">Provisão / Contingência</TabsTrigger>
        </TabsList>

        <TabsContent value="receber">
          <TabelaLancamentos tipo="Receber" onBaixar={baixar} />
        </TabsContent>
        <TabsContent value="pagar">
          <TabelaLancamentos tipo="Pagar" onBaixar={baixar} />
        </TabsContent>
        <TabsContent value="fluxo">
          <FluxoCaixa />
        </TabsContent>
        <TabsContent value="prestacao">
          <PrestacaoContas />
        </TabsContent>
        <TabsContent value="provisao">
          <Provisao />
        </TabsContent>
      </Tabs>

      <NovoLancamentoDialog tipo={novo} onClose={() => setNovo(null)} />
    </AppShell>
  );
}

function TabelaLancamentos({
  tipo,
  onBaixar,
}: {
  tipo: Lancamento["tipo"];
  onBaixar: (l: Lancamento) => void;
}) {
  const { lancamentos } = useApp();
  const [filtro, setFiltro] = useState<"Em aberto" | "Pagos" | "Todos">("Em aberto");
  const lista = lancamentos
    .filter((l) => l.tipo === tipo)
    .filter((l) =>
      filtro === "Todos"
        ? true
        : filtro === "Pagos"
          ? l.situacao === "Pago"
          : l.situacao !== "Pago",
    )
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const total = lista.reduce((s, l) => s + l.valor, 0);

  return (
    <Panel
      title={tipo === "Receber" ? "Receitas" : "Despesas"}
      action={
        <Segmented
          value={filtro}
          onChange={setFiltro}
          options={["Em aberto", "Pagos", "Todos"] as const}
        />
      }
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vencimento</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>{tipo === "Receber" ? "Cliente" : "Referente a"}</TableHead>
              <TableHead>{tipo === "Receber" ? "Faturamento" : "Categoria"}</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.map((l) => {
              const d = diasAte(l.vencimento);
              return (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {fmtDM(l.vencimento)}
                    {l.situacao !== "Pago" && d >= 0 && d <= 3 && (
                      <div className="text-[10px] text-[var(--warning)]">
                        {d === 0 ? "hoje" : `em ${d}d`}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="min-w-[200px] text-sm">{l.descricao}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{l.cliente}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {tipo === "Receber" ? l.modelo : l.categoria}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{l.parcela ?? "—"}</TableCell>
                  <TableCell>
                    <Chip tone={situacaoTone[l.situacao]}>{l.situacao}</Chip>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono text-sm font-semibold">
                    {brl(l.valor)}
                  </TableCell>
                  <TableCell className="text-right">
                    {l.situacao !== "Pago" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => onBaixar(l)}
                      >
                        <Check className="size-3.5" /> {tipo === "Receber" ? "Recebido" : "Pago"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          {lista.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={6} className="text-xs font-semibold">
                  Total
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-bold">
                  {brl(total)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
        {lista.length === 0 && <Empty>Nenhum lançamento.</Empty>}
      </div>
    </Panel>
  );
}

function FluxoCaixa() {
  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Panel title="Entradas e saídas por mês" className="lg:col-span-3">
        <div className="h-72 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={fluxoCaixa}
              barGap={2}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="mes"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                cursor={{ fill: "var(--accent)" }}
                formatter={(v: number) => brl(v)}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "var(--foreground)",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
              />
              <Bar
                dataKey="entradas"
                name="Entradas"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
              <Bar
                dataKey="saidas"
                name="Saídas"
                fill="var(--muted-foreground)"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel title="Balanço" className="lg:col-span-2" delay={60}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Entradas</TableHead>
              <TableHead className="text-right">Saídas</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fluxoCaixa.map((m) => (
              <TableRow key={m.mes}>
                <TableCell className="text-xs">{m.mes}</TableCell>
                <TableCell className="text-right font-mono text-xs">{brl(m.entradas)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{brl(m.saidas)}</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold">
                  {brl(m.entradas - m.saidas)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="text-xs font-semibold">Total</TableCell>
              <TableCell className="text-right font-mono text-xs">
                {brl(fluxoCaixa.reduce((s, m) => s + m.entradas, 0))}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {brl(fluxoCaixa.reduce((s, m) => s + m.saidas, 0))}
              </TableCell>
              <TableCell className="text-right font-mono text-xs font-bold">
                {brl(fluxoCaixa.reduce((s, m) => s + m.entradas - m.saidas, 0))}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Panel>
    </div>
  );
}

function PrestacaoContas() {
  const { clientes, lancamentos, registrar } = useApp();
  const comMov = clientes.filter((c) => lancamentos.some((l) => l.cliente === c.nome));
  const [cliente, setCliente] = useState(comMov[0]?.nome ?? "");
  const custas = lancamentos.filter((l) => l.cliente === cliente && l.tipo === "Pagar");
  const honorarios = lancamentos.filter((l) => l.cliente === cliente && l.tipo === "Receber");
  const soma = (ls: Lancamento[]) => ls.reduce((s, l) => s + l.valor, 0);

  return (
    <Panel
      title="Prestação de contas ao cliente"
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            registrar("Exportou", "Financeiro", `Exportou prestação de contas de ${cliente}`);
            toast.success("Relatório gerado (simulado)", {
              description: "No sistema final será baixado em PDF.",
            });
          }}
        >
          <Download className="size-3.5" /> Exportar PDF
        </Button>
      }
    >
      <div className="space-y-5 p-5">
        <Field label="Cliente" className="max-w-sm">
          <select
            className={selectCls}
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
          >
            {comMov.map((c) => (
              <option key={c.id}>{c.nome}</option>
            ))}
          </select>
        </Field>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { titulo: "Custas e despesas do processo", itens: custas },
            { titulo: "Honorários", itens: honorarios },
          ].map((bloco) => (
            <div key={bloco.titulo} className="rounded-xl border border-border">
              <div className="border-b border-border px-4 py-2 text-xs font-semibold">
                {bloco.titulo}
              </div>
              <div className="divide-y divide-border">
                {bloco.itens.length === 0 && (
                  <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum lançamento.</p>
                )}
                {bloco.itens.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {fmtDM(l.vencimento)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{l.descricao}</span>
                    <Chip tone={situacaoTone[l.situacao]}>{l.situacao}</Chip>
                    <span className="font-mono text-xs font-semibold">{brl(l.valor)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-border px-4 py-2 text-sm font-semibold">
                <span>Total</span>
                <span className="font-mono">{brl(soma(bloco.itens))}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

const PERCENTUAL: Record<Risco, number> = { Provável: 1, Possível: 0, Remoto: 0 };

function Provisao() {
  const { processos } = useApp();
  const ativos = processos.filter((p) => p.status !== "Arquivado" && p.valorCausa > 0);
  const grupos = (["Provável", "Possível", "Remoto"] as Risco[]).map((r) => {
    const ps = ativos.filter((p) => p.risco === r);
    const valor = ps.reduce((s, p) => s + p.valorCausa, 0);
    return { risco: r, ps, valor, provisao: valor * PERCENTUAL[r] };
  });
  const totalProvisao = grupos.reduce((s, g) => s + g.provisao, 0);
  const tone: Record<Risco, Tone> = {
    Provável: "critical",
    Possível: "warning",
    Remoto: "success",
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        {grupos.map((g) => (
          <div key={g.risco} className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <Chip tone={tone[g.risco]}>{g.risco}</Chip>
              <span className="font-mono text-[11px] text-muted-foreground">
                {g.ps.length} proc.
              </span>
            </div>
            <div className="mt-2 text-xl font-bold">{brl(g.valor)}</div>
            <div className="text-[11px] text-muted-foreground">
              {g.risco === "Provável"
                ? "provisionar 100%"
                : g.risco === "Possível"
                  ? "apenas acompanhar"
                  : "sem reserva"}
            </div>
          </div>
        ))}
        <div className="glass-panel rounded-2xl p-4 ring-1 ring-[var(--critical)]/25">
          <div className="text-xs text-muted-foreground">Reserva recomendada em caixa</div>
          <div className="mt-2 text-xl font-bold text-[var(--critical)]">{brl(totalProvisao)}</div>
          <div className="text-[11px] text-muted-foreground">
            soma dos processos de risco provável
          </div>
        </div>
      </div>
      <Panel title="Processos por risco de perda">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Processo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead className="text-right">Valor da causa</TableHead>
                <TableHead className="text-right">Provisão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupos.flatMap((g) =>
                g.ps.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{p.titulo}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{p.numero}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{p.cliente}</TableCell>
                    <TableCell>
                      <Chip tone={tone[p.risco]}>{p.risco}</Chip>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {brl(p.valorCausa)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">
                      {brl(p.valorCausa * PERCENTUAL[p.risco])}
                    </TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </Table>
        </div>
        <div className="p-3">
          <NotaPrototipo>
            O risco é definido na ficha de cada processo. Regras de percentual podem ser ajustadas
            depois.
          </NotaPrototipo>
        </div>
      </Panel>
    </div>
  );
}

function NovoLancamentoDialog({
  tipo,
  onClose,
}: {
  tipo: Lancamento["tipo"] | null;
  onClose: () => void;
}) {
  const { clientes, processos, tarefas, setLancamentos, registrar, categorias } = useApp();
  const [f, setF] = useState({
    descricao: "",
    cliente: clientes[0]!.nome,
    processo: "",
    categoria: "Honorários",
    modelo: "Avulso" as Lancamento["modelo"],
    valor: "",
    vencimento: HOJE,
    parcelas: 1,
    valorHora: "450",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const minutosCliente = useMemo(() => {
    const nums = processos.filter((p) => p.cliente === f.cliente).map((p) => p.numero);
    return tarefas
      .filter((t) => t.vinculo === f.cliente || nums.includes(t.vinculo))
      .flatMap((t) => t.apontamentos)
      .reduce((s, a) => s + a.minutos, 0);
  }, [tarefas, processos, f.cliente]);

  if (!tipo) return null;

  const salvar = () => {
    const valor = Number(f.valor.replace(/\./g, "").replace(",", "."));
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
    onClose();
  };

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
        <div className="grid gap-3 sm:grid-cols-2">
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
          <Field label="Valor total (R$)">
            <input
              className={cn(inputCls, "font-mono")}
              inputMode="decimal"
              value={f.valor}
              onChange={(e) => set("valor", e.target.value)}
            />
          </Field>
          <Field label="1º vencimento">
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
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar}>Lançar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
