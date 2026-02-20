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

export default function SettingsPage() {
    const [tab, setTab] = useState<"general" | "publishers">("general");
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [profiles, setProfiles] = useState<PublisherProfile[]>([]);
    const [saving, setSaving] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);

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
    const [pingResult, setPingResult] = useState<string | null>(null);

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
        setPingResult(null);
        try {
            const res = await fetch(`/api/publishers/${id}/test-ping`, {
                method: "POST",
            });
            const data = await res.json();
            setPingResult(
                data.success ? `✅ ${data.message}` : `❌ ${data.message}`
            );
        } catch {
            setPingResult("❌ Connection failed");
        } finally {
            setTestingPing(null);
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
                    General
                </button>
                <button
                    className={`tab ${tab === "publishers" ? "active" : ""}`}
                    onClick={() => setTab("publishers")}
                >
                    Publisher Profiles
                </button>
            </div>

            {/* General Settings */}
            {tab === "general" && (
                <div className="settings-section">
                    <div className="card" style={{ maxWidth: 600 }}>
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
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={saveSettings}
                            disabled={saving}
                        >
                            {saving ? <span className="spinner" /> : "Save Settings"}
                        </button>
                    </div>
                </div>
            )}

            {/* Publisher Profiles */}
            {tab === "publishers" && (
                <div className="settings-section">
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                        <button className="btn btn-primary" onClick={openCreateProfile}>
                            + Add Profile
                        </button>
                    </div>

                    {profiles.length === 0 ? (
                        <div className="empty-state">
                            <h3>No publisher profiles</h3>
                            <p>Create a publisher profile to connect to your n8n webhook.</p>
                        </div>
                    ) : (
                        profiles.map((p) => (
                            <div key={p.id} className="profile-card">
                                <div className="profile-card-info">
                                    <h4>{p.name}</h4>
                                    <p>
                                        {p.webhookUrl} · Auth: {p.authType} · Field: {p.binaryFieldName}
                                    </p>
                                </div>
                                <div className="profile-card-actions">
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => testPing(p.id)}
                                        disabled={testingPing === p.id}
                                    >
                                        {testingPing === p.id ? (
                                            <span className="spinner" />
                                        ) : (
                                            "🔔 Test Ping"
                                        )}
                                    </button>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => openEditProfile(p)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => deleteProfile(p.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}

                    {pingResult && (
                        <div
                            style={{
                                marginTop: 12,
                                padding: 10,
                                borderRadius: 8,
                                background: "var(--bg-input)",
                                fontSize: 13,
                            }}
                        >
                            {pingResult}
                        </div>
                    )}
                </div>
            )}

            {/* Profile Modal */}
            {showProfileModal && (
                <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>
                            {editingProfileId ? "Edit Profile" : "New Publisher Profile"}
                        </h2>

                        <div className="form-group">
                            <label>Name</label>
                            <input
                                type="text"
                                value={profileForm.name}
                                onChange={(e) =>
                                    setProfileForm({ ...profileForm, name: e.target.value })
                                }
                                placeholder="e.g. Production, Staging"
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
                                placeholder="https://n8n.example.com/webhook/..."
                            />
                        </div>
                        <div className="form-group">
                            <label>Auth Type</label>
                            <select
                                value={profileForm.authType}
                                onChange={(e) =>
                                    setProfileForm({ ...profileForm, authType: e.target.value })
                                }
                            >
                                <option value="none">None</option>
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
                                        placeholder="Enter value (leave empty to keep existing)"
                                    />
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
                                    placeholder="Enter token (leave empty to keep existing)"
                                />
                            </div>
                        )}

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
                        </div>
                        <div className="form-group">
                            <label>Extra Payload (JSON)</label>
                            <textarea
                                value={profileForm.extraPayloadJson}
                                onChange={(e) =>
                                    setProfileForm({
                                        ...profileForm,
                                        extraPayloadJson: e.target.value,
                                    })
                                }
                                placeholder='{"key": "value"}'
                                rows={3}
                            />
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowProfileModal(false)}
                            >
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={saveProfile}>
                                {editingProfileId ? "Save Changes" : "Create Profile"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
