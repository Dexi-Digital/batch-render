import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jardim das Acácias II — Mapa de Lotes",
  description: "Jardim das Acácias II - Visualizador de Lotes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
