import { expect, test } from "@playwright/test";

test("phone: the stop line names the current project and links to the list", async ({ page }) => {
  // The 3D layer is covered elsewhere; this checks the HTML stop line and link.
  await page.goto("/?no3d#learncenter-dev");
  await expect(page.getByRole("heading", { level: 2, name: "learncenter.dev" })).toBeInViewport();
  await expect(page.getByText(/3 of 6: learncenter\.dev/)).toBeVisible();
  await page.getByRole("link", { name: "List view" }).click();
  await expect(page).toHaveURL(/#work$/);
});
