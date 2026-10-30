"use client";

import { FileDown, FileSpreadsheet, Lock } from "lucide-react";
import { useMemo, useState } from "react";
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
import { AREAS, brl, fluxoDeCaixa, fmtDMY, minToH } from "@/lib/data";
import { baixar, gerarPdf, gerarXlsx, nomeArquivo, type Tabela } from "@/lib/exportar";
import { MESES } from "@/lib/agenda";
import { useApp } from "@/lib/store";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--foreground)",
};

function RelatoriosPage() {
  const { pode, isAdmin, processos, tarefas, eventos, usuarios, lancamentos, registrar } = useApp();
  const periodos = useMemo(() => {
    const n = new Date();
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const mes = (d: Date) => ({
      nome: `${MESES[d.getMonth()]![0]!.toUpperCase()}${MESES[d.getMonth()]!.slice(1)}/${d.getFullYear()}`,
      de: iso(new Date(d.getFullYear(), d.getMonth(), 1)),
      ate: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
    });
    return [
      mes(n),
      mes(new Date(n.getFullYear(), n.getMonth() - 1, 1)),
      {
        nome: "Últimos 6 meses",
        de: iso(new Date(n.getFullYear(), n.getMonth() - 5, 1)),
        ate: iso(new Date(n.getFullYear(), n.getMonth() + 1, 0)),
      },
      {
        nome: String(n.getFullYear()),
        de: `${n.getFullYear()}-01-01`,
        ate: `${n.getFullYear()}-12-31`,
      },
    ];
  }, []);
  const [nomePeriodo, setNomePeriodo] = useState(periodos[0]!.nome);
  const sel = periodos.find((p) => p.nome === nomePeriodo) ?? periodos[0]!;
  const periodo = sel.nome;
  const noPeriodo = (data: string) => !!data && data >= sel.de && data <= sel.ate;

  if (pode("Relatórios") === "nenhum")
    return (
      <AppShell title="Relatórios">
        <AcessoRestrito modulo="Relatórios" />
      </AppShell>
    );

  const tarefasPeriodo = tarefas.filter((t) => noPeriodo(t.prazo));
  const audienciasPeriodo = eventos
    .filter((e) => e.tipo === "Audiência" && noPeriodo(e.data))
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  const lancamentosPeriodo = lancamentos.filter((l) => noPeriodo(l.vencimento));

  const porArea = AREAS.map((a) => ({
    area: a,
    total: processos.filter((p) => p.area === a).length,
  }));
  const produtividade = usuarios.map((u) => {
    const ts = tarefasPeriodo.filter((t) => t.responsavel === u.nome);
    return {
      nome: u.nome,
      concluidas: ts.filter((t) => t.coluna === "Concluído").length,
      abertas: ts.filter((t) => t.coluna !== "Concluído").length,
      minutos: tarefasPeriodo
        .flatMap((t) => t.apontamentos)
        .filter((a) => a.autor === u.nome)
        .reduce((s, a) => s + a.minutos, 0),
      audiencias: audienciasPeriodo.filter((e) => e.advogado === u.nome).length,
    };
  });
  const recebido = lancamentosPeriodo
    .filter((l) => l.tipo === "Receber" && l.situacao === "Pago")
    .reduce((s, l) => s + l.valor, 0);
  const pago = lancamentosPeriodo
    .filter((l) => l.tipo === "Pagar" && l.situacao === "Pago")
    .reduce((s, l) => s + l.valor, 0);
  const fluxo = fluxoDeCaixa(lancamentosPeriodo);

  const tabelas: Record<string, Omit<Tabela, "subtitulo">> = {
    "Processos por área": {
      titulo: "Processos por área",
      colunas: [
        { titulo: "Área", peso: 3 },
        { titulo: "Processos", numero: true },
      ],
      linhas: [...porArea.map((a) => [a.area, a.total]), ["Total", processos.length]],
    },
    "Produtividade da equipe": {
      titulo: "Produtividade da equipe",
      colunas: [
        { titulo: "Pessoa", peso: 3 },
        { titulo: "Concluídas", numero: true },
        { titulo: "Em aberto", numero: true },
        { titulo: "Horas" },
        { titulo: "Audiências", numero: true },
      ],
      linhas: produtividade.map((p) => [
        p.nome,
        p.concluidas,
        p.abertas,
        minToH(p.minutos),
        p.audiencias,
      ]),
    },
    Audiências: {
      titulo: "Audiências do período",
      colunas: [
        { titulo: "Data", peso: 1.2 },
        { titulo: "Hora", peso: 0.8 },
        { titulo: "Título", peso: 4 },
        { titulo: "Advogado", peso: 2 },
        { titulo: "Local", peso: 2 },
      ],
      linhas: audienciasPeriodo.map((e) => [fmtDMY(e.data), e.hora, e.titulo, e.advogado, e.local]),
    },
    "Relatório financeiro": {
      titulo: "Relatório financeiro",
      colunas: [
        { titulo: "Mês", peso: 2 },
        { titulo: "Entradas", peso: 1.5, moeda: true },
        { titulo: "Saídas", peso: 1.5, moeda: true },
        { titulo: "Saldo", peso: 1.5, moeda: true },
      ],
      linhas: [
        ...fluxo.map((m) => [m.mes, m.entradas, m.saidas, m.entradas - m.saidas]),
        ["Total pago no período", recebido, pago, recebido - pago],
      ],
    },
  };

  const exportar = (nome: string, formato: "PDF" | "Excel") => {
    const base = tabelas[nome];
    if (!base) return;
    const gerado = new Date().toLocaleString("pt-BR");
    const t: Tabela = { ...base, subtitulo: `Período: ${periodo} · Gerado em ${gerado}` };
    try {
      if (formato === "PDF")
        baixar(
          gerarPdf(t, `${t.titulo} — ${periodo}`),
          "application/pdf",
          nomeArquivo(`${t.titulo} ${periodo}`, "pdf"),
        );
      else
        baixar(
          gerarXlsx(t),
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          nomeArquivo(`${t.titulo} ${periodo}`, "xlsx"),
        );
    } catch {
      toast.error(`Não foi possível gerar o arquivo ${formato}.`);
      return;
    }
    registrar("Exportou", "Relatórios", `Exportou ${nome} (${formato}) — ${periodo}`);
    toast.success(`${nome} exportado em ${formato}`);
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

  return (
    <AppShell title="Relatórios" subtitle="gerenciais e financeiros, com exportação em PDF e Excel">
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Field label="Período" className="w-48">
          <select
            className={selectCls}
            value={nomePeriodo}
            onChange={(e) => setNomePeriodo(e.target.value)}
          >
            {periodos.map((p) => (
              <option key={p.nome}>{p.nome}</option>
            ))}
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
          value={tarefasPeriodo.filter((t) => t.coluna === "Concluído").length}
          note={`de ${tarefasPeriodo.length} com prazo no período`}
          delay={60}
        />
        <Stat
          label="Audiências"
          value={audienciasPeriodo.length}
          note="agendadas no período"
          delay={120}
        />
        <Stat
          label="Horas apontadas"
          value={minToH(
            tarefasPeriodo.flatMap((t) => t.apontamentos).reduce((s, a) => s + a.minutos, 0),
          )}
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
            {audienciasPeriodo.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhuma audiência no período.
              </div>
            )}
            {audienciasPeriodo.map((e) => (
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
                {fluxo.map((m) => (
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

export default RelatoriosPage;
