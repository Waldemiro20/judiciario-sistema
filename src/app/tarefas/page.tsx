import type { Metadata } from "next";
import TarefasPage from "@/views/tarefas";

export const metadata: Metadata = {
  title: "Tarefas — Gestão Jurídica",
};

export default function Page() {
  return <TarefasPage />;
}
