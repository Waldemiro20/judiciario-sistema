import { parseArgs } from "node:util";
import { existsSync } from "node:fs";
import { z } from "zod";

for (const arquivo of [".env.local", ".env"]) if (existsSync(arquivo)) process.loadEnvFile(arquivo);

const { values } = parseArgs({
  options: {
    escritorio: { type: "string" },
    sigla: { type: "string" },
    nome: { type: "string" },
    email: { type: "string" },
    oab: { type: "string" },
  },
});

const args = z
  .object({
    escritorio: z.string().trim().min(2).max(120),
    sigla: z.string().trim().min(1).max(4),
    nome: z.string().trim().min(2).max(200),
    email: z.string().trim().toLowerCase().email(),
    oab: z.string().trim().max(40).optional(),
  })
  .safeParse(values);

if (!args.success) {
  console.error(
    'Uso: npm run db:criar-escritorio -- --escritorio "Nome do Escritório" --sigla XX --nome "Nome do Admin" --email admin@exemplo.com [--oab "OAB/UF 000"]',
  );
  console.error(args.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
  process.exit(1);
}

const { criarEscritorioComAdmin } = await import("../src/server/bootstrap");
const { fecharDb } = await import("../src/server/db");

try {
  const r = await criarEscritorioComAdmin({
    nomeEscritorio: args.data.escritorio,
    sigla: args.data.sigla,
    admin: {
      nome: args.data.nome,
      email: args.data.email,
      ...(args.data.oab && { oab: args.data.oab }),
    },
  });
  console.log(`Escritório criado: ${r.escritorio.nome}`);
  console.log(`Administrador: ${r.admin.email}`);
  console.log(
    `Senha temporária (exibida só agora; troca obrigatória no primeiro acesso): ${r.senhaTemporaria}`,
  );
} catch (e) {
  console.error("Não foi possível criar o escritório:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await fecharDb();
}
