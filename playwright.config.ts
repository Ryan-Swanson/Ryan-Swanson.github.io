import { defineConfig, devices } from "@playwright/test";

// Tests run against the built static export (`npm run build`) served like GitHub Pages.
const port = 4321;
// Use the Mac GPU locally; CI runners fall back to software WebGL, which "?force3d" permits.
const gpuArgs = process.platform === "darwin" ? ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"] : ["--ignore-gpu-blocklist"];

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${port}`, colorScheme: "dark" },
  webServer: {
    command: `node scripts/serve-static.mjs out ${port}`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: { args: gpuArgs },
      },
      // The 3D tour needs a GPU: on CI runners WebGL is software-rendered and the scene takes
      // too long to start, so those tests run locally only (npm run test:e2e on a Mac).
      testIgnore: process.env.CI ? /(world-phone|world-desktop|fallback)/ : /(world-phone|fallback)/,
    },
    {
      name: "phone",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
      testIgnore: /(world-desktop|fallback)/,
    },
    {
      name: "no-webgl",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: { args: ["--disable-webgl", "--disable-webgl2", "--disable-3d-apis"] },
      },
      testMatch: /fallback/,
    },
  ],
});
