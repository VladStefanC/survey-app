import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SurveyApp - Platformă sondaje",
  description: "Creează și distribuează sondaje prin email",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body style={{ background: '#0e0e10', minHeight: '100vh' }}>{children}</body>
    </html>
  );
}
