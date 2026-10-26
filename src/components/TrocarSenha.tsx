"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/kit";
import { useApp } from "@/lib/store";

export function TrocarSenha() {
  const { trocarSenha, sair, usuario } = useApp();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nova.length < 12) return setErro("A nova senha precisa ter pelo menos 12 caracteres.");
    if (nova !== confirma) return setErro("A confirmação não confere com a nova senha.");
    setEnviando(true);
    setErro("");
    const r = await trocarSenha(atual, nova);
    setEnviando(false);
    if (!r.ok) setErro(r.erro);
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-background p-4 font-sans text-foreground">
      <form
        onSubmit={enviar}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-primary" />
          <h1 className="text-base font-semibold">Defina uma nova senha</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {usuario}, você está usando uma senha temporária. Crie uma senha pessoal para continuar.
        </p>
        <Field label="Senha atual (temporária)">
          <input
            type="password"
            autoComplete="current-password"
            className={inputCls}
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
          />
        </Field>
        <Field
          label="Nova senha"
          hint="Mínimo de 12 caracteres. Uma frase longa é uma boa escolha."
        >
          <input
            type="password"
            autoComplete="new-password"
            className={inputCls}
            value={nova}
            onChange={(e) => setNova(e.target.value)}
          />
        </Field>
        <Field label="Confirme a nova senha">
          <input
            type="password"
            autoComplete="new-password"
            className={inputCls}
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
          />
        </Field>
        {erro && (
          <p role="alert" className="text-sm text-[var(--critical)]">
            {erro}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => void sair()}>
            Sair
          </Button>
          <Button type="submit" className="flex-1" disabled={enviando || !atual || !nova}>
            {enviando && <Loader2 className="size-4 animate-spin" />} Salvar nova senha
          </Button>
        </div>
      </form>
    </div>
  );
}
