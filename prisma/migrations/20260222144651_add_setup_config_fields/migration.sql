-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_app_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Belgrade',
    "scheduler_poll_interval_sec" INTEGER NOT NULL DEFAULT 10,
    "default_publisher_profile_id" TEXT,
    "max_publish_attempts" INTEGER NOT NULL DEFAULT 5,
    "agent_prompt_instructions" TEXT NOT NULL DEFAULT '',
    "openai_api_key_enc" TEXT,
    "setup_completed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "app_settings_default_publisher_profile_id_fkey" FOREIGN KEY ("default_publisher_profile_id") REFERENCES "publisher_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_app_settings" ("agent_prompt_instructions", "default_publisher_profile_id", "id", "max_publish_attempts", "scheduler_poll_interval_sec", "timezone") SELECT "agent_prompt_instructions", "default_publisher_profile_id", "id", "max_publish_attempts", "scheduler_poll_interval_sec", "timezone" FROM "app_settings";
DROP TABLE "app_settings";
ALTER TABLE "new_app_settings" RENAME TO "app_settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
