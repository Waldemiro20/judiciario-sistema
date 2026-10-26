import { z } from "zod";

const booleano = z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1");

const esquema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().url().startsWith("postgres"),
    DATABASE_SSL_CA: z.string().includes("BEGIN CERTIFICATE").optional(),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
    APP_ORIGIN: z.string().url().optional(),
    ALLOWED_ORIGINS: z.string().optional(),
    TRUST_PROXY: booleano.default(false),
    COOKIE_SECURE: booleano.optional(),
    APP_TIMEZONE: z.string().default("America/Sao_Paulo"),
    SESSION_TTL_HORAS: z.coerce.number().int().min(1).max(72).default(12),
    SESSION_IDLE_MINUTOS: z.coerce
      .number()
      .int()
      .min(5)
      .max(24 * 60)
      .default(60),
    LOGIN_MAX_TENTATIVAS: z.coerce.number().int().min(3).max(50).default(5),
    LOGIN_MAX_TENTATIVAS_IP: z.coerce.number().int().min(5).max(500).default(30),
    LOGIN_JANELA_MINUTOS: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 60)
      .default(15),
    API_LIMITE_POR_MINUTO: z.coerce.number().int().min(10).max(10000).default(600),
    STORAGE_DRIVER: z.enum(["local", "supabase"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default(".storage"),
    STORAGE_LOCAL_EM_PRODUCAO: booleano.default(false),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
    SUPABASE_STORAGE_BUCKET: z
      .string()
      .regex(/^[a-z0-9-]{3,63}$/)
      .default("documentos"),
    MAX_UPLOAD_MB: z.coerce.number().min(0.1).max(50).default(4),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
  .superRefine((c, ctx) => {
    if (c.NODE_ENV === "production" && !c.APP_ORIGIN)
      ctx.addIssue({ code: "custom", path: ["APP_ORIGIN"], message: "obrigatório em produção" });
    if (c.NODE_ENV === "production" && c.STORAGE_DRIVER === "local" && !c.STORAGE_LOCAL_EM_PRODUCAO)
      ctx.addIssue({
        code: "custom",
        path: ["STORAGE_DRIVER"],
        message: "use 'supabase' em produção (disco local não é persistente nem compartilhado)",
      });
    if (c.STORAGE_DRIVER === "supabase" && (!c.SUPABASE_URL || !c.SUPABASE_SERVICE_ROLE_KEY))
      ctx.addIssue({
        code: "custom",
        path: ["SUPABASE_URL"],
        message:
          "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias com STORAGE_DRIVER=supabase",
      });
  });

export type Config = z.infer<typeof esquema> & { origens: string[]; cookieSeguro: boolean };

let cache: Config | undefined;

export class ConfiguracaoInvalida extends Error {}

export function config(): Config {
  if (cache) return cache;
  const r = esquema.safeParse(
    Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== "")),
  );
  if (!r.success) {
    const campos = r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new ConfiguracaoInvalida(`Configuração inválida — ${campos}`);
  }
  const c = r.data;
  const origens = [c.APP_ORIGIN, ...(c.ALLOWED_ORIGINS ?? "").split(",")]
    .map((o) => o?.trim().replace(/\/$/, ""))
    .filter((o): o is string => !!o);
  cache = { ...c, origens, cookieSeguro: c.COOKIE_SECURE ?? c.NODE_ENV === "production" };
  return cache;
}

export function redefinirConfig() {
  cache = undefined;
}
