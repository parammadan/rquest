import type { Metadata, Viewport } from "next";
import { Geist, JetBrains_Mono, Sora } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"], display: "swap" });
const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RQuest — Research Programmer Academy",
    template: "%s · RQuest",
  },
  description:
    "A game-based academy for R programmers, research engineers, and statisticians: five worlds from R fundamentals to reproducible statistical programming.",
};

export const viewport: Viewport = {
  themeColor: "#04060b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${geist.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
