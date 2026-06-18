import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AyamKu Farm - Sistem Manajemen Peternakan Ayam",
  description: "Aplikasi manajemen peternakan ayam modern. Kelola bibit, biaya, berat, dan perhitungan secara mudah dan efisien.",
  keywords: ["peternakan", "ayam", "manajemen", "biaya", "bibit", "ternak"],
  manifest: "/api/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AyamKu Farm",
  },
  icons: {
    // Multiple sizes hint to browsers which icon to use for tabs, bookmarks, etc.
    icon: [
      { url: "/api/logo", sizes: "192x192", type: "image/png" },
      { url: "/api/logo", sizes: "512x512", type: "image/png" },
      { url: "/api/logo", sizes: "any" },
    ],
    apple: [
      { url: "/api/logo", sizes: "180x180", type: "image/png" },
      { url: "/api/logo", sizes: "192x192", type: "image/png" },
    ],
    shortcut: ["/api/logo"],
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
