import type { Metadata } from "next";
import RelatoriosPage from "@/views/relatorios";

export const metadata: Metadata = {
  title: "Relatórios — Gestão Jurídica",
};

export default function Page() {
  return <RelatoriosPage />;
}
