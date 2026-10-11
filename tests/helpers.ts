import type { Page } from "@playwright/test";

/**
 * Dismiss the 3D loading screen the way an impatient visitor would, if it is still active.
 * Where 3D is unavailable (for example on CI runners) the loader dismisses itself.
 */
export async function skipLoader(page: Page) {
  const active = () => page.evaluate(() => document.documentElement.dataset.loading === "1");
  if (await active()) {
    await page
      .getByRole("button", { name: /Skip to the site|Continue without waiting/ })
      .click({ timeout: 5000 })
      .catch(() => undefined); // it may finish loading at the same moment
  }
  await page.waitForFunction(() => !document.documentElement.dataset.loading, null, { timeout: 20_000 });
}
