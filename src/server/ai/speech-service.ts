/**
 * Speech-to-text service using OpenAI Whisper API.
 * Supports transcription (same language) and translation (any → English).
 */
import OpenAI, { toFile } from "openai";
import { resolveOpenAIKey } from "@/config/config-store";
import { MODEL_WHISPER } from "@/config/constants";

let _client: OpenAI | null = null;

async function getClient(): Promise<OpenAI> {
    if (!_client) {
        const apiKey = await resolveOpenAIKey();
        if (!apiKey) throw new Error("OpenAI API key not configured");
        _client = new OpenAI({ apiKey });
    }
    return _client;
}

/** Reset cached client — called when API key is updated. */
export function resetSpeechClient(): void {
    _client = null;
}

/**
 * Transcribe audio in its original language.
 */
export async function transcribeAudio(audioBuffer: Buffer, fileName: string): Promise<string> {
    const client = await getClient();
    const file = await toFile(audioBuffer, fileName);

    const response = await client.audio.transcriptions.create({
        model: MODEL_WHISPER,
        file,
    });

    return response.text;
}

/**
 * Translate audio from any language to English text.
 */
export async function translateAudioToEnglish(
    audioBuffer: Buffer,
    fileName: string
): Promise<string> {
    const client = await getClient();
    const file = await toFile(audioBuffer, fileName);

    const response = await client.audio.translations.create({
        model: MODEL_WHISPER,
        file,
    });

    return response.text;
}
