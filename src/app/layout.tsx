import type { Metadata } from "next";
import { Fredoka, Quicksand } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

// Edge Runtime : démarrage quasi instantané (pas de cold start de
// conteneur Node comme en serverless classique) — appliqué à toute
// l'app, seules les routes qui déclarent explicitement leur propre
// runtime (ex. /icon) y échappent.
export const runtime = "edge";

export const metadata: Metadata = {
  title: "Onjoo",
  description: "On joue ? Scores et historique des jeux de société en famille.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${fredoka.variable} ${quicksand.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-quicksand text-[#333]">
        <NavBar />
        <div className="flex-1 pb-20 sm:pb-0">{children}</div>
      </body>
    </html>
  );
}
