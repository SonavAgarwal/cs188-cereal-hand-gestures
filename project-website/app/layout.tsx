import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A Robot That Eats Cereal",
  description: "Research homepage for the cereal hand gestures project.",
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
