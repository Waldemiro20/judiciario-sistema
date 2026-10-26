import type { Metadata } from "next";
import ConfiguracoesPage from "@/views/configuracoes";

export const metadata: Metadata = {
  title: "Configurações — Gestão Jurídica",
};

export default function Page() {
  return <ConfiguracoesPage />;
}
