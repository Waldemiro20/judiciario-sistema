import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Entrar — Gestão Jurídica" }, { name: "theme-color", content: "#2B2119" }],
    links: [{ rel: "preload", as: "image", href: "/login.jpeg" }],
  }),
  component: LoginPage,
});

/* Tela de login: espresso, branco e dourado da marca. */
const campoCls =
  "h-12 w-full rounded-md border border-[#c4a574] bg-[#2B2119] pl-10 text-sm text-white outline-none transition-colors placeholder:text-white/40 hover:border-[#d4b88a] focus:border-[#c4a574] focus:bg-[#2B2119] focus:ring-2 focus:ring-[#c4a574]/30 aria-[invalid=true]:border-red-400/80";

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
    <div className="relative flex min-h-dvh flex-col bg-[#2B2119] font-sans text-white antialiased lg:flex-row">
      {/* Imagem — faixa no topo no celular, metade da tela no computador */}
      <div className="relative h-[34dvh] min-h-56 shrink-0 overflow-hidden lg:h-auto lg:min-h-dvh lg:w-[52%]">
        <img
          src="/login.jpeg"
          alt="Balança da justiça e martelo sobre a mesa do escritório"
          className="absolute inset-0 size-full object-cover object-[center_40%]"
        />
        <div className="absolute inset-0 bg-stone-950/45" />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/35 via-transparent to-[#2B2119] lg:bg-gradient-to-r lg:from-stone-950/50 lg:via-stone-950/25 lg:to-[#2B2119]" />

        <div className="absolute inset-0 z-10 flex items-center justify-center p-6 pt-[max(1.5rem,env(safe-area-inset-top))] sm:p-10 lg:p-14">
          <div className="flex flex-col items-center text-center text-white">
            <div className="grid size-16 place-items-center rounded-md border border-[#c4a574] bg-stone-950/35 text-lg font-bold tracking-wide text-white backdrop-blur-[2px]">
              {identidade.sigla}
            </div>
            <div className="mt-5 max-w-[90%]">
              <div className="text-lg font-semibold leading-snug tracking-wide sm:text-xl">
                {identidade.nomeEscritorio}
              </div>
              <div className="mt-2 font-mono text-xs tracking-[0.2em] text-[#c4a574]">
                ADVOCACIA &amp; CONSULTORIA
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <main className="relative flex flex-1 items-start justify-center px-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8 lg:items-center lg:py-16">
        <div className="rise -mt-10 w-full max-w-[400px] lg:mt-0">
          <div className="rounded-xl border border-[#c4a574] bg-[#2B2119] p-6 sm:p-9">
            <h1 className="font-['Playfair_Display',Georgia,serif] text-2xl tracking-tight text-white sm:text-3xl">
              Acesse sua conta
            </h1>
            <p className="mt-2 text-sm text-[#c4a574]">
              Entre com as credenciais fornecidas pelo escritório.
            </p>

            <form onSubmit={enviar} className="mt-8 space-y-5" noValidate>
              <label className="grid gap-2">
                <span className="text-xs font-medium tracking-wide text-[#c4a574]">E-mail</span>
                <span className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#c4a574]" />
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
                <span className="text-xs font-medium tracking-wide text-[#c4a574]">Senha</span>
                <span className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#c4a574]" />
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
                    className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-[#c4a574] transition-colors hover:text-white"
                  >
                    {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
              </label>

              {erro && (
                <p
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-800"
                >
                  {erro}
                </p>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-[#c4a574] bg-[#c4a574] text-sm font-semibold tracking-wide text-[#2B2119] transition-colors hover:bg-[#d4b88a] hover:border-[#d4b88a] active:bg-[#b8956a] disabled:opacity-70"
              >
                {enviando && <Loader2 className="size-4 animate-spin" />}
                Entrar
              </button>
            </form>

            <div className="mt-7 flex items-start gap-2.5 border-t border-[#c4a574] pt-5 text-xs text-white/70">
              <ShieldCheck className="size-4 shrink-0 text-[#c4a574]" />
              <span>Esqueceu a senha? Solicite a redefinição ao administrador do escritório.</span>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] tracking-wide text-[#c4a574]/70">
            © {ano} {identidade.nomeEscritorio}
          </p>
        </div>
      </main>
    </div>
  );
}
