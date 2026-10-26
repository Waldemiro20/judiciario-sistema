import type { Metadata } from "next";
import AudienciasPage from "@/views/audiencias";

export const metadata: Metadata = {
  title: "Audiências — Gestão Jurídica",
};

export default function Page() {
  return <AudienciasPage />;
}
