import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "LAW1 — Secure Digital Evidence & Legal Document Management System",
  description:
    "Secure Evidence. Intelligent Investigation. Complete Accountability.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      style={{
        ["--font-plex-sans" as string]: "'IBM Plex Sans', system-ui, sans-serif",
        ["--font-plex-mono" as string]: "'IBM Plex Mono', ui-monospace, monospace",
      }}
    >
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
