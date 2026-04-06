import type { Metadata } from "next";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SyncStatusBar } from "@/components/SyncStatusBar";

export const metadata: Metadata = {
  title: "Mission Control Dashboard",
  description: "Autonomous AI Software Factory - Virtual Mission Control",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-50">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <SyncStatusBar />
      </body>
    </html>
  );
}
