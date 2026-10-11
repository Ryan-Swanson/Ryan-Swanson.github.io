import { expect, test } from "@playwright/test";

test.describe("3D world on desktop", () => {
  test("loads, follows the stop index, and keeps labels in sync", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/?force3d");
    await expect(page.locator("[data-scene]")).toHaveAttribute("data-scene", "ready", { timeout: 30_000 });
    await expect(page.locator("canvas")).toBeVisible();

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

  test("wall labels link to their case studies", async ({ page }) => {
    await page.goto("/#groovemind");
    await page.locator("#groovemind").getByRole("link", { name: /Read the case study/ }).click();
    await expect(page).toHaveURL(/\/work\/groovemind\/$/);
  });

  test("motion toggle follows reduced-motion and can be switched", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    const toggle = page.getByRole("button", { name: /Motion/ });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
  });

  test("skip link is the first focus stop", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });
});
