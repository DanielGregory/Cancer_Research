import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tumor Growth Simulator",
  description: "An educational simulator of tumor growth and drug treatment using ODE models.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
