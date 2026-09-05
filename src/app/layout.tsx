import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser, listSalespeople } from "@/lib/auth";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jess Ford Floor CRM",
  description: "Sales-floor CRM for Jess Ford — Milestone 1",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [currentUser, people] = await Promise.all([
    getCurrentUser(),
    listSalespeople(),
  ]);

  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <AppShell
          currentUser={{ id: currentUser.id, name: currentUser.name }}
          people={people.map((person) => ({ id: person.id, name: person.name }))}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
