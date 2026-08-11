import { expect, test } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4175";

test.use({ reducedMotion: "reduce" });

test("BrainoHERA page renders and the product preview completes a dictation turn", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${BASE_URL}/yap-mode`);
  await expect(page.getByRole("heading", { name: "BrainoHERA", exact: true })).toBeVisible();
  await expect(page.locator(".vite-error-overlay")).toHaveCount(0);
  await page.waitForTimeout(1900);
  await page.screenshot({ path: "test-results/yap-mode-desktop.png" });

  // The preview lives in the Lab tab now; the landing is type only.
  await expect(page.locator(".yap-landing .yap-preview")).toHaveCount(0);
  await page.getByRole("link", { name: "Try it" }).click();
  await expect(page.getByRole("heading", { name: "Watch one thought become text." })).toBeVisible();

  const preview = page.locator(".yap-lab .yap-preview");
  await preview.getByTitle("Start BrainoHERA").click();
  await expect(preview).toHaveClass(/is-listening/);
  await expect(preview.locator(".yap-editor-copy")).not.toContainText("Your words land here.");
  await page.waitForTimeout(700);
  await preview.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(preview).not.toHaveClass(/is-listening/);
  await expect(preview.locator(".yap-editor-copy")).not.toContainText(/\bdone\b/i);
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: "Read" }).click();
  await page.locator(".yap-founder-note").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "I love Wispr Flow. That is the honest starting point." })).toBeVisible();
  await page.locator("#done").scrollIntoViewIfNeeded();
  await expect(page.locator("#done")).toBeVisible();

  // Nothing on this page is allowed to be a black slab any more.
  await expect(page.locator(".yap-black-band")).toHaveCount(0);
  const darkPanels = await page.locator(".yap-founder-note, #done, #local").evaluateAll(
    (nodes) => nodes.map((node) => getComputedStyle(node).backgroundColor),
  );
  for (const background of darkPanels) {
    expect(background === "rgba(0, 0, 0, 0)" || background === "transparent").toBe(true);
  }

  // The shared site footer has to be on this page like the rest of the site.
  await page.locator(".home-footer").scrollIntoViewIfNeeded();
  await expect(page.locator(".home-footer")).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/yap-mode-done-section.png" });
});

test("BrainoHERA page sells the on-device engine", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${BASE_URL}/yap-mode`);
  await expect(page.getByRole("heading", { name: "BrainoHERA", exact: true })).toBeVisible();

  // The hero has to state the promise before anyone scrolls.
  await expect(page.locator(".yap-hero-specs")).toContainText("On-device");
  await expect(page.locator(".yap-hero-specs")).toContainText("No connection");

  await page.locator("#local").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "The model lives on your Mac." })).toBeVisible();

  // Both journeys must render, and the on-device one must stay the short trip.
  await page.waitForTimeout(3000);
  const cloudTrip = await page
    .locator(".yap-lane.cloud .yap-lane-fill")
    .evaluate((element) => element.getBoundingClientRect().width);
  const localTrip = await page
    .locator(".yap-lane.local .yap-lane-fill")
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(localTrip).toBeGreaterThan(0);
  expect(localTrip).toBeLessThan(cloudTrip / 2);
  await expect(page.locator(".yap-lane.cloud .yap-lane-stop")).toHaveCount(5);
  await expect(page.locator(".yap-lane.local .yap-lane-stop")).toHaveCount(2);

  // The Hinglish caveat is deliberate honesty, not a detail to quietly drop.
  await expect(page.locator(".yap-local-foot")).toContainText("Hinglish");

  await page.locator(".yap-claims").scrollIntoViewIfNeeded();
  await expect(page.locator(".yap-claim")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Works at 30,000 feet" })).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/yap-mode-on-device.png" });
});

test("BrainoHERA page fits and remains usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/yap-mode`);
  await expect(page.getByRole("heading", { name: "BrainoHERA", exact: true })).toBeVisible();
  await page.waitForTimeout(1900);

  const fits = await page.locator(".yap").evaluate((element) => element.scrollWidth <= element.clientWidth);
  expect(fits).toBe(true);
  await page.screenshot({ path: "test-results/yap-mode-mobile.png" });

  // The travelling-dot lanes are the most overflow-prone thing on the page.
  await page.locator("#local").scrollIntoViewIfNeeded();
  const lanesFit = await page
    .locator(".yap-lanes")
    .evaluate((element) => element.scrollWidth <= element.clientWidth);
  expect(lanesFit).toBe(true);
  await page.locator("#why").scrollIntoViewIfNeeded();
  await expect(page.locator("#why")).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/yap-mode-mobile-content.png" });
});

test("BrainoHERA founder story and Braino release note are published in the Journal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/journal/yap-mode`);
  await expect(page.getByRole("heading", { name: /I loved Wispr Flow, so I built BrainoHERA/ })).toBeVisible();
  await expect(page.getByText("Use Wispr Flow or use BrainoHERA.", { exact: false })).toBeVisible();
  await page.waitForTimeout(1900);
  await page.evaluate(() => window.scrollTo(0, 0));
  const founderFits = await page.locator(".jr").evaluate((element) => element.scrollWidth <= element.clientWidth);
  expect(founderFits).toBe(true);
  await page.screenshot({ path: "test-results/yap-mode-founder-article-mobile.png", fullPage: true });

  await page.goto(`${BASE_URL}/journal/yap-mode-update`);
  await expect(page.getByRole("heading", { name: /BrainoHERA: I listen, and your words land where you are/ })).toBeVisible();
  await expect(page.getByText("Every mode leaves a record now")).toBeVisible();
  await page.waitForTimeout(1900);
  const updateFits = await page.locator(".jr").evaluate((element) => element.scrollWidth <= element.clientWidth);
  expect(updateFits).toBe(true);

  await page.goto(`${BASE_URL}/journal`);
  await expect(page.getByRole("link", { name: /I loved Wispr Flow, so I built BrainoHERA/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /BrainoHERA: I listen, and your words land where you are/ })).toBeVisible();
});
