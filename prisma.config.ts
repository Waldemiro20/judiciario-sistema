import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

for (const arquivo of [".env.local", ".env"]) {
  if (existsSync(arquivo)) process.loadEnvFile(arquivo);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"] ?? "" },
});
