import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/kit";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Gestão Jurídica" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { entrar, logado, identidade } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (logado) navigate({ to: "/" });
  }, [logado, navigate]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha) {
      setErro("Preencha e-mail e senha.");
      return;
    }
    if (!entrar(email, senha)) {
      setErro("E-mail ou senha incorretos.");
      return;
    }
    navigate({ to: "/" });
  };

  return (
    <div className="relative grid min-h-screen place-items-center bg-background px-4 py-10 font-sans text-foreground antialiased">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-32 h-[420px] w-[420px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-[380px] w-[380px] rounded-full bg-[var(--brand-soft)] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="glass-panel rise w-full max-w-sm rounded-2xl p-7 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
            {identidade.sigla}
          </div>
          <h1 className="mt-4 text-lg font-semibold tracking-tight">{identidade.nomeEscritorio}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre para acessar a gestão do escritório
          </p>
        </div>

        <form onSubmit={enviar} className="mt-7 space-y-4" noValidate>
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">E-mail</span>
            <span className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                autoComplete="username"
                autoFocus
                className={cn(inputCls, "h-10 pl-9")}
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErro("");
                }}
              />
            </span>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Senha</span>
            <span className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={verSenha ? "text" : "password"}
                autoComplete="current-password"
                className={cn(inputCls, "h-10 px-9")}
                placeholder="••••••••"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  setErro("");
                }}
              />
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>

          {erro && (
            <p
              role="alert"
              className="rounded-lg bg-[var(--critical-soft)] px-3 py-2 text-xs font-medium text-[var(--critical)]"
            >
              {erro}
            </p>
          )}

          <Button type="submit" className="h-10 w-full">
            <LogIn className="size-4" /> Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
