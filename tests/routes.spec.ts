import { expect, test } from "@playwright/test";
import { skipLoader } from "./helpers";

const projects = ["fr3t-app", "inputshare", "learncenter-dev", "talkmac", "protuner", "groovemind"];
const routes = ["/", "/work/", "/about/", ...projects.map((p) => `/work/${p}/`)];

test.describe("static routes", () => {
  for (const route of routes) {
    test(`loads ${route} directly with one h1 and no errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await page.reload();
      await expect(page.locator("h1")).toHaveCount(1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, "horizontal overflow").toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
    });
  }

  test("case study without trailing slash redirects", async ({ page }) => {
    await page.goto("/work/protuner");
    await expect(page).toHaveURL(/\/work\/protuner\/$/);
    await expect(page.locator("h1")).toHaveText("ProTuner");
  });

  for (const [from, to] of [
    ["/about.html", /\/about\/$/],
    ["/projects.html", /\/work\/$/],
    ["/skills.html", /\/about\/#capabilities$/],
    ["/contact.html", /\/#contact$/],
    ["/blog.html", /127\.0\.0\.1:\d+\/$/],
  ] as const) {
    test(`old link ${from} lands on the new page`, async ({ page }) => {
      await page.goto(from);
      await expect(page).toHaveURL(to);
    });
  }

  test("unknown paths return the 404 page", async ({ page }) => {
    const res = await page.goto("/no-such-page/");
    expect(res?.status()).toBe(404);
    await expect(page.locator("h1")).toContainText("isn’t on the wall");
    await page.getByRole("link", { name: "All work" }).first().click();
    await expect(page).toHaveURL(/\/work\/$/);
  });

  test("back and forward move between pages", async ({ page }) => {
    await page.goto("/");
    await skipLoader(page);
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Work" }).click();
    await expect(page).toHaveURL(/\/work\/$/);
    await page.getByRole("link", { name: "GrooveMind" }).first().click();
    await expect(page).toHaveURL(/\/work\/groovemind\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/work\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/work\/$/);
  });

  test("every local image and link resolves", async ({ page, request }) => {
    const seen = new Set<string>();
    for (const route of routes) {
      await page.goto(route);
      const urls = await page.evaluate(() => [
        ...Array.from(document.querySelectorAll("img")).flatMap((i) => [i.src, ...(i.srcset ? i.srcset.split(",").map((s) => s.trim().split(" ")[0]!) : [])]),
        ...Array.from(document.querySelectorAll("a[href]")).map((a) => (a as HTMLAnchorElement).href),
      ]);
      for (const u of urls) {
        const url = new URL(u, page.url());
        if (url.origin !== new URL(page.url()).origin || seen.has(url.pathname)) continue;
        seen.add(url.pathname);
        const res = await request.get(url.pathname);
        expect(res.status(), url.pathname).toBe(200);
      }
    }
  });

  test("live products link out from their cards", async ({ page }) => {
    await page.goto("/");
    for (const [slug, href] of [
      ["fr3t-app", "https://fr3t.app/"],
      ["learncenter-dev", "https://learncenter.dev/"],
      ["protuner", "https://apps.apple.com/us/app/protuner-tuner-metronome/id6761435770"],
    ]) {
      // The title and the button both lead to the live product.
      await expect(page.locator(`#${slug} a[href="${href}"]`)).toHaveCount(2);
      await expect(page.locator(`#${slug} h2 a[href="${href}"]`)).toHaveCount(1);
    }
    await expect(page.locator(`#work a[href="https://fr3t.app/"]`)).toHaveCount(1);
    // Cards without a live product link their title to the case study.
    await expect(page.locator(`#talkmac h2 a[href="/work/talkmac/"]`)).toHaveCount(1);
  });

  test("the 3D loading screen never blocks the page", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/");
    await skipLoader(page);
    await expect(page.getByRole("status").filter({ hasText: "Building the gallery" })).toBeHidden({ timeout: 20_000 });
    await page.getByRole("link", { name: "See the work" }).click();
    await expect(page).toHaveURL(/#work$/);
  });

  test("contact links are GitHub and LinkedIn only", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: /GitHub/ })).toHaveAttribute("href", "https://github.com/Ryan-Swanson");
    await expect(footer.getByRole("link", { name: /LinkedIn/ })).toHaveAttribute("href", "https://www.linkedin.com/in/ryanswanson1995/");
    expect(await page.locator('a[href^="mailto:"], a[href^="tel:"]').count()).toBe(0);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("home still lists every project with working links", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Ryan Swanson");
    for (const slug of projects) {
      await expect(page.locator(`#work a[href="/work/${slug}/"]`)).toHaveCount(1);
    }
    await expect(page.locator("[data-scene] img").first()).toBeVisible();
  });
});
