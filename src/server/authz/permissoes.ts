import { MODULOS, type Modulo, type Permissao, type Role } from "@/lib/data";
import { db } from "../db";
import { erro } from "../http/erros";
import type { UsuarioSessao } from "../auth/sessao";

export type MapaPermissoes = Record<Modulo, Permissao>;

const PESO: Record<Permissao, number> = { nenhum: 0, ver: 1, editar: 2 };

export function aplicarRegrasFixas(role: Role, mapa: MapaPermissoes): MapaPermissoes {
  return {
    ...mapa,
    Financeiro: role === "admin" ? "editar" : "nenhum",
    ...(role === "admin" && { Configurações: "editar" as const }),
  };
}

export async function permissoesDe(u: Pick<UsuarioSessao, "escritorioId" | "role">) {
  const linhas = await db().permissaoPerfil.findMany({
    where: { escritorioId: u.escritorioId, role: u.role },
  });
  const mapa = Object.fromEntries(MODULOS.map((m) => [m, "nenhum"])) as MapaPermissoes;
  for (const l of linhas) {
    if ((MODULOS as readonly string[]).includes(l.modulo) && l.nivel in PESO)
      mapa[l.modulo as Modulo] = l.nivel as Permissao;
  }
  return aplicarRegrasFixas(u.role, mapa);
}

export function permite(mapa: MapaPermissoes, modulo: Modulo, nivel: Exclude<Permissao, "nenhum">) {
  return PESO[mapa[modulo]] >= PESO[nivel];
}

export function exigir(mapa: MapaPermissoes, modulo: Modulo, nivel: Exclude<Permissao, "nenhum">) {
  if (!permite(mapa, modulo, nivel)) throw erro.proibido();
}
