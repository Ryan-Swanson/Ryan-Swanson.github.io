import Link from "next/link";
import { toWallProject } from "@/components/world/project";
import { Experience } from "@/components/world/Experience";
import { ProjectRow } from "@/components/site/ProjectRow";
import { profile } from "@/content/profile";
import { projects } from "@/content/projects";

export default function Home() {
  const intro = (
    <>
      <h1 id="intro-title" className="font-display text-[2.5rem] leading-[1.04] tracking-[-0.01em] sm:text-[3.4rem] xl:text-[3.9rem]">
        I&rsquo;m Ryan Swanson. I build software <em className="text-brass">end to end.</em>
      </h1>
      <p className="mt-5 max-w-[32rem] text-lg leading-relaxed text-ink-2">{profile.headline}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href="#work" className="inline-flex min-h-11 items-center bg-placard px-5 font-medium text-placard-ink no-underline hover:bg-brass">
          Jump to the list
        </a>
        <Link prefetch={false} href="/about/" className="inline-flex min-h-11 items-center border border-rule px-5 no-underline hover:border-brass hover:text-brass">
          About me
        </Link>
      </div>
      <p className="label mt-10 flex items-center gap-3 text-ink-2">
        <span aria-hidden="true" className="inline-block h-8 w-px bg-brass" />
        Scroll to fly through six projects, or jump to the list.
      </p>
    </>
  );

  return (
    <>
      <Experience projects={projects.map(toWallProject)} intro={intro} />

      <section id="work" aria-labelledby="work-title" className="mx-auto max-w-[90rem] px-4 pt-20 sm:px-8 lg:pt-28">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
          <h2 id="work-title" className="font-display text-4xl sm:text-5xl">
            Selected work
          </h2>
          <p className="max-w-[30rem] text-ink-2">
            Six products I designed and built myself. Each case study shows real screens and says plainly what is finished and what is not.
          </p>
        </div>
        {projects.map((p) => (
          <ProjectRow key={p.slug} project={p} />
        ))}
      </section>

      <section aria-labelledby="about-title" className="mx-auto max-w-[90rem] px-4 pt-20 sm:px-8">
        <div className="grid gap-8 border-t border-rule pt-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <h2 id="about-title" className="font-display text-4xl sm:text-5xl">
            About
          </h2>
          <div>
            <p className="mb-4 max-w-[40rem] text-lg">{profile.intro}</p>
            <Link prefetch={false} href="/about/" className="label inline-flex min-h-11 items-center gap-2 hover:text-brass">
              Experience and education <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
