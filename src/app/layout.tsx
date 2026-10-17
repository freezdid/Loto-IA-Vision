import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Loto IA Vision · Studio d'analyse LSTM",
  description:
    "Studio indépendant d'analyse des tirages du Loto : réseau LSTM entraîné dans le navigateur, statistiques de fréquence, audit de grille et backtest honnête.",
  applicationName: "Loto IA Vision",
  authors: [{ name: "Antigravity Studio" }],
};

export const viewport: Viewport = {
  themeColor: "#020510",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
