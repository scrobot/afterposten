import { NextResponse } from "next/server";
import { schedulerTick } from "@/server/scheduler/poller";

/**
 * Manual scheduler tick endpoint — for testing and debugging.
 * Triggers one execution cycle of the scheduler.
 */
export async function POST() {
    try {
        const result = await schedulerTick();
        return NextResponse.json(result);
    } catch (error) {
        console.error("POST /api/scheduler/tick error:", error);
        return NextResponse.json(
            { error: "Scheduler tick failed" },
            { status: 500 }
        );
    }
}
