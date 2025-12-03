import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RESEARCH AGENT v1.0 | Terminal Interface",
  description: "Professional Hypothesis Validation System - Z.AI GLM-4.6 Powered",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=VT323&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

