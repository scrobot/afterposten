import { test, expect } from "@playwright/test";

test.describe("Post Studio E2E", () => {
    test("create post, view editor, navigate to settings", async ({ page }) => {
        // Navigate to posts list
        await page.goto("/posts");

        // Verify page loaded
        await expect(page.locator("h1")).toHaveText("Posts");

        // Create a new post
        const ideaInput = page.locator('input[placeholder*="post idea"]');
        await ideaInput.fill("Testing AI-powered content creation for LinkedIn");
        await page.locator("button", { hasText: "Create Post" }).click();

        // Should navigate to editor
        await page.waitForURL(/\/posts\/.+/);

        // Verify editor loaded with the idea
        const ideaTextarea = page.locator("textarea").first();
        await expect(ideaTextarea).toHaveValue(
            "Testing AI-powered content creation for LinkedIn"
        );

        // Verify AI action buttons exist
        await expect(
            page.locator("button", { hasText: "Generate Draft" })
        ).toBeVisible();
        await expect(
            page.locator("button", { hasText: "Generate Variants" })
        ).toBeVisible();
        await expect(
            page.locator("button", { hasText: "Generate Hashtags" })
        ).toBeVisible();

        // Verify image generation section exists
        await expect(page.locator('label:has-text("Image Prompt")')).toBeVisible();

        // Verify scheduling section exists
        await expect(
            page.locator('label:has-text("Publish Date & Time")')
        ).toBeVisible();

        // Navigate back to posts
        await page.locator("button", { hasText: "Back" }).click();
        await page.waitForURL("/posts");

        // Verify the post appears in the list
        await expect(
            page.locator("text=Testing AI-powered content creation")
        ).toBeVisible();

        // Navigate to settings
        await page.locator('a:has-text("Settings")').click();
        await page.waitForURL("/settings");
        await expect(page.locator("h1")).toHaveText("Settings");

        // Verify general settings form
        await expect(page.locator('label:has-text("Timezone")')).toBeVisible();
        await expect(
            page.locator('label:has-text("Scheduler Poll Interval")')
        ).toBeVisible();

        // Switch to publishers tab
        await page.locator("button", { hasText: "Publisher Profiles" }).click();

        // Verify empty state or profile list
        await expect(
            page.locator("button", { hasText: "Add Profile" })
        ).toBeVisible();
    });
});
