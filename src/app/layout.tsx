import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/providers/auth-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Avatar Machine - Create AI Videos & Avatars",
  description: "Create stunning AI avatar videos, claymotion animations, viral carousels, and podcasts with the most powerful AI media generation platform.",
  keywords: ["AI Avatar", "AI Video", "AI Podcast", "Claymotion", "AI Media Generation", "Video Creation", "Image Generation"],
  authors: [{ name: "AI Avatar Machine" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "AI Avatar Machine - Create AI Videos & Avatars",
    description: "Create stunning AI avatar videos, claymotion animations, viral carousels, and podcasts.",
    siteName: "AI Avatar Machine",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Avatar Machine - Create AI Videos & Avatars",
    description: "Create stunning AI avatar videos, claymotion animations, viral carousels, and podcasts.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
