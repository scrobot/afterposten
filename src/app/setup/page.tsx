"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Step = 1 | 2 | 3 | 4 | 5;

interface PublisherFormData {
    name: string;
    webhookUrl: string;
    authType: string;
    authHeaderName: string;
    authHeaderValue: string;
    bearerToken: string;
    binaryFieldName: string;
    extraPayloadJson: string;
}

const INITIAL_PUBLISHER: PublisherFormData = {
    name: "",
    webhookUrl: "",
    authType: "none",
    authHeaderName: "",
    authHeaderValue: "",
    bearerToken: "",
    binaryFieldName: "mediaFile",
    extraPayloadJson: "{}",
};

export default function SetupPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>(1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Step 1: API Key
    const [apiKey, setApiKey] = useState("");
    const [keyValidating, setKeyValidating] = useState(false);
    const [keyValid, setKeyValid] = useState<boolean | null>(null);
    const [keyError, setKeyError] = useState<string | null>(null);

    // Step 2: General settings
    const [timezone, setTimezone] = useState(
        Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Belgrade"
    );
    const [pollInterval, setPollInterval] = useState(10);
    const [maxAttempts, setMaxAttempts] = useState(5);

    // Step 3: Publisher profile (optional)
    const [skipPublisher, setSkipPublisher] = useState(false);
    const [publisher, setPublisher] = useState<PublisherFormData>(INITIAL_PUBLISHER);

    // Step 4: Agent prompt (optional)
    const [agentPrompt, setAgentPrompt] = useState("");

    // Check if already set up
    useEffect(() => {
        fetch("/api/settings/setup-status")
            .then((r) => r.json())
            .then((data) => {
                if (data.isComplete) router.replace("/posts");
            })
            .catch(() => {});
    }, [router]);

    const validateKey = useCallback(async () => {
        if (!apiKey.trim()) return;
        setKeyValidating(true);
        setKeyError(null);
        setKeyValid(null);
        try {
            const res = await fetch("/api/settings/validate-key", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiKey: apiKey.trim() }),
            });
            const data = await res.json();
            setKeyValid(data.valid);
            if (!data.valid) setKeyError(data.error || "Invalid API key");
        } catch {
            setKeyError("Failed to validate key");
            setKeyValid(false);
        } finally {
            setKeyValidating(false);
        }
    }, [apiKey]);

    const finishSetup = async () => {
        setSaving(true);
        setError(null);
        try {
            // 1. Save settings (general + agent prompt + OpenAI key)
            await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    timezone,
                    schedulerPollIntervalSec: pollInterval,
                    maxPublishAttempts: maxAttempts,
                    agentPromptInstructions: agentPrompt,
                    openaiApiKey: apiKey.trim(),
                    setupCompleted: true,
                }),
            });

            // 2. Create publisher profile if provided
            if (!skipPublisher && publisher.name && publisher.webhookUrl) {
                await fetch("/api/publishers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(publisher),
                });
            }

            router.replace("/posts");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Setup failed");
        } finally {
            setSaving(false);
        }
    };

    const canAdvance = (): boolean => {
        switch (step) {
            case 1:
                return keyValid === true;
            case 2:
                return timezone.trim().length > 0;
            case 3:
                return true; // skippable
            case 4:
                return true; // skippable
            case 5:
                return true;
            default:
                return false;
        }
    };

    const next = () => {
        if (step < 5) setStep((step + 1) as Step);
    };
    const prev = () => {
        if (step > 1) setStep((step - 1) as Step);
    };

    return (
        <div className="setup-wizard">
            <style>{`
                .setup-wizard {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    background: var(--bg-primary);
                }
                .setup-card {
                    width: 100%;
                    max-width: 580px;
                    background: var(--bg-card);
                    border-radius: 16px;
                    padding: 32px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                }
                .setup-header {
                    text-align: center;
                    margin-bottom: 32px;
                }
                .setup-header h1 {
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0 0 4px;
                }
                .setup-header p {
                    font-size: 13px;
                    color: var(--text-muted);
                    margin: 0;
                }
                .progress-bar {
                    display: flex;
                    gap: 6px;
                    margin-bottom: 28px;
                }
                .progress-step {
                    flex: 1;
                    height: 4px;
                    border-radius: 2px;
                    background: var(--bg-input);
                    transition: background 0.3s;
                }
                .progress-step.active {
                    background: var(--accent);
                }
                .progress-step.done {
                    background: var(--success, #22c55e);
                }
                .step-title {
                    font-size: 16px;
                    font-weight: 600;
                    margin: 0 0 4px;
                }
                .step-subtitle {
                    font-size: 12px;
                    color: var(--text-muted);
                    margin: 0 0 20px;
                }
                .setup-actions {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 24px;
                    gap: 12px;
                }
                .key-input-row {
                    display: flex;
                    gap: 8px;
                }
                .key-input-row input {
                    flex: 1;
                }
                .validation-msg {
                    font-size: 12px;
                    margin-top: 8px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .validation-msg.success { color: var(--success, #22c55e); }
                .validation-msg.error { color: var(--danger, #ef4444); }
                .skip-link {
                    font-size: 12px;
                    color: var(--text-muted);
                    cursor: pointer;
                    text-align: center;
                    margin-top: 12px;
                    text-decoration: underline;
                    background: none;
                    border: none;
                }
                .skip-link:hover { color: var(--text-primary); }
                .summary-grid {
                    display: grid;
                    gap: 12px;
                }
                .summary-item {
                    padding: 12px 16px;
                    background: var(--bg-input);
                    border-radius: 10px;
                }
                .summary-item label {
                    font-size: 11px;
                    color: var(--text-muted);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    display: block;
                    margin-bottom: 4px;
                }
                .summary-item .value {
                    font-size: 13px;
                    word-break: break-all;
                }
                .error-banner {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid var(--danger, #ef4444);
                    color: var(--danger, #ef4444);
                    padding: 10px 14px;
                    border-radius: 8px;
                    font-size: 13px;
                    margin-bottom: 16px;
                }
            `}</style>

            <div className="setup-card">
                <div className="setup-header">
                    <h1>
                        <Image
                            src="/logo.png"
                            alt=""
                            width={28}
                            height={28}
                            style={{ borderRadius: 6, marginRight: 8, verticalAlign: "middle" }}
                        />
                        Welcome to Afterposten
                    </h1>
                    <p>Let&apos;s set up your workspace</p>
                </div>

                {/* Progress bar */}
                <div className="progress-bar">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <div
                            key={s}
                            className={`progress-step ${s === step ? "active" : ""} ${s < step ? "done" : ""}`}
                        />
                    ))}
                </div>

                {error && <div className="error-banner">{error}</div>}

                {/* ───── Step 1: API Key ───── */}
                {step === 1 && (
                    <div>
                        <h3 className="step-title">🔑 OpenAI API Key</h3>
                        <p className="step-subtitle">
                            Required for AI-powered draft generation, images, and speech-to-text
                        </p>
                        <div className="form-group">
                            <label>API Key</label>
                            <div className="key-input-row">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => {
                                        setApiKey(e.target.value);
                                        setKeyValid(null);
                                        setKeyError(null);
                                    }}
                                    placeholder="sk-proj-..."
                                />
                                <button
                                    className="btn btn-secondary"
                                    onClick={validateKey}
                                    disabled={!apiKey.trim() || keyValidating}
                                    style={{ whiteSpace: "nowrap" }}
                                >
                                    {keyValidating ? <span className="spinner" /> : "Validate"}
                                </button>
                            </div>
                            {keyValid === true && (
                                <div className="validation-msg success">✓ Key is valid</div>
                            )}
                            {keyValid === false && keyError && (
                                <div className="validation-msg error">✗ {keyError}</div>
                            )}
                            <small
                                style={{
                                    color: "var(--text-muted)",
                                    fontSize: 11,
                                    marginTop: 8,
                                    display: "block",
                                }}
                            >
                                Get your key at{" "}
                                <a
                                    href="https://platform.openai.com/api-keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: "var(--accent)" }}
                                >
                                    platform.openai.com/api-keys
                                </a>
                            </small>
                        </div>
                    </div>
                )}

                {/* ───── Step 2: General Settings ───── */}
                {step === 2 && (
                    <div>
                        <h3 className="step-title">⚙️ General Settings</h3>
                        <p className="step-subtitle">Configure timezone and scheduling defaults</p>
                        <div className="form-group">
                            <label>Timezone</label>
                            <input
                                type="text"
                                value={timezone}
                                onChange={(e) => setTimezone(e.target.value)}
                                placeholder="e.g. Europe/Belgrade"
                            />
                            <small
                                style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}
                            >
                                IANA timezone — auto-detected from your browser
                            </small>
                        </div>
                        <div className="form-group">
                            <label>Scheduler Poll Interval (seconds)</label>
                            <input
                                type="number"
                                min={1}
                                value={pollInterval}
                                onChange={(e) => setPollInterval(Number(e.target.value))}
                            />
                            <small
                                style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}
                            >
                                How often the scheduler checks for due posts
                            </small>
                        </div>
                        <div className="form-group">
                            <label>Max Publish Attempts</label>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                value={maxAttempts}
                                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                            />
                            <small
                                style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}
                            >
                                After this many failures, a post is marked as permanently failed
                            </small>
                        </div>
                    </div>
                )}

                {/* ───── Step 3: Publisher Profile ───── */}
                {step === 3 && (
                    <div>
                        <h3 className="step-title">🔌 Publisher Profile</h3>
                        <p className="step-subtitle">
                            Connect to n8n for automated publishing (optional)
                        </p>
                        {skipPublisher ? (
                            <div
                                style={{
                                    textAlign: "center",
                                    padding: "24px 16px",
                                    background: "var(--bg-input)",
                                    borderRadius: 10,
                                }}
                            >
                                <div style={{ fontSize: 36, marginBottom: 8 }}>⏭️</div>
                                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                                    Skipped — you can add a publisher profile later in Settings
                                </p>
                                <button
                                    className="skip-link"
                                    onClick={() => setSkipPublisher(false)}
                                >
                                    Actually, let me set one up
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label>Profile Name</label>
                                    <input
                                        type="text"
                                        value={publisher.name}
                                        onChange={(e) =>
                                            setPublisher({ ...publisher, name: e.target.value })
                                        }
                                        placeholder="e.g. LinkedIn via n8n"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Webhook URL</label>
                                    <input
                                        type="url"
                                        value={publisher.webhookUrl}
                                        onChange={(e) =>
                                            setPublisher({
                                                ...publisher,
                                                webhookUrl: e.target.value,
                                            })
                                        }
                                        placeholder="https://n8n.example.com/webhook/..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Authentication</label>
                                    <select
                                        value={publisher.authType}
                                        onChange={(e) =>
                                            setPublisher({ ...publisher, authType: e.target.value })
                                        }
                                    >
                                        <option value="none">No Auth</option>
                                        <option value="header">Custom Header</option>
                                        <option value="bearer">Bearer Token</option>
                                    </select>
                                </div>
                                {publisher.authType === "header" && (
                                    <>
                                        <div className="form-group">
                                            <label>Header Name</label>
                                            <input
                                                type="text"
                                                value={publisher.authHeaderName}
                                                onChange={(e) =>
                                                    setPublisher({
                                                        ...publisher,
                                                        authHeaderName: e.target.value,
                                                    })
                                                }
                                                placeholder="X-Api-Key"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Header Value</label>
                                            <input
                                                type="password"
                                                value={publisher.authHeaderValue}
                                                onChange={(e) =>
                                                    setPublisher({
                                                        ...publisher,
                                                        authHeaderValue: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    </>
                                )}
                                {publisher.authType === "bearer" && (
                                    <div className="form-group">
                                        <label>Bearer Token</label>
                                        <input
                                            type="password"
                                            value={publisher.bearerToken}
                                            onChange={(e) =>
                                                setPublisher({
                                                    ...publisher,
                                                    bearerToken: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                )}
                                <button
                                    className="skip-link"
                                    onClick={() => setSkipPublisher(true)}
                                >
                                    Skip — I&apos;ll set this up later
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* ───── Step 4: AI Agent ───── */}
                {step === 4 && (
                    <div>
                        <h3 className="step-title">🤖 AI Agent Prompt</h3>
                        <p className="step-subtitle">
                            Customize how the AI generates your posts (optional)
                        </p>
                        <div className="form-group">
                            <label>Custom Instructions</label>
                            <textarea
                                value={agentPrompt}
                                onChange={(e) => setAgentPrompt(e.target.value)}
                                rows={8}
                                placeholder={`Example:\n\n- Write in a casual, conversational tone\n- Target audience: software engineers\n- Keep posts under 1300 characters\n- End with a thought-provoking question`}
                                style={{
                                    width: "100%",
                                    fontFamily: "inherit",
                                    fontSize: 13,
                                    lineHeight: 1.6,
                                    resize: "vertical",
                                    minHeight: 160,
                                }}
                            />
                            <small
                                style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}
                            >
                                These instructions are included in every AI generation request. You
                                can update them anytime in Settings.
                            </small>
                        </div>
                        <button className="skip-link" onClick={next}>
                            Skip — use defaults
                        </button>
                    </div>
                )}

                {/* ───── Step 5: Summary ───── */}
                {step === 5 && (
                    <div>
                        <h3 className="step-title">🚀 Ready to Launch</h3>
                        <p className="step-subtitle">Review your settings and launch Afterposten</p>
                        <div className="summary-grid">
                            <div className="summary-item">
                                <label>OpenAI API Key</label>
                                <div className="value">
                                    {apiKey ? `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}` : "—"}
                                </div>
                            </div>
                            <div className="summary-item">
                                <label>Timezone</label>
                                <div className="value">{timezone}</div>
                            </div>
                            <div className="summary-item">
                                <label>Scheduler</label>
                                <div className="value">
                                    Poll every {pollInterval}s · max {maxAttempts} attempts
                                </div>
                            </div>
                            <div className="summary-item">
                                <label>Publisher</label>
                                <div className="value">
                                    {skipPublisher || !publisher.name
                                        ? "Not configured — set up later in Settings"
                                        : `${publisher.name} (${publisher.webhookUrl.slice(0, 40)}...)`}
                                </div>
                            </div>
                            <div className="summary-item">
                                <label>AI Agent Prompt</label>
                                <div className="value">
                                    {agentPrompt.trim()
                                        ? `${agentPrompt.trim().slice(0, 80)}...`
                                        : "Default (no custom instructions)"}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ───── Navigation ───── */}
                <div className="setup-actions">
                    {step > 1 ? (
                        <button className="btn btn-secondary" onClick={prev}>
                            ← Back
                        </button>
                    ) : (
                        <div />
                    )}
                    {step < 5 ? (
                        <button className="btn btn-primary" onClick={next} disabled={!canAdvance()}>
                            Next →
                        </button>
                    ) : (
                        <button
                            className="btn btn-primary"
                            onClick={finishSetup}
                            disabled={saving}
                            style={{ minWidth: 160 }}
                        >
                            {saving ? <span className="spinner" /> : "🚀 Launch Afterposten"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
