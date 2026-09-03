import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deadline Tracker",
  description: "ManageBac deadlines and Outlook mail in one place",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
