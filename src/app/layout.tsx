import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Regal Tulip Result Portal",
  description:
    "View and manage student results for Regal Tulip School.",
  applicationName: "Regal Tulip Result Portal",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "768x768" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
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
