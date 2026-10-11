import type { Page } from "@playwright/test";

/** Dismiss the 3D loading screen the way an impatient visitor would, if it is showing. */
export async function skipLoader(page: Page) {
  const skip = page.getByRole("button", { name: /Skip to the site|Continue without waiting/ });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await page.waitForFunction(() => !document.documentElement.dataset.loading);
}
