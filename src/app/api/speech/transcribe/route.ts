import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio, translateAudioToEnglish } from "@/server/ai/speech-service";

const SUPPORTED_TYPES = new Set([
    "audio/webm",
    "audio/wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/mp4",
    "audio/ogg",
    "audio/flac",
]);

/** Maximum audio file size: 25 MB (OpenAI limit). */
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get("audio");
        const mode = (formData.get("mode") as string) || "translate";

        if (!audioFile || !(audioFile instanceof File)) {
            return NextResponse.json(
                { error: "Missing 'audio' file in form data" },
                { status: 400 }
            );
        }

        if (audioFile.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "Audio file exceeds 25 MB limit" }, { status: 400 });
        }

        if (audioFile.type && !SUPPORTED_TYPES.has(audioFile.type)) {
            console.warn(`[Speech] Unexpected audio type: ${audioFile.type}, proceeding anyway`);
        }

        const buffer = Buffer.from(await audioFile.arrayBuffer());
        const fileName = audioFile.name || "recording.webm";

        const text =
            mode === "transcribe"
                ? await transcribeAudio(buffer, fileName)
                : await translateAudioToEnglish(buffer, fileName);

        return NextResponse.json({ text });
    } catch (error) {
        console.error("[Speech] Transcription failed:", error);
        const message = error instanceof Error ? error.message : "Transcription failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
