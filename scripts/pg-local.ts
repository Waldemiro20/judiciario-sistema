import { existsSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const diretorio = path.resolve(process.env["PG_LOCAL_DIR"] ?? ".pgdata");
const porta = Number(process.env["PG_LOCAL_PORTA"] ?? 54322);
const senha = process.env["PG_LOCAL_SENHA"] ?? "postgres-local";

const pg = new EmbeddedPostgres({
  databaseDir: diretorio,
  user: "postgres",
  password: senha,
  port: porta,
  persistent: true,
  onLog: () => {},
});

const novo = !existsSync(path.join(diretorio, "PG_VERSION"));
if (novo) await pg.initialise();
await pg.start();
if (novo) await pg.createDatabase("gestao");

console.log(`Postgres local rodando. Use no .env.local:`);
console.log(`DATABASE_URL="postgresql://postgres:${senha}@localhost:${porta}/gestao"`);
console.log("Ctrl+C para parar.");

const parar = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", parar);
process.on("SIGTERM", parar);
