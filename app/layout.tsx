import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tumor Growth Simulator",
  description: "An educational simulator of tumor growth and drug treatment using ODE models.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold tracking-tight text-secondary">
              Tumor Growth Simulator
            </span>
            <SiteNav />
          </header>

          <main className="flex-1">{children}</main>

          <footer className="mt-10 border-t border-border pt-4 text-xs text-muted">
            Educational model, not medical advice.
          </footer>
        </div>
      </body>
    </html>
  );
}
