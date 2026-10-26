import { MODULOS, PERMISSOES_PADRAO, ROLES } from "@/lib/data";
import { db } from "./db";
import { gerarHash, senhaTemporaria } from "./auth/senha";

export const CATEGORIAS_PADRAO = {
  "Áreas de atuação": ["Direito Civil", "Criminal", "Previdenciário", "Família", "Consumidor"],
  "Tipos de compromisso": ["Audiência", "Reunião", "Prazo"],
  "Categorias financeiras": ["Honorários", "Custas", "Despesas fixas"],
  "Pastas de documentos": ["Petições", "Provas", "Contratos", "Pareceres"],
};

export type NovoEscritorio = {
  nomeEscritorio: string;
  sigla: string;
  admin: { nome: string; email: string; oab?: string; senha?: string };
};

export async function criarEscritorioComAdmin(d: NovoEscritorio) {
  const senha = d.admin.senha ?? senhaTemporaria();
  const senhaHash = await gerarHash(senha);
  return db().$transaction(async (tx) => {
    const e = await tx.escritorio.create({
      data: {
        nome: d.nomeEscritorio,
        sigla: d.sigla.toUpperCase().slice(0, 4),
        categorias: CATEGORIAS_PADRAO,
      },
    });
    await tx.permissaoPerfil.createMany({
      data: ROLES.flatMap((role) =>
        MODULOS.map((modulo) => ({
          escritorioId: e.id,
          role,
          modulo,
          nivel: PERMISSOES_PADRAO[role][modulo],
        })),
      ),
    });
    await tx.pasta.createMany({
      data: CATEGORIAS_PADRAO["Pastas de documentos"].map((nome) => ({ escritorioId: e.id, nome })),
    });
    const admin = await tx.usuario.create({
      data: {
        escritorioId: e.id,
        nome: d.admin.nome,
        email: d.admin.email.trim().toLowerCase(),
        oab: d.admin.oab ?? null,
        role: "admin",
        senhaHash,
        deveTrocarSenha: !d.admin.senha,
      },
    });
    await tx.auditoria.create({
      data: {
        escritorioId: e.id,
        usuarioNome: "(instalação)",
        acao: "Criou",
        modulo: "Configurações",
        descricao: `Escritório criado com o administrador ${admin.nome}`,
        recursoTipo: "Escritorio",
        recursoId: e.id,
      },
    });
    return { escritorio: e, admin, senhaTemporaria: d.admin.senha ? undefined : senha };
  });
}
