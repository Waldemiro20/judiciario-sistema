import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import LoginPage from "@/views/login";

export const metadata: Metadata = {
  title: "Entrar — Gestão Jurídica",
};

export const viewport: Viewport = { themeColor: "#2B2119" };

export default function Page() {
  preload("/login.jpeg", { as: "image" });
  return <LoginPage />;
}
