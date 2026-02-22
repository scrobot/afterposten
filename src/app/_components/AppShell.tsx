"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import SetupGuard from "./SetupGuard";

/**
 * AppShell — handles the sidebar + SetupGuard.
 * On the /setup page, we show just the content with no sidebar.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isSetupPage = pathname === "/setup";

    return (
        <SetupGuard>
            {isSetupPage ? (
                <>{children}</>
            ) : (
                <div className="app-layout">
                    <nav className="sidebar">
                        <div className="sidebar-logo">
                            <Image
                                src="/logo.png"
                                alt="Afterposten"
                                width={24}
                                height={24}
                                style={{ borderRadius: 6, marginRight: 8, verticalAlign: "middle" }}
                            />
                            Afterposten <span>β</span>
                        </div>
                        <Link href="/posts">📝 Posts</Link>
                        <Link href="/settings">⚙️ Settings</Link>
                    </nav>
                    <main className="main-content">{children}</main>
                </div>
            )}
        </SetupGuard>
    );
}
