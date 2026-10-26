import type { Metadata } from "next";
import ProcessosPage from "@/views/processos";

export const metadata: Metadata = {
  title: "Processos — Gestão Jurídica",
};

export default function Page() {
  return <ProcessosPage />;
}
