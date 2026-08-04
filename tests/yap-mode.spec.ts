import { expect, test } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4175";

test.use({ reducedMotion: "reduce" });

test("Yap Mode page renders and the product preview completes a dictation turn", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${BASE_URL}/yap-mode`);
  await expect(page.getByRole("heading", { name: "Yap Mode", exact: true })).toBeVisible();
  await expect(page.locator(".vite-error-overlay")).toHaveCount(0);
  await page.waitForTimeout(1900);

  const preview = page.locator(".yap-hero-preview .yap-preview");
  await preview.getByTitle("Start Yap Mode").click();
  await expect(preview).toHaveClass(/is-listening/);
  await expect(preview.locator(".yap-editor-copy")).not.toContainText("Your words land here.");
  await page.waitForTimeout(700);
  await preview.getByRole("button", { name: "Say done" }).click();
  await expect(preview).not.toHaveClass(/is-listening/);
  await expect(preview.locator(".yap-editor-copy")).not.toContainText(/\bdone\b/i);
  await page.waitForTimeout(300);

  await page.screenshot({ path: "test-results/yap-mode-desktop.png" });
  await page.getByRole("link", { name: "Try it" }).click();
  await expect(page.getByRole("heading", { name: "Watch one thought become text." })).toBeVisible();
  await page.getByRole("button", { name: "Read" }).click();
  await page.locator(".yap-founder-note").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "I love Wispr Flow. That is the honest starting point." })).toBeVisible();
  await page.locator(".yap-black-band").scrollIntoViewIfNeeded();
  await expect(page.locator(".yap-black-band")).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/yap-mode-done-section.png" });
});

test("Yap Mode page fits and remains usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/yap-mode`);
  await expect(page.getByRole("heading", { name: "Yap Mode", exact: true })).toBeVisible();
  await page.waitForTimeout(1900);

  const preview = page.locator(".yap-hero-preview .yap-preview");
  const fits = await page.locator(".yap").evaluate((element) => element.scrollWidth <= element.clientWidth);
  expect(fits).toBe(true);

  await preview.getByTitle("Start Yap Mode").click();
  await expect(preview).toHaveClass(/is-listening/);
  await page.screenshot({ path: "test-results/yap-mode-mobile.png" });
  await page.locator("#why").scrollIntoViewIfNeeded();
  await expect(page.locator("#why")).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/yap-mode-mobile-content.png" });
});

test("Yap Mode founder story and Braino release note are published in the Journal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/journal/yap-mode`);
  await expect(page.getByRole("heading", { name: /I loved Wispr Flow, so I taught Braino to yap/ })).toBeVisible();
  await expect(page.getByText("Use Wispr Flow or use Braino Yap.", { exact: false })).toBeVisible();
  await page.waitForTimeout(1900);
  await page.evaluate(() => window.scrollTo(0, 0));
  const founderFits = await page.locator(".jr").evaluate((element) => element.scrollWidth <= element.clientWidth);
  expect(founderFits).toBe(true);
  await page.screenshot({ path: "test-results/yap-mode-founder-article-mobile.png", fullPage: true });

  await page.goto(`${BASE_URL}/journal/yap-mode-update`);
  await expect(page.getByRole("heading", { name: /Yap Mode: I listen, and your words land where you are/ })).toBeVisible();
  await expect(page.getByText("Every mode leaves a record now")).toBeVisible();
  await page.waitForTimeout(1900);
  const updateFits = await page.locator(".jr").evaluate((element) => element.scrollWidth <= element.clientWidth);
  expect(updateFits).toBe(true);

  await page.goto(`${BASE_URL}/journal`);
  await expect(page.getByRole("link", { name: /I loved Wispr Flow, so I taught Braino to yap/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Yap Mode: I listen, and your words land where you are/ })).toBeVisible();
});
