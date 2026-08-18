import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Nunito,
  Playfair_Display,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/site/site-header";
import { ThemeProvider } from "@/components/site/theme-provider";
import { SwRegister } from "@/components/site/sw-register";

const geistSans = Geist({
  variable: "--font-sans-base",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fuentes disponibles para los temas del page builder (ver `src/lib/theme.ts`).
const spaceGrotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-rounded",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Nevetico — Eventos para comunidades",
    template: "%s · Nevetico",
  },
  description:
    "Crea y gestiona eventos para tu comunidad tech o local. Páginas personalizables, RSVP, check-in con QR y emails. Plan Community gratis.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Nevetico",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${playfair.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteHeader />
          <main className="flex-1 flex flex-col">{children}</main>
          <Toaster richColors position="top-center" />
          <SwRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
