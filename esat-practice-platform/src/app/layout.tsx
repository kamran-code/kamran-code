import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "ESAT Prep — AI-Powered Practice Platform",
  description:
    "Practice for the Engineering & Science Admissions Test with a curated question bank and AI-generated questions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
          ESAT Prep — built for practice. Not affiliated with any examining body.
        </footer>
      </body>
    </html>
  );
}
