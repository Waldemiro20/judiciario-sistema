import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
    storageDir: string;
  }
}

function portaLivre(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, () => {
      const endereco = s.address();
      s.close(() =>
        typeof endereco === "object" && endereco
          ? resolve(endereco.port)
          : reject(new Error("porta")),
      );
    });
  });
}

export default async function (project: TestProject) {
  const base = mkdtempSync(path.join(os.tmpdir(), "lv-testes-"));
  const porta = await portaLivre();
  const pg = new EmbeddedPostgres({
    databaseDir: path.join(base, "pg"),
    user: "postgres",
    password: "senha-de-teste",
    port: porta,
    persistent: false,
    onLog: () => {},
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("testes");
  const url = `postgresql://postgres:senha-de-teste@localhost:${porta}/testes`;

  const cliente = pg.getPgClient("testes");
  await cliente.connect();
  await cliente.query("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;");
  await cliente.query("GRANT USAGE ON SCHEMA public TO anon, authenticated;");
  await cliente.query(
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;",
  );
  await cliente.end();

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DIRECT_URL: url, DATABASE_URL: url },
    stdio: "pipe",
  });

  project.provide("databaseUrl", url);
  project.provide("storageDir", path.join(base, "storage"));

  return async () => {
    await pg.stop();
    rmSync(base, { recursive: true, force: true });
  };
}
