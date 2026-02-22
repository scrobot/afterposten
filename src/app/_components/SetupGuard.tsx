"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * SetupGuard — redirects to /setup if initial setup is not complete.
 * Wraps all pages except /setup itself.
 */
export default function SetupGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "ready" | "redirect">(
        pathname === "/setup" ? "ready" : "loading"
    );

    useEffect(() => {
        // Don't check on the setup page itself
        if (pathname === "/setup") return;

        let cancelled = false;
        fetch("/api/settings/setup-status")
            .then((r) => r.json())
            .then((data) => {
                if (cancelled) return;
                if (!data.isComplete) {
                    setStatus("redirect");
                    router.replace("/setup");
                } else {
                    setStatus("ready");
                }
            })
            .catch(() => {
                if (!cancelled) setStatus("ready"); // On error, allow access
            });

        return () => {
            cancelled = true;
        };
    }, [pathname, router]);

    // Show nothing while checking (prevents flash of content)
    if (status === "loading" || status === "redirect") {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100vh",
                }}
            >
                <span className="spinner" />
            </div>
        );
    }

    return <>{children}</>;
}
