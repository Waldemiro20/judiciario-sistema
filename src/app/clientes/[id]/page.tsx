import type { Metadata } from "next";
import { Suspense } from "react";
import ClientePage from "@/views/clientes-detalhe";

export const metadata: Metadata = {
  title: "Cliente — Gestão Jurídica",
};

export default function Page() {
  return (
    <Suspense>
      <ClientePage />
    </Suspense>
  );
}
