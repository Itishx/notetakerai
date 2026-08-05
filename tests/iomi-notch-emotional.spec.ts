import { expect, test } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:5173";

async function wakeAndOpenNotch(page: import("@playwright/test").Page) {
  const bar = page.locator(".iomi-notch-bar");
  await bar.click();
  await expect(page.locator(".iomi-notch-realeyes.sleeping")).toHaveCount(0);
  await bar.click();
  await expect(page.locator(".iomi-notch")).toHaveClass(/open/);
  await page.waitForTimeout(650);
}

test.use({ reducedMotion: "reduce" });

test("BrainoOS morph keeps the island fixed and Emotional thinking log runs", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${BASE_URL}/emotional-intelligence`);
  await expect(page.locator("body")).toContainText("The Emotional Intelligence Layer");
  await expect(page.locator(".vite-error-overlay")).toHaveCount(0);

  await wakeAndOpenNotch(page);
  const island = page.locator(".iomi-notch");
  const before = await island.boundingBox();
  expect(before).not.toBeNull();

  await page.getByRole("button", { name: "Open BrainoOS pages" }).click();
  await expect(page.locator(".iomi-notch-parent h2")).toHaveText("BrainoOS");
  await expect(page.locator(".iomi-notch-parent p")).toHaveText("the operating system");
  await expect(page.getByRole("navigation", { name: "BrainoOS pages" })).toContainText("Human Intelligence");
  await expect(page.getByRole("navigation", { name: "BrainoOS pages" })).toContainText("Emotional Intelligence");
  await expect(page.locator(".iomi-notch-root")).toHaveCount(0);

  const after = await island.boundingBox();
  expect(after).not.toBeNull();
  expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(1);
  expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(1);
  expect(Math.abs((after?.width ?? 0) - (before?.width ?? 0))).toBeLessThan(1);
  expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(1);
  await page.screenshot({ path: "test-results/iomi-notch-parent-desktop.png" });

  await page.getByRole("button", { name: "Back to all pages" }).click();
  await expect(page.getByText("Go anywhere")).toBeVisible();
  await page.locator(".iomi-notch-bar").click();

  await page.getByRole("link", { name: "Try it" }).click();
  const message = page.getByPlaceholder("Say something to Braino");
  await message.fill("I'm so stressed and everything is too much right now.");
  await page.getByRole("button", { name: "Run the heart" }).click();
  await expect(page.getByText("Thinking log", { exact: true })).toBeVisible();
  await expect(page.getByText("Live trait order")).toBeVisible({ timeout: 4000 });
  await expect(page.getByText("Anxious", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Detected moment")).toBeVisible({ timeout: 4000 });
  await page.screenshot({ path: "test-results/emotional-thinking-log-desktop.png", fullPage: true });
});

test("BrainoOS parent composition fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/emotional-intelligence`);
  await wakeAndOpenNotch(page);
  await page.getByRole("button", { name: "Open BrainoOS pages" }).click();
  await expect(page.locator(".iomi-notch-parent h2")).toHaveText("BrainoOS");
  await expect(page.locator(".iomi-notch-root")).toHaveCount(0);

  const fits = await page.locator(".iomi-notch").evaluate((element) => (
    element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight
  ));
  expect(fits).toBe(true);
  await page.screenshot({ path: "test-results/iomi-notch-parent-mobile.png" });
});
