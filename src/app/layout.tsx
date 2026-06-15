import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Boss Era ✦",
  description: "Mabel's personal life dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full">
        <Nav />
        <main className="pb-24 md:pb-8 pt-4 px-4 md:px-8 max-w-6xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
