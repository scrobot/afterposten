import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Post Studio",
  description: "AI-powered LinkedIn post creation and scheduling",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app-layout">
          <nav className="sidebar">
            <div className="sidebar-logo">
              Post Studio <span>β</span>
            </div>
            <Link href="/posts">📝 Posts</Link>
            <Link href="/settings">⚙️ Settings</Link>
          </nav>
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
