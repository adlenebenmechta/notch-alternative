import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Cyberwave2000, Kabisat } from "@/fonts/fonts";
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
    default: "WENOV8 | Video Production & Creative Marketing Studio",
    template: "%s | WENOV8",
  },
  description: SITE.description,
  applicationName: "WENOV8",
  authors: [{ name: SITE.legalName }],
  creator: SITE.legalName,
  publisher: SITE.legalName,
  keywords: [
    "video production",
    "video ads",
    "UGC-style ads",
    "product marketing videos",
    "AI video production",
    "AI avatars",
    "creative marketing",
    "creative studio",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "WENOV8",
    title: "WENOV8 | Video Production & Creative Marketing Studio",
    description: SITE.description,
    url: SITE.url,
    locale: "en_US",
    images: [
      {
        url: "/og/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "WENOV8 — Video Production & Creative Marketing Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WENOV8 | Video Production & Creative Marketing Studio",
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
  themeColor: "#08061c",
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
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} ${Cyberwave2000.variable} ${Kabisat.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          <ThemeProvider
            attribute="data-w8-theme"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
