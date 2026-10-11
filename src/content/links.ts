import type { Project } from "./types";

/** The public place to try the product, if there is one: the live site, App Store listing, or company site. */
export function primaryLink(p: Pick<Project, "links">) {
  return p.links.find((l) => l.kind === "live" || l.kind === "app-store" || l.kind === "company");
}
