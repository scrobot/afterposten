-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idea" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" TEXT NOT NULL DEFAULT 'idea',
    "final_text" TEXT,
    "publisher_profile_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "posts_publisher_profile_id_fkey" FOREIGN KEY ("publisher_profile_id") REFERENCES "publisher_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "drafts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "post_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content_json" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "drafts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "post_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "alt_text" TEXT NOT NULL DEFAULT '',
    "meta_json" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assets_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "post_id" TEXT NOT NULL,
    "publisher_profile_id" TEXT,
    "scheduled_at_utc" DATETIME NOT NULL,
    "scheduled_tz" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "locked_until" DATETIME,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    CONSTRAINT "schedules_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "schedules_publisher_profile_id_fkey" FOREIGN KEY ("publisher_profile_id") REFERENCES "publisher_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "publish_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "post_id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "publisher_profile_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "request_meta_json" TEXT NOT NULL DEFAULT '{}',
    "response_meta_json" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "publish_runs_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "publish_runs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "publish_runs_publisher_profile_id_fkey" FOREIGN KEY ("publisher_profile_id") REFERENCES "publisher_profiles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "publisher_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "webhook_url" TEXT NOT NULL,
    "auth_type" TEXT NOT NULL DEFAULT 'none',
    "auth_header_name" TEXT,
    "auth_header_value_enc" TEXT,
    "bearer_token_enc" TEXT,
    "binary_field_name" TEXT NOT NULL DEFAULT 'mediaFile',
    "extra_payload_json" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Belgrade',
    "scheduler_poll_interval_sec" INTEGER NOT NULL DEFAULT 10,
    "default_publisher_profile_id" TEXT,
    "max_publish_attempts" INTEGER NOT NULL DEFAULT 5,
    CONSTRAINT "app_settings_default_publisher_profile_id_fkey" FOREIGN KEY ("default_publisher_profile_id") REFERENCES "publisher_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
