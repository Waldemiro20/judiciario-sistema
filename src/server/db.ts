import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import type { ConnectionOptions } from "node:tls";
import { SUPABASE_ROOT_CA_2021 } from "./certificados";
import { config, type Config } from "./config";

const global = globalThis as unknown as { prisma?: PrismaClient };

const PARAMETROS_SSL = ["sslmode", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"];

export function conexao(c: Pick<Config, "DATABASE_URL" | "DATABASE_SSL_CA">) {
  const url = new URL(c.DATABASE_URL);
  const modo = url.searchParams.get("sslmode");
  if (!modo || modo === "disable") return { connectionString: c.DATABASE_URL };
  for (const p of PARAMETROS_SSL) url.searchParams.delete(p);
  const supabase = /\.supabase\.(co|com)$/.test(url.hostname);
  const ca = c.DATABASE_SSL_CA ?? (supabase ? SUPABASE_ROOT_CA_2021 : undefined);
  const ssl: ConnectionOptions = { rejectUnauthorized: true, ...(ca && { ca }) };
  return { connectionString: url.toString(), ssl };
}

function criar() {
  const c = config();
  const adapter = new PrismaPg({
    ...conexao(c),
    max: c.DATABASE_POOL_MAX,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 15_000,
  });
  return new PrismaClient({ adapter });
}

export function db(): PrismaClient {
  global.prisma ??= criar();
  return global.prisma;
}

export async function fecharDb() {
  await global.prisma?.$disconnect();
  delete global.prisma;
}

export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
