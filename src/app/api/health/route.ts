import { json, rotaPublica } from "@/server/http/rota";
import { db } from "@/server/db";
import { log } from "@/server/log";

export const GET = rotaPublica({ limitePorMinuto: 60 }, async (ctx) => {
  const pronto = new URL(ctx.req.url).searchParams.has("pronto");
  if (!pronto) return json({ status: "ok" });
  try {
    await db().$queryRaw`SELECT 1`;
    return json({ status: "ok", banco: "ok" });
  } catch (e) {
    log.error("health: banco indisponível", { erro: e, requestId: ctx.requestId });
    return json({ status: "degradado", banco: "indisponivel" }, 503);
  }
});
