import type { Metadata } from "next";
import Link from "next/link";
import { profile } from "@/content/profile";
import { getProject } from "@/content/projects";

export const metadata: Metadata = {
  title: "About",
  description: "Experience, education, and the capabilities shown by Ryan Swanson's projects.",
  alternates: { canonical: "/about/" },
};

export default function About() {
  return (
    <div className="mx-auto max-w-[90rem] px-4 sm:px-8">
      <header className="grid gap-8 pt-12 pb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <h1 className="font-display text-5xl leading-none sm:text-7xl">About</h1>
        <div>
          <p className="max-w-[40rem] text-xl leading-relaxed">{profile.intro}</p>
          <p className="label mt-6 text-ink-2">{profile.location}</p>
        </div>
      </header>

      <section id="capabilities" aria-labelledby="cap-title" className="border-t border-rule py-12">
        <h2 id="cap-title" className="font-display text-3xl sm:text-4xl">
          What the projects show
        </h2>
        <div className="mt-8 grid gap-x-10 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          {profile.capabilities.map((c) => (
            <div key={c.title}>
              <h3 className="font-display text-xl text-brass">{c.title}</h3>
              <p className="mt-2 text-ink-2">{c.detail}</p>
              <p className="label mt-3">
                {c.projects.map((slug, i) => {
                  const p = getProject(slug);
                  if (!p) return null;
                  return (
                    <span key={slug}>
                      {i > 0 && ", "}
                      <Link prefetch={false} href={`/work/${slug}/`} className="hover:text-brass">
                        {p.title}
                      </Link>
                    </span>
                  );
                })}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="experience" aria-labelledby="exp-title" className="border-t border-rule py-12">
        <h2 id="exp-title" className="font-display text-3xl sm:text-4xl">
          Experience
        </h2>
        <ol className="mt-8 grid gap-0">
          {profile.experience.map((e) => (
            <li key={e.org + e.dates} className="grid gap-2 border-t border-rule/60 py-6 first:border-t-0 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
              <p className="label pt-1.5 text-ink-2">{e.dates}</p>
              <div>
                <h3 className="text-lg">
                  <span className="font-medium">{e.title}</span>
                  <span className="text-ink-2">, {e.org}</span>
                </h3>
                <ul className="prose-case mt-2 max-w-[44rem] text-ink-2">
                  {e.lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="education" aria-labelledby="edu-title" className="border-t border-rule py-12">
        <h2 id="edu-title" className="font-display text-3xl sm:text-4xl">
          Education
        </h2>
        <ul className="mt-8 grid gap-6">
          {profile.education.map((ed) => (
            <li key={ed.school} className="grid gap-2 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
              <p className="label pt-1.5 text-ink-2">{ed.year}</p>
              <p className="text-lg">
                <span className="font-medium">{ed.credential}</span>
                <span className="text-ink-2">, {ed.school}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
