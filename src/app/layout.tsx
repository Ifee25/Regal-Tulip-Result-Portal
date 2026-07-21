import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Regal Tulip Result Portal",
  description: "A Next.js and Supabase-powered school result portal for primary and nursery classes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
