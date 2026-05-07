import type { Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata = {
  title: "Workforce Pulse",
  description: "AI-powered workforce analytics dashboard.",
} as const;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1C1C1E",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="safe-area-padding">{children}</body>
    </html>
  );
}
