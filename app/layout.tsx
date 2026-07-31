import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tideline — Interactive Mold Studies",
  description: "Five sand molds with independent fill interactions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
