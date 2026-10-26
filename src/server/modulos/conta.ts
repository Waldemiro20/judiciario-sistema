import { z } from "zod";
import { MODULOS, NIVEIS, ROLES, type Modulo, type Permissao, type Role } from "@/lib/data";
import { db } from "../db";
import { erro } from "../http/erros";
import { permissoesDe, aplicarRegrasFixas, type MapaPermissoes } from "../authz/permissoes";
import type { UsuarioSessao } from "../auth/sessao";
import type { Contexto } from "../http/rota";
import { texto, textoObrigatorio } from "../validacao";

const WIDGETS = ["resumo", "pendencias", "agenda", "tarefas", "intimacoes", "equipe"] as const;

export const esquemaPreferencias = z
  .object({
    tema: z.enum(["light", "dark"]).optional(),
    widgets: z
      .array(z.object({ id: z.enum(WIDGETS), titulo: texto(80), visivel: z.boolean() }).strict())
      .max(WIDGETS.length)
      .refine((l) => new Set(l.map((w) => w.id)).size === l.length, "Widgets repetidos.")
      .optional(),
  })
  .strict();

const listaCategorias = z.array(textoObrigatorio(60)).max(50);

export const esquemaCategorias = z
  .record(textoObrigatorio(60), listaCategorias)
  .refine((r) => Object.keys(r).length <= 20, "Grupos demais.");

export const esquemaEscritorio = z
  .object({
    nomeEscritorio: textoObrigatorio(120).optional(),
    sigla: textoObrigatorio(4)
      .transform((s) => s.toUpperCase())
      .optional(),
    cor: z.enum(["padrao", "vinho", "verde", "grafite"]).optional(),
    categorias: esquemaCategorias.optional(),
  })
  .strict();

export function preferenciasDe(valor: unknown) {
  const r = esquemaPreferencias.safeParse(valor);
  return r.success ? r.data : {};
}

export async function dadosSessao(u: UsuarioSessao, permissoes?: MapaPermissoes) {
  const [escritorio, usuario] = await Promise.all([
    db().escritorio.findUniqueOrThrow({ where: { id: u.escritorioId } }),
    db().usuario.findUniqueOrThrow({ where: { id: u.id }, select: { preferencias: true } }),
  ]);
  const categorias = esquemaCategorias.safeParse(escritorio.categorias);
  return {
    usuario: {
      id: u.id,
      nome: u.nome,
      email: u.email,
      role: u.role,
      deveTrocarSenha: u.deveTrocarSenha,
    },
    permissoes: permissoes ?? (await permissoesDe(u)),
    escritorio: {
      nomeEscritorio: escritorio.nome,
      sigla: escritorio.sigla,
      cor: escritorio.cor,
      categorias: categorias.success ? categorias.data : {},
    },
    preferencias: preferenciasDe(usuario.preferencias),
  };
}

export async function atualizarPreferencias(
  ctx: Contexto,
  dados: z.infer<typeof esquemaPreferencias>,
) {
  const atual = await db().usuario.findUniqueOrThrow({
    where: { id: ctx.usuario.id },
    select: { preferencias: true },
  });
  const novas = { ...preferenciasDe(atual.preferencias), ...dados };
  await db().usuario.update({ where: { id: ctx.usuario.id }, data: { preferencias: novas } });
  return novas;
}

export async function atualizarEscritorio(ctx: Contexto, dados: z.infer<typeof esquemaEscritorio>) {
  await db().escritorio.update({
    where: { id: ctx.usuario.escritorioId },
    data: {
      ...(dados.nomeEscritorio !== undefined && { nome: dados.nomeEscritorio }),
      ...(dados.sigla !== undefined && { sigla: dados.sigla }),
      ...(dados.cor !== undefined && { cor: dados.cor }),
      ...(dados.categorias !== undefined && { categorias: dados.categorias }),
    },
  });
  await ctx.auditar({
    acao: "Editou",
    modulo: "Configurações",
    descricao: `Alterou ${Object.keys(dados).join(", ")} do escritório`,
    recursoTipo: "Escritorio",
    recursoId: ctx.usuario.escritorioId,
  });
  return (await dadosSessao(ctx.usuario, ctx.permissoes)).escritorio;
}

export async function matrizPermissoes(escritorioId: string) {
  const linhas = await db().permissaoPerfil.findMany({ where: { escritorioId } });
  const matriz = {} as Record<Role, MapaPermissoes>;
  for (const r of ROLES) {
    const mapa = Object.fromEntries(MODULOS.map((m) => [m, "nenhum"])) as MapaPermissoes;
    for (const l of linhas) if (l.role === r) mapa[l.modulo as Modulo] = l.nivel as Permissao;
    matriz[r] = aplicarRegrasFixas(r, mapa);
  }
  return matriz;
}

export const esquemaPermissao = z
  .object({
    role: z.enum(ROLES),
    modulo: z.enum(MODULOS as unknown as [Modulo, ...Modulo[]]),
    nivel: z.enum(NIVEIS),
  })
  .strict();

export async function alterarPermissao(ctx: Contexto, d: z.infer<typeof esquemaPermissao>) {
  if (d.modulo === "Financeiro")
    throw erro.proibido("O acesso ao Financeiro é fixo: exclusivo do administrador.");
  if (d.role === "admin" && d.modulo === "Configurações")
    throw erro.proibido("O administrador não pode perder o acesso às Configurações.");
  if (d.role === ctx.usuario.role)
    throw erro.proibido("Você não pode alterar as permissões do seu próprio perfil.");
  const anterior = await db().permissaoPerfil.findUnique({
    where: {
      escritorioId_role_modulo: {
        escritorioId: ctx.usuario.escritorioId,
        role: d.role,
        modulo: d.modulo,
      },
    },
  });
  await db().$transaction(async (tx) => {
    await tx.permissaoPerfil.upsert({
      where: {
        escritorioId_role_modulo: {
          escritorioId: ctx.usuario.escritorioId,
          role: d.role,
          modulo: d.modulo,
        },
      },
      create: {
        escritorioId: ctx.usuario.escritorioId,
        role: d.role,
        modulo: d.modulo,
        nivel: d.nivel,
      },
      update: { nivel: d.nivel },
    });
    await ctx.auditarTx(tx, {
      acao: "Editou",
      modulo: "Configurações",
      descricao: `Permissão de ${d.role} em ${d.modulo}: ${anterior?.nivel ?? "nenhum"} → ${d.nivel}`,
      recursoTipo: "PermissaoPerfil",
      recursoId: `${d.role}:${d.modulo}`,
    });
  });
  return matrizPermissoes(ctx.usuario.escritorioId);
}
