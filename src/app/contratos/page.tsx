import type { Metadata } from "next";
import ContratosPage from "@/views/contratos";

export const metadata: Metadata = {
  title: "Contratos e Peças — Gestão Jurídica",
};

export default function Page() {
  return <ContratosPage />;
}
