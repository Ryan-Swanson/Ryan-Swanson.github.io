import { expect, test } from "@playwright/test";

test("without WebGL the same scroll story runs on still screens", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?force3d");
  const stage = page.locator("[data-scene]");
  await expect(stage).toHaveAttribute("data-scene", "failed", { timeout: 10_000 });
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Free roam" })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Flight stops" }).getByRole("link", { name: /GrooveMind/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "GrooveMind" })).toBeInViewport();
  await expect(stage.locator('img[src*="groovemind"]')).toBeVisible();
  expect(errors).toEqual([]);
});
