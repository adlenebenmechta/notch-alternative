import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Auth Debug",
  robots: { index: false, follow: false },
};

export default function DebugAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
