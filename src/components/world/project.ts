import type { Project } from "@/content/types";

/** Only the fields the gallery and its wall labels use, to keep the page payload small. */
export type WallProject = Pick<Project, "slug" | "title" | "kind" | "years" | "medium" | "status" | "summary" | "hero" | "links">;

export function toWallProject(p: Project): WallProject {
  const { slug, title, kind, years, medium, status, summary, hero, links } = p;
  return { slug, title, kind, years, medium, status, summary, hero, links };
}
