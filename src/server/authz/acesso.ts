import type { Prisma } from "@/generated/prisma/client";
import type { UsuarioSessao } from "../auth/sessao";

type U = Pick<UsuarioSessao, "id" | "escritorioId">;

export function processoVisivel(u: U): Prisma.ProcessoWhereInput {
  return {
    escritorioId: u.escritorioId,
    OR: [{ sigiloso: false }, { responsavelId: u.id }, { equipe: { some: { usuarioId: u.id } } }],
  };
}

export function processoOpcionalVisivel(u: U) {
  return { OR: [{ processoId: null }, { processo: { is: processoVisivel(u) } }] };
}

export function pastaVisivel(u: U): Prisma.PastaWhereInput {
  return {
    escritorioId: u.escritorioId,
    OR: [{ confidencial: false }, { acessos: { some: { usuarioId: u.id } } }],
  };
}

export function documentoVisivel(u: U): Prisma.DocumentoWhereInput {
  return {
    escritorioId: u.escritorioId,
    pasta: { is: pastaVisivel(u) },
    ...processoOpcionalVisivel(u),
  };
}
