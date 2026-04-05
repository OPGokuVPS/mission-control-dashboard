import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}