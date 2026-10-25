import type { Metadata } from "next";
import { ProjectRow } from "@/components/site/ProjectRow";
import { profile } from "@/content/profile";
import { projects } from "@/content/projects";

export const metadata: Metadata = {
  title: "Work",
  description: "Case studies for six products I designed and built, with real screens and architecture notes.",
  alternates: { canonical: "/work/" },
  openGraph: {
    title: "Work | Ryan Swanson",
    description: "Case studies for six products I designed and built, with real screens and architecture notes.",
    url: "/work/",
  },
};

export default function WorkIndex() {
  return (
    <div className="mx-auto max-w-[90rem] px-4 sm:px-8">
      <header className="max-w-[48rem] pt-12 pb-8">
        <h1 className="font-display text-5xl leading-none sm:text-7xl">Work</h1>
        <p className="mt-5 text-lg text-ink-2">
          Six products I designed and built myself: two live on the web, one on the App Store, one available by arrangement,
          and two in active development.
        </p>
      </header>
      {projects.map((p) => (
        <ProjectRow key={p.slug} project={p} headingLevel="h2" />
      ))}
      {profile.alsoBuilt.length > 0 && (
        <section aria-labelledby="also" className="border-t border-rule py-10">
          <h2 id="also" className="font-display text-2xl">
            Also in progress
          </h2>
          <ul className="mt-4 grid gap-2 text-ink-2">
            {profile.alsoBuilt.map((a) => (
              <li key={a.name}>
                <span className="text-ink">{a.name}.</span> {a.line}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
