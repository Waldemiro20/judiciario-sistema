import type { Metadata } from "next";
import ClientesPage from "@/views/clientes";

export const metadata: Metadata = {
  title: "Clientes — Gestão Jurídica",
};

export default function Page() {
  return <ClientesPage />;
}
