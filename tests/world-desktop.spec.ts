import { expect, test } from "@playwright/test";
import { skipLoader } from "./helpers";

test.describe("3D world on desktop", () => {
  test("loads, follows the stop index, and keeps labels in sync", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/?force3d");
    await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "ready", { timeout: 30_000 });
    await expect(page.locator("canvas")).toBeVisible();
    // The loading screen has faded out on its own and the page can scroll again.
    await expect(page.getByRole("status").filter({ hasText: "Building the gallery" })).toBeHidden();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.loading)).toBeUndefined();

    await page.getByRole("navigation", { name: "Flight stops" }).getByRole("link", { name: /ProTuner/ }).click();
    await expect(page).toHaveURL(/#protuner$/);
    await expect(page.getByRole("heading", { level: 2, name: "ProTuner" })).toBeInViewport();
    await expect(page.locator(".sr-only[aria-live]")).toContainText("ProTuner");
    expect(errors).toEqual([]);
  });

  test("free roam takes over the screen and Escape returns to the nearest stop", async ({ page }) => {
    await page.goto("/?force3d#inputshare");
    await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "ready", { timeout: 30_000 });
    const before = await page.evaluate(() => window.scrollY);
    await page.getByRole("button", { name: "Free roam" }).click();
    await expect(page.getByRole("button", { name: "Exit free roam" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(400);
    await page.keyboard.up("KeyW");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Exit free roam" })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("");
    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - before)).toBeLessThan(5);
  });

  test("free roam ends from the Exit button after dragging to look", async ({ page }) => {
    await page.goto("/?force3d#inputshare");
    await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "ready", { timeout: 30_000 });
    await page.getByRole("button", { name: "Free roam" }).click();
    const exit = page.getByRole("button", { name: "Exit free roam" });
    await expect(exit).toBeVisible();
    await page.mouse.move(640, 500);
    await page.mouse.down();
    await page.mouse.move(700, 460, { steps: 5 });
    await page.mouse.up();
    await exit.click();
    await expect(exit).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.style.overflow)).toBe("");
  });

  test("wall labels link to their case studies", async ({ page }) => {
    await page.goto("/#groovemind");
    await skipLoader(page);
    await page.locator("#groovemind").getByRole("link", { name: /Read the case study/ }).click();
    await expect(page).toHaveURL(/\/work\/groovemind\/$/);
  });

  test("motion toggle follows reduced-motion and can be switched", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await skipLoader(page);
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    const toggle = page.getByRole("button", { name: /Motion/ });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
    await page.reload();
    await skipLoader(page);
    await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
  });

  test("skip link is the first focus stop", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });
});
