import type { Metadata } from "next";
import DocumentosPage from "@/views/documentos";

export const metadata: Metadata = {
  title: "Documentos — Gestão Jurídica",
};

export default function Page() {
  return <DocumentosPage />;
}
