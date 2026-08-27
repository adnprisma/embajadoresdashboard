import type { Metadata } from "next";
import { BRAND } from "@/config/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: BRAND.name,
  description: `Dashboard interno de ${BRAND.name}`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
