import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { BRAND } from "@/config/brand";
import "./globals.css";

// Ver BRANDING.md — tipografía pendiente de decisión de marca.
// Genera la variable CSS --font-ibm-plex-sans, referenciada desde
// src/styles/tokens.css (--font-body y, por ahora, --font-display).
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-ibm-plex-sans",
});

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
    <html lang="es-MX" className={ibmPlexSans.variable}>
      <body>
        <QueryProvider>
          {children}
          <Toaster theme="light" position="top-center" />
        </QueryProvider>
      </body>
    </html>
  );
}
