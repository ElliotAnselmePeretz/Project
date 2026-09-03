import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studybase",
  description: "ManageBac deadlines, IB subjects and Outlook mail in one place",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
