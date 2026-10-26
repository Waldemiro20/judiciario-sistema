import { inject } from "vitest";

Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: inject("databaseUrl"),
  APP_ORIGIN: "http://localhost:3000",
  STORAGE_DRIVER: "local",
  STORAGE_LOCAL_DIR: inject("storageDir"),
  LOG_LEVEL: "error",
  TRUST_PROXY: "true",
  API_LIMITE_POR_MINUTO: "10000",
});
