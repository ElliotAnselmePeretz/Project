import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studybase",
  description: "ManageBac deadlines, IB subjects and Outlook mail in one place",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // Runs before paint: without it the page renders in the OS theme and
          // then snaps to the stored one, which is a visible flash.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("studybase-theme");if(t&&t!=="system")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
