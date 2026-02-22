"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import {
    draftOutputSchema,
    variantsOutputSchema,
    hashtagsOutputSchema,
    formatDraftToText,
    STYLE_PRESETS,
    ASPECT_RATIOS,
    IMAGE_FORMATS,
} from "@/shared/types";
import type { DraftOutput } from "@/shared/types";
import VoiceRecorder from "@/app/_components/VoiceRecorder";

interface PostFull {
    id: string;
    idea: string;
    status: string;
    finalText: string | null;
    publisherProfileId: string | null;
    createdAt: string;
    updatedAt: string;
    drafts: Array<{
        id: string;
        kind: string;
        contentJson: string;
        createdAt: string;
    }>;
    assets: Array<{
        id: string;
        type: string;
        path: string;
        altText: string;
        metaJson: string;
        createdAt: string;
    }>;
    schedules: Array<{
        id: string;
        scheduledAtUtc: string;
        scheduledTz: string;
        status: string;
        attempts: number;
        lastError: string | null;
    }>;
    publishRuns: Array<{
        id: string;
        status: string;
        createdAt: string;
        publisherProfile: { name: string };
    }>;
    publisherProfile: { id: string; name: string } | null;
}

interface PublisherProfile {
    id: string;
    name: string;
    webhookUrl: string;
    authType: string;
}

export default function PostEditorPage() {
    const params = useParams();
    const router = useRouter();
    const postId = params.id as string;

    const [post, setPost] = useState<PostFull | null>(null);
    const [loading, setLoading] = useState(true);
    const [idea, setIdea] = useState("");
    const [finalText, setFinalText] = useState("");
    const [saving, setSaving] = useState(false);
    const [profiles, setProfiles] = useState<PublisherProfile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState("");
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduling, setScheduling] = useState(false);

    // Image generation state
    const [imagePrompt, setImagePrompt] = useState("");
    const [imagePreset, setImagePreset] = useState(STYLE_PRESETS[0]);
    const [imageAspect, setImageAspect] = useState(ASPECT_RATIOS[0]);
    const [imageFormat, setImageFormat] = useState(IMAGE_FORMATS[0]);
    const [generatingImage, setGeneratingImage] = useState(false);
    const [generatingAlt, setGeneratingAlt] = useState(false);

    // AI streaming hooks
    const {
        object: draftObject,
        submit: submitDraft,
        isLoading: draftLoading,
    } = useObject({
        api: `/api/posts/${postId}/generate/draft`,
        schema: draftOutputSchema,
    });

    const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        object: variantsObject,
        submit: submitVariants,
        isLoading: variantsLoading,
    } = useObject({
        api: `/api/posts/${postId}/generate/variants`,
        schema: variantsOutputSchema,
    });

    const {
        object: hashtagsObject,
        submit: submitHashtags,
        isLoading: hashtagsLoading,
    } = useObject({
        api: `/api/posts/${postId}/generate/hashtags`,
        schema: hashtagsOutputSchema,
    });

    const fetchPost = useCallback(async () => {
        try {
            const res = await fetch(`/api/posts/${postId}`);
            if (res.ok) {
                const data = await res.json();
                setPost(data);
                setIdea(data.idea);
                setFinalText(data.finalText ?? "");
                setSelectedProfileId(data.publisherProfileId ?? "");
            } else {
                router.push("/posts");
            }
        } catch {
            router.push("/posts");
        } finally {
            setLoading(false);
        }
    }, [postId, router]);

    useEffect(() => {
        fetchPost();
        fetch("/api/publishers")
            .then((r) => r.json())
            .then(setProfiles)
            .catch(() => {});
    }, [fetchPost]);

    const savePost = async (data: Record<string, unknown>) => {
        setSaving(true);
        try {
            await fetch(`/api/posts/${postId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            await fetchPost();
        } finally {
            setSaving(false);
        }
    };

    const applyDraft = (draft: DraftOutput) => {
        const text = formatDraftToText(draft);
        setFinalText(text);
        savePost({ finalText: text, status: "review" });
    };

    const handleSchedule = async () => {
        if (!scheduleDate) return;
        setScheduling(true);
        try {
            await fetch(`/api/posts/${postId}/schedule`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scheduledAt: scheduleDate,
                    publisherProfileId: selectedProfileId || undefined,
                }),
            });
            await fetchPost();
        } finally {
            setScheduling(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!imagePrompt.trim()) return;
        setGeneratingImage(true);
        try {
            await fetch(`/api/posts/${postId}/assets/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: imagePrompt,
                    stylePreset: imagePreset,
                    aspect: imageAspect,
                    format: imageFormat,
                }),
            });
            await fetchPost();
        } finally {
            setGeneratingImage(false);
        }
    };

    const handleGenerateAlt = async (assetId: string) => {
        setGeneratingAlt(true);
        try {
            await fetch(`/api/posts/${postId}/assets/alt-text`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assetId }),
            });
            await fetchPost();
        } finally {
            setGeneratingAlt(false);
        }
    };

    const deletePost = async () => {
        if (!confirm("Delete this post?")) return;
        await fetch(`/api/posts/${postId}`, { method: "DELETE" });
        router.push("/posts");
    };

    if (loading) {
        return (
            <div className="empty-state">
                <span className="spinner" />
            </div>
        );
    }
    if (!post) return null;

    // Parse drafts
    const parsedDrafts = post.drafts.map((d) => ({
        ...d,
        parsed: JSON.parse(d.contentJson) as DraftOutput,
    }));

    return (
        <>
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button className="btn btn-ghost" onClick={() => router.push("/posts")}>
                        ← Back
                    </button>
                    <span className={`badge badge-${post.status}`}>{post.status}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-danger btn-sm" onClick={deletePost}>
                        Delete
                    </button>
                </div>
            </div>

            <div className="editor-layout">
                {/* ─── Main Column ─── */}
                <div className="editor-main">
                    {/* Idea */}
                    <div className="card">
                        <div className="card-header">
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <h3>💡 Idea</h3>
                                <VoiceRecorder
                                    onTranscript={(text) =>
                                        setIdea((prev) => (prev ? `${prev} ${text}` : text))
                                    }
                                />
                            </div>
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => savePost({ idea })}
                                disabled={saving}
                            >
                                {saving ? <span className="spinner" /> : "Save"}
                            </button>
                        </div>
                        <textarea
                            value={idea}
                            onChange={(e) => setIdea(e.target.value)}
                            placeholder="Your post idea... (or use 🎙️ to speak)"
                            rows={2}
                        />
                    </div>

                    {/* AI Actions */}
                    <div className="card">
                        <div className="card-header">
                            <h3>🤖 AI Generation</h3>
                            {(draftLoading || variantsLoading || hashtagsLoading) && (
                                <span className="streaming-dot" />
                            )}
                        </div>
                        <div className="ai-actions">
                            <button
                                className="btn"
                                onClick={() => submitDraft({})}
                                disabled={draftLoading}
                            >
                                {draftLoading ? (
                                    <>
                                        <span className="spinner" /> Generating...
                                    </>
                                ) : (
                                    "📝 Generate Draft"
                                )}
                            </button>
                            <button
                                className="btn"
                                onClick={() => submitVariants({ count: 3 })}
                                disabled={variantsLoading}
                            >
                                {variantsLoading ? (
                                    <>
                                        <span className="spinner" /> Generating...
                                    </>
                                ) : (
                                    "🔄 Generate Variants"
                                )}
                            </button>
                            <button
                                className="btn"
                                onClick={() => submitHashtags({})}
                                disabled={hashtagsLoading}
                            >
                                {hashtagsLoading ? (
                                    <>
                                        <span className="spinner" /> Generating...
                                    </>
                                ) : (
                                    "#️⃣ Generate Hashtags"
                                )}
                            </button>
                        </div>

                        {/* Live streaming preview */}
                        {draftLoading && draftObject && (
                            <div
                                className="draft-card"
                                style={{ marginTop: 14, borderColor: "var(--accent)" }}
                            >
                                <div className="draft-card-header">
                                    <span>
                                        <span className="streaming-dot" /> Streaming draft...
                                    </span>
                                </div>
                                {draftObject.hook && (
                                    <p style={{ fontWeight: 600, marginBottom: 4 }}>
                                        {draftObject.hook}
                                    </p>
                                )}
                                {draftObject.body && <p>{draftObject.body}</p>}
                                {draftObject.hashtags && draftObject.hashtags.length > 0 && (
                                    <p style={{ color: "var(--accent)", marginTop: 8 }}>
                                        {draftObject.hashtags
                                            .map((h: string | undefined) => (h ? `#${h}` : ""))
                                            .join(" ")}
                                    </p>
                                )}
                            </div>
                        )}

                        {hashtagsLoading && hashtagsObject?.hashtags && (
                            <div style={{ marginTop: 14, color: "var(--accent)", fontSize: 13 }}>
                                {hashtagsObject.hashtags
                                    .map((h: string | undefined) => (h ? `#${h}` : ""))
                                    .join(" ")}
                            </div>
                        )}
                    </div>

                    {/* Drafts & Variants */}
                    {parsedDrafts.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h3>📋 Drafts & Variants</h3>
                            </div>
                            {parsedDrafts.map((d) => (
                                <div key={d.id} className="draft-card">
                                    <div className="draft-card-header">
                                        <span>
                                            {d.kind === "draft" ? "📝 Draft" : "🔄 Variant"}
                                        </span>
                                        <button
                                            className="btn btn-xs btn-primary"
                                            onClick={() => applyDraft(d.parsed)}
                                        >
                                            Use This →
                                        </button>
                                    </div>
                                    <p style={{ fontWeight: 600, marginBottom: 4 }}>
                                        {d.parsed.hook}
                                    </p>
                                    <p>{d.parsed.body?.substring(0, 120)}...</p>
                                    {d.parsed.hashtags && (
                                        <p
                                            style={{
                                                color: "var(--accent)",
                                                marginTop: 6,
                                                fontSize: 12,
                                            }}
                                        >
                                            {d.parsed.hashtags.map((h) => `#${h}`).join(" ")}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Final Text Editor */}
                    <div className="card">
                        <div className="card-header">
                            <h3>✏️ Final Text</h3>
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={() => savePost({ finalText, status: "review" })}
                                disabled={saving}
                            >
                                {saving ? <span className="spinner" /> : "Save & Review"}
                            </button>
                        </div>
                        <textarea
                            value={finalText}
                            onChange={(e) => setFinalText(e.target.value)}
                            placeholder="Your final post text. Edit the draft here or paste your own..."
                            rows={10}
                        />
                    </div>
                </div>

                {/* ─── Sidebar ─── */}
                <div className="editor-sidebar">
                    {/* Image Generation */}
                    <div className="card">
                        <div className="card-header">
                            <h3>🖼️ Image</h3>
                        </div>

                        {post.assets.length > 0 && (
                            <div className="asset-preview">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={post.assets[0].path} alt={post.assets[0].altText} />
                                <div className="asset-meta">
                                    {post.assets[0].altText && (
                                        <p>
                                            <strong>Alt:</strong> {post.assets[0].altText}
                                        </p>
                                    )}
                                    <button
                                        className="btn btn-xs btn-secondary"
                                        style={{ marginTop: 6 }}
                                        onClick={() => handleGenerateAlt(post.assets[0].id)}
                                        disabled={generatingAlt}
                                    >
                                        {generatingAlt ? "Generating..." : "🔄 Regenerate Alt-text"}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label>Image Prompt</label>
                            <input
                                type="text"
                                value={imagePrompt}
                                onChange={(e) => setImagePrompt(e.target.value)}
                                placeholder="Describe the image..."
                            />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div className="form-group">
                                <label>Style Preset</label>
                                <select
                                    value={imagePreset}
                                    onChange={(e) =>
                                        setImagePreset(e.target.value as typeof imagePreset)
                                    }
                                >
                                    {STYLE_PRESETS.map((p) => (
                                        <option key={p} value={p}>
                                            {p}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Aspect Ratio</label>
                                <select
                                    value={imageAspect}
                                    onChange={(e) =>
                                        setImageAspect(e.target.value as typeof imageAspect)
                                    }
                                >
                                    {ASPECT_RATIOS.map((a) => (
                                        <option key={a} value={a}>
                                            {a}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Format</label>
                            <select
                                value={imageFormat}
                                onChange={(e) =>
                                    setImageFormat(e.target.value as typeof imageFormat)
                                }
                            >
                                {IMAGE_FORMATS.map((f) => (
                                    <option key={f} value={f}>
                                        {f}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{ width: "100%" }}
                            onClick={handleGenerateImage}
                            disabled={generatingImage || !imagePrompt.trim()}
                        >
                            {generatingImage ? (
                                <>
                                    <span className="spinner" /> Generating Image...
                                </>
                            ) : (
                                "🎨 Generate Image"
                            )}
                        </button>
                    </div>

                    {/* Scheduling */}
                    <div className="card">
                        <div className="card-header">
                            <h3>📅 Schedule</h3>
                        </div>
                        <div className="form-group">
                            <label>Publish Date & Time</label>
                            <input
                                type="datetime-local"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Publisher Profile</label>
                            <select
                                value={selectedProfileId}
                                onChange={(e) => {
                                    setSelectedProfileId(e.target.value);
                                    savePost({ publisherProfileId: e.target.value || null });
                                }}
                            >
                                <option value="">Default</option>
                                {profiles.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{ width: "100%" }}
                            onClick={handleSchedule}
                            disabled={scheduling || !scheduleDate}
                        >
                            {scheduling ? (
                                <>
                                    <span className="spinner" /> Scheduling...
                                </>
                            ) : (
                                "📅 Schedule Post"
                            )}
                        </button>

                        {/* Active schedules */}
                        {post.schedules.length > 0 && (
                            <div style={{ marginTop: 14 }}>
                                {post.schedules.map((s) => (
                                    <div
                                        key={s.id}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "6px 0",
                                            fontSize: 12,
                                            color: "var(--text-muted)",
                                            borderTop: "1px solid var(--border)",
                                        }}
                                    >
                                        <span>{new Date(s.scheduledAtUtc).toLocaleString()}</span>
                                        <span className={`badge badge-${s.status}`}>
                                            {s.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Publish History */}
                    {post.publishRuns.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h3>📊 Publish History</h3>
                            </div>
                            <table className="history-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Profile</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {post.publishRuns.map((run) => (
                                        <tr key={run.id}>
                                            <td>{new Date(run.createdAt).toLocaleString()}</td>
                                            <td>{run.publisherProfile.name}</td>
                                            <td>
                                                <span
                                                    className={`badge ${run.status === "success" ? "badge-published" : "badge-failed"}`}
                                                >
                                                    {run.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
