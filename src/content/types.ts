export type ProjectSlug =
  | "fr3t-app"
  | "inputshare"
  | "learncenter-dev"
  | "talkmac"
  | "protuner"
  | "groovemind";

/** How a screenshot was produced. Shown to visitors as a provenance caption. */
export type MediaSource =
  | "live-site" // captured from the public production site
  | "native-app" // window capture of an installed build on macOS
  | "simulator" // iOS / watchOS simulator, current source build
  | "local-fixture" // local build loaded with authored sample data
  | "existing"; // earlier real capture reused from the product's own materials

export interface MediaItem {
  /** Path under /public, without size suffix. Example: "/media/fr3t-app/workspace". */
  src: string;
  /** Available widths. Files are named `${src}-${width}.webp`. */
  widths: number[];
  /** Intrinsic pixel size of the largest file, for layout and aspect ratio. */
  width: number;
  height: number;
  alt: string;
  caption?: string;
  source: MediaSource;
  /** Month the screen was captured, ISO "YYYY-MM". */
  captured: string;
  device: "desktop" | "phone" | "watch" | "window";
  /** Landscape-safe copy at most 2048 px wide for the 3D scene. */
  texture?: { src: string; width: number; height: number };
}

export interface ProjectLink {
  label: string;
  href: string;
  kind: "live" | "app-store" | "support" | "company";
}

export interface Decision {
  title: string;
  body: string;
}

export interface Project {
  slug: ProjectSlug;
  title: string;
  /** Short exhibition-style label, e.g. "Web app" or "macOS app". */
  kind: string;
  /** One line for lists and the gallery label. */
  summary: string;
  /** Technologies shown as the "medium" on the wall label. Keep to 3 to 5. */
  medium: string[];
  platforms: string[];
  status: {
    label: string;
    /** Plain statement of what "status" means here, e.g. "Not a public download yet." */
    detail: string;
    tone: "live" | "limited" | "development";
  };
  role: string;
  /** Years active, e.g. "2025 to 2026". */
  years: string;
  /** Media used as the gallery screen. Must be a real capture. */
  hero: MediaItem;
  links: ProjectLink[];
  sourceNote: string;
  caseStudy: {
    problem: string;
    audience: string;
    built: string[];
    architecture: string[];
    decisions: Decision[];
    hardProblem: { title: string; body: string };
    validation: string[];
    result: string;
    /** Forward-looking next steps shown under "What's next". */
    next: string[];
    gallery: MediaItem[];
  };
}
