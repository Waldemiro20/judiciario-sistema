import { createFileRoute } from "@tanstack/react-router";
import { FileDown, FileSpreadsheet, Lock } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AcessoRestrito, Avatar, Chip, Field, Panel, Stat, selectCls } from "@/components/kit";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AREAS, brl, fluxoCaixa, minToH } from "@/lib/data";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Gestão Jurídica" }] }),
  component: RelatoriosPage,
});

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--foreground)",
};

function RelatoriosPage() {
  const { pode, isAdmin, processos, tarefas, eventos, usuarios, lancamentos, registrar } = useApp();
  const [periodo, setPeriodo] = useState("Abril/2024");

  if (pode("Relatórios") === "nenhum")
    return (
      <AppShell title="Relatórios">
        <AcessoRestrito modulo="Relatórios" />
      </AppShell>
    );

  const exportar = (nome: string, formato: "PDF" | "Excel") => {
    registrar("Exportou", "Relatórios", `Exportou ${nome} (${formato}) — ${periodo}`);
    toast.success(`${nome} exportado em ${formato} (simulado)`);
  };

  const Exportar = ({ nome }: { nome: string }) => (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs"
        onClick={() => exportar(nome, "PDF")}
      >
        <FileDown className="size-3.5" /> PDF
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs"
        onClick={() => exportar(nome, "Excel")}
      >
        <FileSpreadsheet className="size-3.5" /> Excel
      </Button>
    </>
  );

  const porArea = AREAS.map((a) => ({
    area: a,
    total: processos.filter((p) => p.area === a).length,
  }));
  const produtividade = usuarios.map((u) => {
    const ts = tarefas.filter((t) => t.responsavel === u.nome);
    return {
      nome: u.nome,
      concluidas: ts.filter((t) => t.coluna === "Concluído").length,
      abertas: ts.filter((t) => t.coluna !== "Concluído").length,
      minutos: tarefas
        .flatMap((t) => t.apontamentos)
        .filter((a) => a.autor === u.nome)
        .reduce((s, a) => s + a.minutos, 0),
      audiencias: eventos.filter((e) => e.tipo === "Audiência" && e.advogado === u.nome).length,
    };
  });
  const recebido = lancamentos
    .filter((l) => l.tipo === "Receber" && l.situacao === "Pago")
    .reduce((s, l) => s + l.valor, 0);
  const pago = lancamentos
    .filter((l) => l.tipo === "Pagar" && l.situacao === "Pago")
    .reduce((s, l) => s + l.valor, 0);

  return (
    <AppShell title="Relatórios" subtitle="gerenciais e financeiros, com exportação em PDF e Excel">
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Field label="Período" className="w-48">
          <select
            className={selectCls}
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          >
            {["Abril/2024", "Março/2024", "1º trimestre/2024", "Últimos 6 meses", "2023"].map(
              (p) => (
                <option key={p}>{p}</option>
              ),
            )}
          </select>
        </Field>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          label="Processos cadastrados"
          value={processos.length}
          note={`${processos.filter((p) => p.status === "Arquivado").length} arquivados`}
        />
        <Stat
          label="Tarefas concluídas"
          value={tarefas.filter((t) => t.coluna === "Concluído").length}
          note={`de ${tarefas.length} no período`}
          delay={60}
        />
        <Stat
          label="Audiências"
          value={eventos.filter((e) => e.tipo === "Audiência").length}
          note="agendadas no período"
          delay={120}
        />
        <Stat
          label="Horas apontadas"
          value={minToH(tarefas.flatMap((t) => t.apontamentos).reduce((s, a) => s + a.minutos, 0))}
          note="timesheet da equipe"
          delay={180}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Processos por área" action={<Exportar nome="Processos por área" />}>
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porArea} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="area"
                  width={110}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--accent)" }}
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [`${v} processos`, "Total"]}
                />
                <Bar dataKey="total" fill="var(--primary)" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Produtividade da equipe"
          action={<Exportar nome="Produtividade da equipe" />}
          delay={60}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead className="text-right">Concluídas</TableHead>
                  <TableHead className="text-right">Em aberto</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Audiências</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtividade.map((p) => (
                  <TableRow key={p.nome}>
                    <TableCell>
                      <span className="flex items-center gap-2 whitespace-nowrap text-sm">
                        <Avatar nome={p.nome} className="size-6" /> {p.nome}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{p.concluidas}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{p.abertas}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {minToH(p.minutos)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{p.audiencias}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>

        <Panel title="Audiências do período" action={<Exportar nome="Audiências" />} delay={120}>
          <div className="divide-y divide-border">
            {eventos
              .filter((e) => e.tipo === "Audiência")
              .sort((a, b) => a.data.localeCompare(b.data))
              .map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {e.data.split("-").reverse().slice(0, 2).join("/")}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{e.titulo}</span>
                  <span className="text-xs text-muted-foreground">{e.advogado}</span>
                </div>
              ))}
          </div>
        </Panel>

        {isAdmin ? (
          <Panel
            title={
              <span className="flex items-center gap-2">
                Financeiro consolidado <Chip tone="warning">restrito</Chip>
              </span>
            }
            action={<Exportar nome="Relatório financeiro" />}
            delay={180}
          >
            <div className="grid grid-cols-3 gap-3 p-4">
              <div>
                <div className="text-[11px] text-muted-foreground">Recebido</div>
                <div className="font-mono text-sm font-semibold">{brl(recebido)}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Pago</div>
                <div className="font-mono text-sm font-semibold">{brl(pago)}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Resultado</div>
                <div className="font-mono text-sm font-semibold">{brl(recebido - pago)}</div>
              </div>
            </div>
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
                    <TableCell className="text-right font-mono text-xs">
                      {brl(m.entradas)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{brl(m.saidas)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">
                      {brl(m.entradas - m.saidas)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        ) : (
          <Panel title="Financeiro consolidado" delay={180}>
            <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <Lock className="size-4" /> Disponível apenas para o Advogado Administrador.
            </div>
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
