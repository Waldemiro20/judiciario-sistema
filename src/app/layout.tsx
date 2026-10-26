import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "../styles.css";

export const metadata: Metadata = {
  title: "Vértice — Gestão Jurídica",
  description: "Sistema interno de gestão jurídica: prazos, processos, tarefas e equipe.",
  openGraph: { type: "website" },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [
      { url: "/favicon.ico?v=lv", sizes: "any" },
      { url: "/favicon.png?v=lv", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png?v=lv",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Playfair+Display:wght@500;600&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
