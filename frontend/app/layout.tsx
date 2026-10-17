import type { Metadata } from "next";
import { Saira_Stencil, Barlow, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Masthead } from "@/components/Masthead";
import { SITE_URL } from "@/lib/config";

const stencil = Saira_Stencil({ weight: "400", subsets: ["latin"], variable: "--font-stencil" });
const body = Barlow({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-body" });
const readout = Share_Tech_Mono({ weight: "400", subsets: ["latin"], variable: "--font-readout" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "RiddleVault: crack the vault, AI validators judge",
  description:
    "Lock a prize behind a riddle. GenLayer AI validators judge every answer by consensus, the first solver takes the vault, rejected answers can be appealed, and unsolved vaults refund everyone.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${stencil.variable} ${body.variable} ${readout.variable}`}>
      <body>
        <Providers>
          <Masthead />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-center">
            <span className="label">Points only, no real money. Runs on GenLayer Studionet (chain 61999), which can reset.</span>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
