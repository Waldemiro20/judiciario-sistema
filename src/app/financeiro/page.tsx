import type { Metadata } from "next";
import FinanceiroPage from "@/views/financeiro";

export const metadata: Metadata = {
  title: "Financeiro — Gestão Jurídica",
};

export default function Page() {
  return <FinanceiroPage />;
}
