"use client";

import { useState, useRef, useCallback } from "react";

interface VoiceRecorderProps {
    /** Callback with the transcribed/translated text. */
    onTranscript: (text: string) => void;
    /** "transcribe" keeps original language, "translate" converts any → English. */
    mode?: "transcribe" | "translate";
    /** Additional CSS class name. */
    className?: string;
}

type RecorderState = "idle" | "recording" | "processing";

export default function VoiceRecorder({
    onTranscript,
    mode = "translate",
    className = "",
}: VoiceRecorderProps) {
    const [state, setState] = useState<RecorderState>("idle");
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                    ? "audio/webm;codecs=opus"
                    : "audio/webm",
            });

            chunksRef.current = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Stop all tracks to release the microphone
                stream.getTracks().forEach((t) => t.stop());

                const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
                if (audioBlob.size === 0) {
                    setState("idle");
                    return;
                }

                setState("processing");
                try {
                    const formData = new FormData();
                    formData.append("audio", audioBlob, "recording.webm");
                    formData.append("mode", mode);

                    const res = await fetch("/api/speech/transcribe", {
                        method: "POST",
                        body: formData,
                    });

                    if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        throw new Error(body.error || `Transcription failed (${res.status})`);
                    }

                    const { text } = await res.json();
                    if (text) {
                        onTranscript(text);
                    }
                } catch (err) {
                    console.warn("[VoiceRecorder] Transcription error:", err);
                    setError(err instanceof Error ? err.message : "Transcription failed");
                } finally {
                    setState("idle");
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setState("recording");
        } catch (err) {
            console.warn("[VoiceRecorder] Microphone access error:", err);
            setError("Could not access microphone. Please check your browser permissions.");
            setState("idle");
        }
    }, [mode, onTranscript]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
    }, []);

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
            mediaRecorderRef.current.stop();
            chunksRef.current = [];
        }
        setState("idle");
    }, []);

    return (
        <div className={`voice-recorder ${className}`}>
            {state === "idle" && (
                <button
                    type="button"
                    className="btn btn-sm voice-recorder-btn"
                    onClick={startRecording}
                    title={mode === "translate" ? "Voice input (→ English)" : "Voice input"}
                >
                    🎙️
                </button>
            )}

            {state === "recording" && (
                <div className="voice-recorder-active">
                    <span className="voice-recorder-pulse" />
                    <span className="voice-recorder-label">Recording…</span>
                    <button
                        type="button"
                        className="btn btn-xs btn-primary"
                        onClick={stopRecording}
                    >
                        ⏹ Done
                    </button>
                    <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        onClick={cancelRecording}
                    >
                        ✕
                    </button>
                </div>
            )}

            {state === "processing" && (
                <div className="voice-recorder-active">
                    <span className="spinner" />
                    <span className="voice-recorder-label">Transcribing…</span>
                </div>
            )}

            {error && (
                <span className="voice-recorder-error" title={error}>
                    ⚠️
                </span>
            )}
        </div>
    );
}
