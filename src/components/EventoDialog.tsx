import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, inputCls, selectCls } from "@/components/kit";
import { HOJE, uid, type Evento, type Recorrencia, type TipoEvento } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

const LEMBRETES = [
  "15 min antes",
  "1h antes",
  "24h antes",
  "2 dias antes",
  "3 dias antes",
  "1 semana antes",
  "No dia",
];
const RECORRENCIAS: Recorrencia[] = ["Não repete", "Diária", "Semanal", "Mensal"];
const TIPOS: TipoEvento[] = ["Audiência", "Reunião", "Prazo"];

type Form = Omit<
  Evento,
  "id" | "linkOnline" | "juiz" | "processo" | "cliente" | "testemunhas" | "observacoes"
> & {
  linkOnline: string;
  juiz: string;
  processo: string;
  cliente: string;
  testemunhas: string[];
  observacoes: string;
};

const vazio = (usuario: string, tipo: TipoEvento, data: string): Form => ({
  titulo: "",
  tipo,
  data,
  hora: "09:00",
  duracaoMin: 60,
  advogado: usuario,
  local: "",
  linkOnline: "",
  juiz: "",
  processo: "",
  cliente: "",
  testemunhas: [],
  lembretes: tipo === "Audiência" ? ["24h antes", "1h antes"] : ["1h antes"],
  recorrencia: "Não repete",
  observacoes: "",
});

/** Cadastro/edição de compromisso (Audiência, Reunião ou Prazo). */
export function EventoDialog({
  open,
  onOpenChange,
  editar,
  tipoInicial = "Audiência",
  dataInicial = HOJE,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editar?: Evento | null;
  tipoInicial?: TipoEvento;
  dataInicial?: string;
}) {
  const { usuario, usuarios, processos, setEventos, registrar } = useApp();
  const [f, setF] = useState<Form>(vazio(usuario, tipoInicial, dataInicial));
  const [testemunha, setTestemunha] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editar)
      setF({
        ...vazio(usuario, editar.tipo, editar.data),
        ...editar,
        linkOnline: editar.linkOnline ?? "",
        juiz: editar.juiz ?? "",
        processo: editar.processo ?? "",
        cliente: editar.cliente ?? "",
        testemunhas: editar.testemunhas ?? [],
        observacoes: editar.observacoes ?? "",
      });
    else setF(vazio(usuario, tipoInicial, dataInicial));
    setTestemunha("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const salvar = () => {
    if (!f.titulo.trim()) {
      toast.error("Informe um título");
      return;
    }
    if (!f.local.trim() && !f.linkOnline.trim()) {
      toast.error("Informe o local ou o link");
      return;
    }
    const ev: Evento = {
      id: editar?.id ?? uid(),
      titulo: f.titulo.trim(),
      tipo: f.tipo,
      data: f.data,
      hora: f.hora,
      duracaoMin: f.duracaoMin,
      advogado: f.advogado,
      local: f.local.trim() || "Online",
      lembretes: f.lembretes,
      recorrencia: f.recorrencia,
      ...(f.linkOnline.trim() && { linkOnline: f.linkOnline.trim() }),
      ...(f.juiz.trim() && { juiz: f.juiz.trim() }),
      ...(f.processo && { processo: f.processo }),
      ...(f.cliente && { cliente: f.cliente }),
      ...(f.testemunhas.length > 0 && { testemunhas: f.testemunhas }),
      ...(f.observacoes.trim() && { observacoes: f.observacoes.trim() }),
    };
    setEventos((prev) => (editar ? prev.map((e) => (e.id === editar.id ? ev : e)) : [...prev, ev]));
    registrar(
      editar ? "Editou" : "Criou",
      f.tipo === "Audiência" ? "Audiências" : "Agenda",
      `${editar ? "Editou" : "Criou"} ${f.tipo.toLowerCase()} "${ev.titulo}"`,
    );
    toast.success(editar ? "Compromisso atualizado" : "Compromisso criado", {
      description: `Lembretes: ${f.lembretes.join(", ") || "nenhum"}`,
    });
    onOpenChange(false);
  };

  const ehAudiencia = f.tipo === "Audiência";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editar ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
          <DialogDescription>
            Audiências, reuniões e prazos aparecem na agenda de quem for o responsável.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          {TIPOS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("tipo", t)}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                f.tipo === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <Field label="Título" className="sm:col-span-6">
            <input
              className={inputCls}
              value={f.titulo}
              onChange={(e) => set("titulo", e.target.value)}
            />
          </Field>
          <Field label="Data" className="sm:col-span-2">
            <input
              type="date"
              className={inputCls}
              value={f.data}
              onChange={(e) => set("data", e.target.value)}
            />
          </Field>
          <Field label="Horário" className="sm:col-span-2">
            <input
              type="time"
              className={inputCls}
              value={f.hora}
              onChange={(e) => set("hora", e.target.value)}
            />
          </Field>
          <Field label="Duração" className="sm:col-span-2">
            <select
              className={selectCls}
              value={f.duracaoMin}
              onChange={(e) => set("duracaoMin", Number(e.target.value))}
            >
              {[0, 30, 45, 60, 90, 120, 180].map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? "Sem duração" : `${m} min`}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={ehAudiencia ? "Advogado que fará a audiência" : "Responsável"}
            className="sm:col-span-3"
          >
            <select
              className={selectCls}
              value={f.advogado}
              onChange={(e) => set("advogado", e.target.value)}
            >
              {usuarios.map((u) => (
                <option key={u.id}>{u.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Processo (opcional)" className="sm:col-span-3">
            <select
              className={selectCls}
              value={f.processo}
              onChange={(e) => {
                const p = processos.find((x) => x.numero === e.target.value);
                setF((x) => ({
                  ...x,
                  processo: e.target.value,
                  cliente: p?.cliente ?? x.cliente,
                  juiz: x.juiz || p?.juiz || "",
                }));
              }}
            >
              <option value="">— Sem vínculo —</option>
              {processos.map((p) => (
                <option key={p.id} value={p.numero}>
                  {p.numero} · {p.cliente}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Local físico" className="sm:col-span-3">
            <input
              className={inputCls}
              placeholder="Fórum, sala, endereço…"
              value={f.local}
              onChange={(e) => set("local", e.target.value)}
            />
          </Field>
          <Field label="Link (se online)" className="sm:col-span-3">
            <input
              className={inputCls}
              placeholder="https://"
              value={f.linkOnline}
              onChange={(e) => set("linkOnline", e.target.value)}
            />
          </Field>
          {ehAudiencia && (
            <>
              <Field label="Magistrado responsável" className="sm:col-span-3">
                <input
                  className={inputCls}
                  value={f.juiz}
                  onChange={(e) => set("juiz", e.target.value)}
                />
              </Field>
              <Field label="Cliente que deve comparecer" className="sm:col-span-3">
                <input
                  className={inputCls}
                  value={f.cliente}
                  onChange={(e) => set("cliente", e.target.value)}
                />
              </Field>
              <Field label="Testemunhas" className="sm:col-span-6">
                <div className="flex flex-wrap gap-1.5">
                  {f.testemunhas.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            "testemunhas",
                            f.testemunhas.filter((x) => x !== t),
                          )
                        }
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    placeholder="Nome da testemunha"
                    value={testemunha}
                    onChange={(e) => setTestemunha(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && testemunha.trim()) {
                        e.preventDefault();
                        set("testemunhas", [...f.testemunhas, testemunha.trim()]);
                        setTestemunha("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9"
                    onClick={() => {
                      if (!testemunha.trim()) return;
                      set("testemunhas", [...f.testemunhas, testemunha.trim()]);
                      setTestemunha("");
                    }}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </Field>
            </>
          )}
          <Field label="Repetir" className="sm:col-span-2">
            <select
              className={selectCls}
              value={f.recorrencia}
              onChange={(e) => set("recorrencia", e.target.value as Recorrencia)}
            >
              {RECORRENCIAS.map((r) => (
                <option key={r}>
                  {r === "Semanal"
                    ? "Toda semana"
                    : r === "Mensal"
                      ? "Todo mês"
                      : r === "Diária"
                        ? "Todo dia"
                        : r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lembretes automáticos" className="sm:col-span-4">
            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
              {LEMBRETES.map((l) => (
                <label key={l} className="flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={f.lembretes.includes(l)}
                    onCheckedChange={(v) =>
                      set("lembretes", v ? [...f.lembretes, l] : f.lembretes.filter((x) => x !== l))
                    }
                  />
                  {l}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Observações" className="sm:col-span-6">
            <textarea
              rows={2}
              className={cn(inputCls, "h-auto py-2")}
              value={f.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar}>{editar ? "Salvar alterações" : "Criar compromisso"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
