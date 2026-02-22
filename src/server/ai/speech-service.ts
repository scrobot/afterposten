/**
 * Speech-to-text service using OpenAI Whisper API.
 * Supports transcription (same language) and translation (any → English).
 */
import OpenAI, { toFile } from "openai";
import { env } from "@/config/env";
import { MODEL_WHISPER } from "@/config/constants";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
    if (!_client) {
        _client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
    return _client;
}

/**
 * Transcribe audio in its original language.
 */
export async function transcribeAudio(audioBuffer: Buffer, fileName: string): Promise<string> {
    const client = getClient();
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
    const client = getClient();
    const file = await toFile(audioBuffer, fileName);

    const response = await client.audio.translations.create({
        model: MODEL_WHISPER,
        file,
    });

    return response.text;
}
