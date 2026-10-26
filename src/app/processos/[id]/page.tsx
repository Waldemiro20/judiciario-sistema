import type { Metadata } from "next";
import ProcessoPage from "@/views/processos-detalhe";

export const metadata: Metadata = {
  title: "Processo — Gestão Jurídica",
};

export default function Page() {
  return <ProcessoPage />;
}
