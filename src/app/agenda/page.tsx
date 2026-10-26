import type { Metadata } from "next";
import AgendaPage from "@/views/agenda";

export const metadata: Metadata = {
  title: "Agenda — Gestão Jurídica",
};

export default function Page() {
  return <AgendaPage />;
}
