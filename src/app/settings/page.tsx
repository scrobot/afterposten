"use client";

import { useEffect, useState, useCallback } from "react";

interface AppSettings {
    timezone: string;
    schedulerPollIntervalSec: number;
    defaultPublisherProfileId: string | null;
    maxPublishAttempts: number;
}

interface PublisherProfile {
    id: string;
    name: string;
    webhookUrl: string;
    authType: string;
    authHeaderName: string | null;
    binaryFieldName: string;
    extraPayloadJson: string;
    hasAuthValue: boolean;
    hasBearerToken: boolean;
}

type Tab = "general" | "n8n";

export default function SettingsPage() {
    const [tab, setTab] = useState<Tab>("general");
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [profiles, setProfiles] = useState<PublisherProfile[]>([]);
    const [saving, setSaving] = useState(false);
    const [saveFlash, setSaveFlash] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [blueprintCopied, setBlueprintCopied] = useState(false);

    // Profile form
    const [profileForm, setProfileForm] = useState({
        name: "",
        webhookUrl: "",
        authType: "none",
        authHeaderName: "",
        authHeaderValue: "",
        bearerToken: "",
        binaryFieldName: "mediaFile",
        extraPayloadJson: "{}",
    });
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [testingPing, setTestingPing] = useState<string | null>(null);
    const [pingResults, setPingResults] = useState<Record<string, { success: boolean; message: string }>>({});

    const fetchData = useCallback(async () => {
        const [settingsRes, profilesRes] = await Promise.all([
            fetch("/api/settings"),
            fetch("/api/publishers"),
        ]);
        if (settingsRes.ok) setSettings(await settingsRes.json());
        if (profilesRes.ok) setProfiles(await profilesRes.json());
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const saveSettings = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            setSaveFlash(true);
            setTimeout(() => setSaveFlash(false), 2000);
        } finally {
            setSaving(false);
        }
    };

    const openCreateProfile = () => {
        setEditingProfileId(null);
        setProfileForm({
            name: "",
            webhookUrl: "",
            authType: "none",
            authHeaderName: "",
            authHeaderValue: "",
            bearerToken: "",
            binaryFieldName: "mediaFile",
            extraPayloadJson: "{}",
        });
        setShowProfileModal(true);
    };

    const openEditProfile = (profile: PublisherProfile) => {
        setEditingProfileId(profile.id);
        setProfileForm({
            name: profile.name,
            webhookUrl: profile.webhookUrl,
            authType: profile.authType,
            authHeaderName: profile.authHeaderName ?? "",
            authHeaderValue: "",
            bearerToken: "",
            binaryFieldName: profile.binaryFieldName,
            extraPayloadJson: profile.extraPayloadJson,
        });
        setShowProfileModal(true);
    };

    const saveProfile = async () => {
        try {
            const url = editingProfileId
                ? `/api/publishers/${editingProfileId}`
                : "/api/publishers";
            const method = editingProfileId ? "PUT" : "POST";

            await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(profileForm),
            });
            setShowProfileModal(false);
            await fetchData();
        } catch (e) {
            console.error("Failed to save profile:", e);
        }
    };

    const deleteProfile = async (id: string) => {
        if (!confirm("Delete this publisher profile?")) return;
        await fetch(`/api/publishers/${id}`, { method: "DELETE" });
        await fetchData();
    };

    const testPing = async (id: string) => {
        setTestingPing(id);
        try {
            const res = await fetch(`/api/publishers/${id}/test-ping`, {
                method: "POST",
            });
            const data = await res.json();
            setPingResults((prev) => ({
                ...prev,
                [id]: { success: data.success, message: data.message },
            }));
        } catch {
            setPingResults((prev) => ({
                ...prev,
                [id]: { success: false, message: "Connection failed" },
            }));
        } finally {
            setTestingPing(null);
        }
    };

    const getAuthLabel = (type: string) => {
        switch (type) {
            case "header": return "Custom Header";
            case "bearer": return "Bearer Token";
            default: return "No Auth";
        }
    };

    if (!settings) {
        return (
            <div className="empty-state">
                <span className="spinner" />
            </div>
        );
    }

    return (
        <>
            <div className="page-header">
                <h1>Settings</h1>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${tab === "general" ? "active" : ""}`}
                    onClick={() => setTab("general")}
                >
                    ⚙️ General
                </button>
                <button
                    className={`tab ${tab === "n8n" ? "active" : ""}`}
                    onClick={() => setTab("n8n")}
                >
                    🔌 n8n Integration
                </button>
            </div>

            {/* ─── General Settings ─── */}
            {tab === "general" && (
                <div className="settings-section">
                    <div className="card" style={{ maxWidth: 600 }}>
                        <div className="card-header">
                            <h3>⚙️ Scheduler & Defaults</h3>
                        </div>
                        <div className="form-group">
                            <label>Timezone</label>
                            <input
                                type="text"
                                value={settings.timezone}
                                onChange={(e) =>
                                    setSettings({ ...settings, timezone: e.target.value })
                                }
                                placeholder="e.g. Europe/Belgrade"
                            />
                            <small style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
                                IANA timezone name — used to convert your scheduled times to UTC
                            </small>
                        </div>
                        <div className="form-group">
                            <label>Scheduler Poll Interval (seconds)</label>
                            <input
                                type="number"
                                min={1}
                                value={settings.schedulerPollIntervalSec}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        schedulerPollIntervalSec: Number(e.target.value),
                                    })
                                }
                            />
                            <small style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
                                How often the scheduler checks for due posts
                            </small>
                        </div>
                        <div className="form-group">
                            <label>Max Publish Attempts</label>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                value={settings.maxPublishAttempts}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        maxPublishAttempts: Number(e.target.value),
                                    })
                                }
                            />
                            <small style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
                                After this many failures, a post is marked as permanently failed
                            </small>
                        </div>
                        <div className="form-group">
                            <label>Default Publisher Profile</label>
                            <select
                                value={settings.defaultPublisherProfileId ?? ""}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        defaultPublisherProfileId: e.target.value || null,
                                    })
                                }
                            >
                                <option value="">None</option>
                                {profiles.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            <small style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
                                Used when no profile is selected on individual posts
                            </small>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={saveSettings}
                            disabled={saving}
                            style={{ marginTop: 8 }}
                        >
                            {saving ? <span className="spinner" /> : saveFlash ? "✓ Saved!" : "Save Settings"}
                        </button>
                    </div>
                </div>
            )}

            {/* ─── n8n Integration ─── */}
            {tab === "n8n" && (
                <div className="settings-section">
                    {/* n8n Workflow Blueprint */}
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header">
                            <h3>📦 n8n Workflow Blueprint</h3>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={async () => {
                                        const res = await fetch("/n8n-workflow-blueprint.json");
                                        const json = await res.text();
                                        await navigator.clipboard.writeText(json);
                                        setBlueprintCopied(true);
                                        setTimeout(() => setBlueprintCopied(false), 2000);
                                    }}
                                >
                                    {blueprintCopied ? "✓ Copied!" : "📋 Copy JSON"}
                                </button>
                                <a
                                    href="/n8n-workflow-blueprint.json"
                                    download="afterposten-n8n-workflow.json"
                                    className="btn btn-sm btn-secondary"
                                    style={{ textDecoration: "none" }}
                                >
                                    ⬇️ Download
                                </a>
                            </div>
                        </div>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 12px", lineHeight: 1.5 }}>
                            Import this ready-made workflow into n8n to get started instantly.
                            It includes a Webhook trigger, field extraction, image detection, and a success response.
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                            <div style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: 8, textAlign: "center" }}>
                                <div style={{ fontSize: 22 }}>🔗</div>
                                <strong style={{ fontSize: 11 }}>Webhook</strong>
                                <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>POST trigger</p>
                            </div>
                            <div style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: 8, textAlign: "center" }}>
                                <div style={{ fontSize: 22 }}>📦</div>
                                <strong style={{ fontSize: 11 }}>Extract</strong>
                                <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Parse fields</p>
                            </div>
                            <div style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: 8, textAlign: "center" }}>
                                <div style={{ fontSize: 22 }}>🖼️</div>
                                <strong style={{ fontSize: 11 }}>Image?</strong>
                                <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Check binary</p>
                            </div>
                            <div style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: 8, textAlign: "center" }}>
                                <div style={{ fontSize: 22 }}>✅</div>
                                <strong style={{ fontSize: 11 }}>Respond</strong>
                                <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Success JSON</p>
                            </div>
                        </div>
                        <details style={{ marginTop: 12 }}>
                            <summary style={{ fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--accent)", padding: "4px 0" }}>
                                How to import into n8n
                            </summary>
                            <ol style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.8 }}>
                                <li>Copy the JSON above or download the file</li>
                                <li>Open n8n → <strong>Workflows</strong> → <strong>+ Add Workflow</strong></li>
                                <li>Click the <strong>⋯</strong> menu → <strong>Import from JSON</strong></li>
                                <li>Paste or upload the workflow JSON</li>
                                <li>Click <strong>Save</strong>, then <strong>Activate</strong> the workflow</li>
                                <li>Copy the <strong>Production Webhook URL</strong> from the Webhook node</li>
                                <li>Paste it into a Publisher Profile below</li>
                            </ol>
                        </details>
                    </div>

                    {/* Setup Guide */}
                    <div className="card" style={{ marginBottom: 20, borderColor: "var(--accent)", borderWidth: 1, borderStyle: "solid" }}>
                        <div className="card-header">
                            <h3>🚀 Setup Steps</h3>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 8 }}>
                            <div style={{ padding: "12px 16px", background: "var(--bg-input)", borderRadius: 10, textAlign: "center" }}>
                                <div style={{ fontSize: 28, marginBottom: 6 }}>1️⃣</div>
                                <strong style={{ fontSize: 13 }}>Import Blueprint</strong>
                                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                                    Copy the workflow JSON above and import it into n8n, then activate it
                                </p>
                            </div>
                            <div style={{ padding: "12px 16px", background: "var(--bg-input)", borderRadius: 10, textAlign: "center" }}>
                                <div style={{ fontSize: 28, marginBottom: 6 }}>2️⃣</div>
                                <strong style={{ fontSize: 13 }}>Add Profile Below</strong>
                                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                                    Paste the webhook URL, configure auth, and set the binary field name for images
                                </p>
                            </div>
                            <div style={{ padding: "12px 16px", background: "var(--bg-input)", borderRadius: 10, textAlign: "center" }}>
                                <div style={{ fontSize: 28, marginBottom: 6 }}>3️⃣</div>
                                <strong style={{ fontSize: 13 }}>Test Connection</strong>
                                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                                    Hit &quot;Test Ping&quot; to verify connectivity before scheduling any posts
                                </p>
                            </div>
                        </div>

                        {/* Payload reference */}
                        <details style={{ marginTop: 16 }}>
                            <summary style={{ fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--accent)", padding: "4px 0" }}>
                                📋 Webhook payload reference
                            </summary>
                            <div style={{ marginTop: 8, padding: "10px 14px", background: "var(--bg-input)", borderRadius: 8, fontSize: 12, fontFamily: "monospace", lineHeight: 1.6 }}>
                                <div><span style={{ color: "var(--accent)" }}>text</span> — Final post text (string)</div>
                                <div><span style={{ color: "var(--accent)" }}>hashtags</span> — JSON array of hashtag strings</div>
                                <div><span style={{ color: "var(--accent)" }}>postId</span> — Unique post reference UUID</div>
                                <div><span style={{ color: "var(--accent)" }}>scheduledAt</span> — ISO 8601 datetime with timezone</div>
                                <div><span style={{ color: "var(--accent)" }}>profileName</span> — Publisher profile name</div>
                                <div><span style={{ color: "var(--accent)" }}>mediaFile</span> — Binary image file (configurable field name)</div>
                                <div style={{ marginTop: 6, color: "var(--text-muted)" }}>
                                    + Any extra fields you configure per profile
                                </div>
                            </div>
                        </details>
                    </div>

                    {/* Profiles Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 15 }}>
                            Publisher Profiles
                            <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                                ({profiles.length})
                            </span>
                        </h3>
                        <button className="btn btn-primary" onClick={openCreateProfile}>
                            + New Profile
                        </button>
                    </div>

                    {/* Profile Cards */}
                    {profiles.length === 0 ? (
                        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>🔌</div>
                            <h3 style={{ marginBottom: 6, fontWeight: 600 }}>No profiles yet</h3>
                            <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 360, margin: "0 auto", lineHeight: 1.5 }}>
                                Create a publisher profile to connect Afterposten to your n8n webhook workflow.
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={openCreateProfile}
                                style={{ marginTop: 16 }}
                            >
                                + Create First Profile
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {profiles.map((p) => {
                                const ping = pingResults[p.id];
                                const isTesting = testingPing === p.id;
                                const isDefault = settings.defaultPublisherProfileId === p.id;

                                return (
                                    <div
                                        key={p.id}
                                        className="card"
                                        style={{
                                            ...(isDefault ? { borderColor: "var(--accent)", borderWidth: 1, borderStyle: "solid" } : {}),
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                                            {/* Left: Profile info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{p.name}</h4>
                                                    {isDefault && (
                                                        <span className="badge badge-published" style={{ fontSize: 10 }}>
                                                            Default
                                                        </span>
                                                    )}
                                                    {ping && (
                                                        <span
                                                            className={`badge ${ping.success ? "badge-published" : "badge-failed"}`}
                                                            style={{ fontSize: 10 }}
                                                        >
                                                            {ping.success ? "Connected" : "Failed"}
                                                        </span>
                                                    )}
                                                </div>

                                                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 12, color: "var(--text-muted)" }}>
                                                    <span style={{ fontWeight: 500 }}>URL:</span>
                                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 11 }}>
                                                        {p.webhookUrl}
                                                    </span>
                                                    <span style={{ fontWeight: 500 }}>Auth:</span>
                                                    <span>
                                                        {getAuthLabel(p.authType)}
                                                        {p.authType === "header" && p.authHeaderName && (
                                                            <span style={{ fontFamily: "monospace", marginLeft: 4 }}>({p.authHeaderName})</span>
                                                        )}
                                                    </span>
                                                    <span style={{ fontWeight: 500 }}>Image Field:</span>
                                                    <span style={{ fontFamily: "monospace" }}>{p.binaryFieldName}</span>
                                                </div>

                                                {/* Ping result message */}
                                                {ping && (
                                                    <div style={{
                                                        marginTop: 8,
                                                        padding: "6px 10px",
                                                        borderRadius: 6,
                                                        fontSize: 11,
                                                        background: ping.success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                                                        color: ping.success ? "#22c55e" : "#ef4444",
                                                    }}>
                                                        {ping.success ? "✅" : "❌"} {ping.message}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right: Actions */}
                                            <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => testPing(p.id)}
                                                    disabled={isTesting}
                                                    style={{ minWidth: 100 }}
                                                >
                                                    {isTesting ? (
                                                        <span className="spinner" />
                                                    ) : (
                                                        "🔔 Test Ping"
                                                    )}
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => openEditProfile(p)}
                                                    style={{ minWidth: 100 }}
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => deleteProfile(p.id)}
                                                    style={{ minWidth: 100 }}
                                                >
                                                    🗑 Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Profile Modal ─── */}
            {showProfileModal && (
                <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <h2 style={{ marginBottom: 4 }}>
                            {editingProfileId ? "✏️ Edit Profile" : "🔌 New Publisher Profile"}
                        </h2>
                        <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 16 }}>
                            {editingProfileId
                                ? "Update the webhook connection settings"
                                : "Connect a new n8n webhook workflow for publishing posts"
                            }
                        </p>

                        {/* Connection */}
                        <fieldset style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                            <legend style={{ fontSize: 12, fontWeight: 600, padding: "0 8px", color: "var(--accent)" }}>
                                Connection
                            </legend>
                            <div className="form-group">
                                <label>Profile Name</label>
                                <input
                                    type="text"
                                    value={profileForm.name}
                                    onChange={(e) =>
                                        setProfileForm({ ...profileForm, name: e.target.value })
                                    }
                                    placeholder="e.g. Production LinkedIn, Staging Test"
                                />
                            </div>
                            <div className="form-group">
                                <label>Webhook URL</label>
                                <input
                                    type="url"
                                    value={profileForm.webhookUrl}
                                    onChange={(e) =>
                                        setProfileForm({ ...profileForm, webhookUrl: e.target.value })
                                    }
                                    placeholder="https://n8n.example.com/webhook/abc-123"
                                />
                                <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
                                    Copy this from your n8n Webhook node&apos;s production URL
                                </small>
                            </div>
                        </fieldset>

                        {/* Authentication */}
                        <fieldset style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                            <legend style={{ fontSize: 12, fontWeight: 600, padding: "0 8px", color: "var(--accent)" }}>
                                Authentication
                            </legend>
                            <div className="form-group">
                                <label>Auth Type</label>
                                <select
                                    value={profileForm.authType}
                                    onChange={(e) =>
                                        setProfileForm({ ...profileForm, authType: e.target.value })
                                    }
                                >
                                    <option value="none">None (local n8n only)</option>
                                    <option value="header">Custom Header</option>
                                    <option value="bearer">Bearer Token</option>
                                </select>
                            </div>

                            {profileForm.authType === "header" && (
                                <>
                                    <div className="form-group">
                                        <label>Header Name</label>
                                        <input
                                            type="text"
                                            value={profileForm.authHeaderName}
                                            onChange={(e) =>
                                                setProfileForm({
                                                    ...profileForm,
                                                    authHeaderName: e.target.value,
                                                })
                                            }
                                            placeholder="X-Auth-Key"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Header Value</label>
                                        <input
                                            type="password"
                                            value={profileForm.authHeaderValue}
                                            onChange={(e) =>
                                                setProfileForm({
                                                    ...profileForm,
                                                    authHeaderValue: e.target.value,
                                                })
                                            }
                                            placeholder={editingProfileId ? "Leave empty to keep existing" : "Enter secret value"}
                                        />
                                        <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
                                            🔒 Encrypted at rest with AES-256-GCM
                                        </small>
                                    </div>
                                </>
                            )}

                            {profileForm.authType === "bearer" && (
                                <div className="form-group">
                                    <label>Bearer Token</label>
                                    <input
                                        type="password"
                                        value={profileForm.bearerToken}
                                        onChange={(e) =>
                                            setProfileForm({
                                                ...profileForm,
                                                bearerToken: e.target.value,
                                            })
                                        }
                                        placeholder={editingProfileId ? "Leave empty to keep existing" : "Enter bearer token"}
                                    />
                                    <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
                                        🔒 Encrypted at rest with AES-256-GCM
                                    </small>
                                </div>
                            )}

                            {profileForm.authType === "none" && (
                                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0", lineHeight: 1.4 }}>
                                    ⚠️ Only recommended for local n8n instances not exposed to the internet
                                </p>
                            )}
                        </fieldset>

                        {/* Advanced */}
                        <fieldset style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                            <legend style={{ fontSize: 12, fontWeight: 600, padding: "0 8px", color: "var(--text-muted)" }}>
                                Advanced
                            </legend>
                            <div className="form-group">
                                <label>Binary Field Name</label>
                                <input
                                    type="text"
                                    value={profileForm.binaryFieldName}
                                    onChange={(e) =>
                                        setProfileForm({
                                            ...profileForm,
                                            binaryFieldName: e.target.value,
                                        })
                                    }
                                    placeholder="mediaFile"
                                />
                                <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
                                    The form field name n8n uses to receive the image binary.
                                    Default: <code style={{ color: "var(--accent)" }}>mediaFile</code>
                                </small>
                            </div>
                            <div className="form-group">
                                <label>Extra Payload Fields (JSON)</label>
                                <textarea
                                    value={profileForm.extraPayloadJson}
                                    onChange={(e) =>
                                        setProfileForm({
                                            ...profileForm,
                                            extraPayloadJson: e.target.value,
                                        })
                                    }
                                    placeholder='{"channel": "linkedin", "priority": "high"}'
                                    rows={3}
                                    style={{ fontFamily: "monospace", fontSize: 12 }}
                                />
                                <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
                                    Additional key-value pairs sent with every publish request
                                </small>
                            </div>
                        </fieldset>

                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowProfileModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={saveProfile}
                                disabled={!profileForm.name || !profileForm.webhookUrl}
                            >
                                {editingProfileId ? "Save Changes" : "Create Profile"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
