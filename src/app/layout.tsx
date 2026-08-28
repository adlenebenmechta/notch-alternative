import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/providers/auth-provider";
import { SITE } from "@/lib/site/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "WENOV8 | AI Video Production & Creative Marketing",
    template: "%s | WENOV8",
  },
  description: SITE.description,
  applicationName: "WENOV8",
  authors: [{ name: SITE.legalName }],
  creator: SITE.legalName,
  publisher: SITE.legalName,
  keywords: [
    "AI video production",
    "AI video ads",
    "UGC-style ads",
    "product marketing videos",
    "AI avatars",
    "creative marketing",
    "AI creative studio",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "WENOV8",
    title: "WENOV8 | AI Video Production & Creative Marketing",
    description: SITE.description,
    url: SITE.url,
    locale: "en_US",
    images: [
      {
        url: "/og/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "WENOV8 — AI-Powered Video Content for Modern Brands",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WENOV8 | AI Video Production & Creative Marketing",
    description: SITE.description,
    images: ["/og/og-default.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
