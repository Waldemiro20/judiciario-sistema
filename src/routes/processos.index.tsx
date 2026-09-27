import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  AvatarStack,
  Chip,
  Empty,
  Field,
  Panel,
  inputCls,
  selectCls,
  statusTone,
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  agoraCarimbo,
  AREAS,
  brl,
  STATUS_PROCESSO,
  uid,
  type Area,
  type Processo,
  type ProcessStatus,
  type Risco,
} from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/processos/")({
  head: () => ({ meta: [{ title: "Processos — Gestão Jurídica" }] }),
  component: ProcessosPage,
});

function ProcessosPage() {
  const { processos, pode } = useApp();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<ProcessStatus | "Em andamento" | "Todos">("Em andamento");
  const [area, setArea] = useState<Area | "Todas">("Todas");
  const [novo, setNovo] = useState(false);

  const contagem = (s: ProcessStatus) => processos.filter((p) => p.status === s).length;

  const lista = useMemo(
    () =>
      processos.filter((p) => {
        if (status === "Em andamento" && p.status === "Arquivado") return false;
        if (status !== "Em andamento" && status !== "Todos" && p.status !== status) return false;
        if (area !== "Todas" && p.area !== area) return false;
        const q = busca.toLowerCase();
        if (
          q &&
          !`${p.numero} ${p.titulo} ${p.cliente} ${p.parteContraria} ${p.vara} ${p.juiz}`
            .toLowerCase()
            .includes(q)
        )
          return false;
        return true;
      }),
    [processos, busca, status, area],
  );

  const filtros: { v: typeof status; label: string; n: number }[] = [
    {
      v: "Em andamento",
      label: "Em andamento",
      n: processos.filter((p) => p.status !== "Arquivado").length,
    },
    ...STATUS_PROCESSO.map((s) => ({ v: s, label: s, n: contagem(s) })),
    { v: "Todos", label: "Todos", n: processos.length },
  ];

  return (
    <AppShell title="Processos" subtitle="cadastro, status, equipe e histórico de movimentações">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-0 sm:w-auto sm:flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={cn(inputCls, "pl-9")}
            placeholder="Nº do processo, cliente, parte, vara, juiz…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className={cn(selectCls, "w-auto")}
          value={area}
          onChange={(e) => setArea(e.target.value as Area | "Todas")}
        >
          <option value="Todas">Todas as áreas</option>
          {AREAS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        {pode("Processos") === "editar" && (
          <Button className="ml-auto" onClick={() => setNovo(true)}>
            <Plus className="size-4" /> Novo processo
          </Button>
        )}
      </div>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {filtros.map((f) => (
          <button
            key={f.v}
            onClick={() => setStatus(f.v)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              status === f.v
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background/50 hover:bg-accent",
            )}
          >
            {f.label}
            <span className="font-mono text-[10px] opacity-70">{f.n}</span>
          </button>
        ))}
      </div>

      <Panel>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Processo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Vara / Tribunal</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Equipe</TableHead>
                <TableHead className="text-right">Valor da causa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => navigate({ to: "/processos/$id", params: { id: p.id } })}
                >
                  <TableCell className="min-w-[240px]">
                    <div className="font-medium">{p.titulo}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{p.numero}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{p.cliente}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{p.area}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {p.vara}
                    <div className="text-muted-foreground">{p.tribunal}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{p.fase}</TableCell>
                  <TableCell>
                    <Chip tone={statusTone[p.status]}>{p.status}</Chip>
                  </TableCell>
                  <TableCell>
                    <AvatarStack nomes={p.equipe} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono text-xs">
                    {p.valorCausa ? brl(p.valorCausa) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {lista.length === 0 && <Empty>Nenhum processo encontrado.</Empty>}
        </div>
      </Panel>

      <NovoProcessoDialog open={novo} onOpenChange={setNovo} />
    </AppShell>
  );
}

function NovoProcessoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { clientes, usuarios, usuario, setProcessos, registrar } = useApp();
  const navigate = useNavigate();
  const inicial = {
    numero: "",
    titulo: "",
    cliente: clientes[0]!.nome,
    area: "Direito Civil" as Area,
    vara: "",
    tribunal: "TJSP",
    juiz: "",
    parteContraria: "",
    valorCausa: "",
    fase: "Inicial",
    responsavel: usuario,
    risco: "Possível" as Risco,
  };
  const [f, setF] = useState(inicial);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const conflito =
    f.parteContraria.trim().length > 2
      ? clientes.find((c) => c.nome.toLowerCase().includes(f.parteContraria.trim().toLowerCase()))
      : undefined;

  const salvar = () => {
    if (!f.numero.trim() || !f.titulo.trim()) {
      toast.error("Informe número e título do processo");
      return;
    }
    const { data, hora } = agoraCarimbo();
    const id = uid();
    const p: Processo = {
      id,
      numero: f.numero.trim(),
      titulo: f.titulo.trim(),
      cliente: f.cliente,
      area: f.area,
      status: "Ativo",
      vara: f.vara,
      tribunal: f.tribunal,
      juiz: f.juiz,
      parteContraria: f.parteContraria,
      partes: [
        { nome: f.cliente, polo: "Autor" },
        ...(f.parteContraria ? [{ nome: f.parteContraria, polo: "Réu" as const }] : []),
      ],
      valorCausa: Number(f.valorCausa.replace(/\D/g, "")) || 0,
      fase: f.fase,
      responsavel: f.responsavel,
      equipe: [...new Set([f.responsavel, usuario])],
      risco: f.risco,
      distribuicao: data,
      movimentacoes: [
        { id: uid(), autor: usuario, acao: "cadastrou o processo no sistema", data, hora },
      ],
    };
    setProcessos((prev) => [p, ...prev]);
    registrar("Criou", "Processos", `Cadastrou o processo ${p.numero}`);
    toast.success("Processo cadastrado");
    onOpenChange(false);
    setF(inicial);
    navigate({ to: "/processos/$id", params: { id } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo processo</DialogTitle>
          <DialogDescription>
            Os dados completos podem ser ajustados depois na ficha do processo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Número (CNJ)">
            <input
              className={cn(inputCls, "font-mono")}
              placeholder="0000000-00.0000.0.00.0000"
              value={f.numero}
              onChange={(e) => set("numero", e.target.value)}
            />
          </Field>
          <Field label="Título / Ação">
            <input
              className={inputCls}
              value={f.titulo}
              onChange={(e) => set("titulo", e.target.value)}
            />
          </Field>
          <Field label="Cliente">
            <select
              className={selectCls}
              value={f.cliente}
              onChange={(e) => set("cliente", e.target.value)}
            >
              {clientes.map((c) => (
                <option key={c.id}>{c.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Parte contrária">
            <input
              className={inputCls}
              value={f.parteContraria}
              onChange={(e) => set("parteContraria", e.target.value)}
            />
          </Field>
          {conflito && (
            <div className="rounded-xl border border-[var(--critical)]/40 bg-[var(--critical-soft)] px-3 py-2 text-xs text-[var(--critical)] sm:col-span-2">
              <strong>Possível conflito de interesses:</strong> "{conflito.nome}" já é cliente do
              escritório.
            </div>
          )}
          <Field label="Área">
            <select
              className={selectCls}
              value={f.area}
              onChange={(e) => set("area", e.target.value as Area)}
            >
              {AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="Fase processual">
            <input
              className={inputCls}
              value={f.fase}
              onChange={(e) => set("fase", e.target.value)}
            />
          </Field>
          <Field label="Vara">
            <input
              className={inputCls}
              value={f.vara}
              onChange={(e) => set("vara", e.target.value)}
            />
          </Field>
          <Field label="Tribunal">
            <input
              className={inputCls}
              value={f.tribunal}
              onChange={(e) => set("tribunal", e.target.value)}
            />
          </Field>
          <Field label="Juiz">
            <input
              className={inputCls}
              value={f.juiz}
              onChange={(e) => set("juiz", e.target.value)}
            />
          </Field>
          <Field label="Valor da causa (R$)">
            <input
              className={inputCls}
              inputMode="numeric"
              value={f.valorCausa}
              onChange={(e) => set("valorCausa", e.target.value)}
            />
          </Field>
          <Field label="Responsável principal">
            <select
              className={selectCls}
              value={f.responsavel}
              onChange={(e) => set("responsavel", e.target.value)}
            >
              {usuarios.map((u) => (
                <option key={u.id}>{u.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Risco de perda (contingência)">
            <select
              className={selectCls}
              value={f.risco}
              onChange={(e) => set("risco", e.target.value as Risco)}
            >
              <option>Provável</option>
              <option>Possível</option>
              <option>Remoto</option>
            </select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar}>Cadastrar processo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
