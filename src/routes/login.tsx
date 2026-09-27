import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Entrar — Gestão Jurídica" }, { name: "theme-color", content: "#0a1628" }],
    links: [
      {
        rel: "preload",
        as: "image",
        href: "/login-escritorio-sm.webp",
        media: "(max-width: 1023px)",
      },
      { rel: "preload", as: "image", href: "/login-escritorio.webp", media: "(min-width: 1024px)" },
    ],
  }),
  component: LoginPage,
});

/* Tela de login com identidade própria (azul-marinho), independente do tema
   claro/escuro escolhido dentro do sistema. */
const campoCls =
  "h-12 w-full rounded-lg border border-[#93c5fd]/15 bg-[#0a1628]/60 pl-10 text-sm text-white outline-none transition-colors placeholder:text-white/30 hover:border-[#93c5fd]/30 focus:border-[#60a5fa]/70 focus:bg-[#0a1628]/80 focus:ring-2 focus:ring-[#3b82f6]/25 aria-[invalid=true]:border-[#e5484d]/60";

function LoginPage() {
  const { entrar, logado, identidade } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (logado) navigate({ to: "/" });
  }, [logado, navigate]);

  // Foco automático só em telas com mouse: no celular abriria o teclado e daria zoom.
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) emailRef.current?.focus();
  }, []);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha) {
      setErro("Preencha e-mail e senha.");
      return;
    }
    setEnviando(true);
    if (!entrar(email, senha)) {
      setEnviando(false);
      setErro("E-mail ou senha incorretos.");
      return;
    }
    // Tira o foco do campo antes de navegar para o teclado do celular fechar.
    (document.activeElement as HTMLElement | null)?.blur();
    navigate({ to: "/" });
  };

  const ano = new Date().getFullYear();

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#0a1628] font-sans text-white antialiased lg:flex-row">
      {/* Imagem — faixa no topo no celular, metade da tela no computador */}
      <div className="relative h-[34dvh] min-h-56 shrink-0 overflow-hidden lg:h-auto lg:min-h-dvh lg:w-[52%]">
        <picture>
          <source media="(min-width: 1024px)" srcSet="/login-escritorio.webp" />
          <img
            src="/login-escritorio-sm.webp"
            alt="Advogado assinando um documento no escritório"
            className="absolute inset-0 size-full object-cover object-[center_40%]"
          />
        </picture>
        <div className="absolute inset-0 bg-[#1e3a8a]/35 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628]/60 via-[#0a1628]/45 to-[#0a1628] lg:bg-gradient-to-r lg:from-[#0a1628]/75 lg:via-[#0a1628]/45 lg:to-[#0a1628]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-transparent to-transparent" />

        <div className="relative p-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:p-10 lg:p-14">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg border border-[#60a5fa]/40 bg-[#0a1628]/50 text-sm font-bold text-[#bfdbfe] backdrop-blur-sm">
              {identidade.sigla}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-none tracking-wide">
                {identidade.nomeEscritorio}
              </div>
              <div className="mt-1.5 font-mono text-[10px] tracking-[0.2em] text-[#60a5fa]">
                ADVOCACIA &amp; CONSULTORIA
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <main className="relative flex flex-1 items-start justify-center px-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8 lg:items-center lg:py-16">
        <div className="rise -mt-10 w-full max-w-[400px] lg:mt-0">
          <div className="rounded-2xl border border-white/10 bg-[#0f1f3a]/90 p-6 shadow-2xl shadow-[#020617]/60 backdrop-blur-xl sm:p-9 lg:border-[#93c5fd]/10 lg:bg-[#0f1f3a]">
            <h1 className="font-['Playfair_Display',Georgia,serif] text-2xl tracking-tight sm:text-3xl">
              Acesse sua conta
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Entre com as credenciais fornecidas pelo escritório.
            </p>

            <form onSubmit={enviar} className="mt-8 space-y-5" noValidate>
              <label className="grid gap-2">
                <span className="text-xs font-medium tracking-wide text-white/60">E-mail</span>
                <span className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/35" />
                  <input
                    ref={emailRef}
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    className={cn(campoCls, "pr-3")}
                    placeholder="seu@email.com"
                    value={email}
                    aria-invalid={!!erro}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErro("");
                    }}
                  />
                </span>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-medium tracking-wide text-white/60">Senha</span>
                <span className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/35" />
                  <input
                    type={verSenha ? "text" : "password"}
                    autoComplete="current-password"
                    className={cn(campoCls, "pr-12")}
                    placeholder="••••••••"
                    value={senha}
                    aria-invalid={!!erro}
                    onChange={(e) => {
                      setSenha(e.target.value);
                      setErro("");
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setVerSenha((v) => !v)}
                    aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-white/40 transition-colors hover:text-white"
                  >
                    {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
              </label>

              {erro && (
                <p
                  role="alert"
                  className="rounded-lg border border-[#e5484d]/30 bg-[#e5484d]/10 px-3 py-2.5 text-xs font-medium text-[#ff8589]"
                >
                  {erro}
                </p>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] text-sm font-semibold tracking-wide text-white shadow-lg shadow-[#1d4ed8]/30 transition-[filter,transform] hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
              >
                {enviando && <Loader2 className="size-4 animate-spin" />}
                Entrar
              </button>
            </form>

            <div className="mt-7 flex items-start gap-2.5 border-t border-[#93c5fd]/10 pt-5 text-xs text-white/40">
              <ShieldCheck className="size-4 shrink-0 text-[#60a5fa]/70" />
              <span>Esqueceu a senha? Solicite a redefinição ao administrador do escritório.</span>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] tracking-wide text-white/25">
            © {ano} {identidade.nomeEscritorio}
          </p>
        </div>
      </main>
    </div>
  );
}
