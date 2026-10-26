import type { Metadata } from "next";
import Dashboard from "@/views/dashboard";

export const metadata: Metadata = {
  title: "Dashboard — Gestão Jurídica",
  description: "Resumo do escritório: tarefas, audiências, pendências e intimações.",
};

export default function Page() {
  return <Dashboard />;
}
