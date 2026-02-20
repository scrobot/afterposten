"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PostStatus } from "@/shared/types";

interface PostItem {
    id: string;
    idea: string;
    status: PostStatus;
    finalText: string | null;
    createdAt: string;
    updatedAt: string;
    publisherProfile: { name: string } | null;
    schedules: Array<{
        scheduledAtUtc: string;
        scheduledTz: string;
        status: string;
    }>;
}

const STATUS_OPTIONS: Array<{ label: string; value: string }> = [
    { label: "All", value: "" },
    { label: "Idea", value: "idea" },
    { label: "Draft", value: "draft" },
    { label: "Review", value: "review" },
    { label: "Scheduled", value: "scheduled" },
    { label: "Published", value: "published" },
    { label: "Failed", value: "failed" },
];

export default function PostsPage() {
    const router = useRouter();
    const [posts, setPosts] = useState<PostItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [creating, setCreating] = useState(false);
    const [newIdea, setNewIdea] = useState("");

    const fetchPosts = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.set("status", statusFilter);
            if (search) params.set("q", search);
            const res = await fetch(`/api/posts?${params}`);
            if (res.ok) setPosts(await res.json());
        } catch (e) {
            console.error("Failed to fetch posts:", e);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, search]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handleCreate = async () => {
        if (!newIdea.trim()) return;
        setCreating(true);
        try {
            const res = await fetch("/api/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idea: newIdea.trim() }),
            });
            if (res.ok) {
                const post = await res.json();
                router.push(`/posts/${post.id}`);
            }
        } catch (e) {
            console.error("Failed to create post:", e);
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            <div className="page-header">
                <h1>Posts</h1>
            </div>

            {/* Create new post */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", gap: 12 }}>
                    <input
                        type="text"
                        placeholder="What's your post idea? Start typing..."
                        value={newIdea}
                        onChange={(e) => setNewIdea(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                        style={{ flex: 1 }}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleCreate}
                        disabled={creating || !newIdea.trim()}
                    >
                        {creating ? <span className="spinner" /> : "✨ Create Post"}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <input
                    type="text"
                    placeholder="Search posts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ minWidth: 240 }}
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Posts List */}
            {loading ? (
                <div className="empty-state">
                    <span className="spinner" />
                </div>
            ) : posts.length === 0 ? (
                <div className="empty-state">
                    <h3>No posts yet</h3>
                    <p>Enter an idea above to create your first post.</p>
                </div>
            ) : (
                <div className="posts-grid">
                    {posts.map((post) => (
                        <div
                            key={post.id}
                            className="card post-card"
                            onClick={() => router.push(`/posts/${post.id}`)}
                        >
                            <div className="post-card-content">
                                <h4>{post.idea}</h4>
                                <p>
                                    {post.finalText
                                        ? post.finalText.substring(0, 80) + "..."
                                        : `Created ${new Date(post.createdAt).toLocaleDateString()}`}
                                </p>
                            </div>
                            <div className="post-card-meta">
                                {post.schedules[0] && (
                                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                        📅{" "}
                                        {new Date(
                                            post.schedules[0].scheduledAtUtc
                                        ).toLocaleString()}
                                    </span>
                                )}
                                <span className={`badge badge-${post.status}`}>
                                    {post.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
