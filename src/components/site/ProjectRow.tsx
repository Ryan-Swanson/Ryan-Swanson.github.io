import Link from "next/link";
import { primaryLink } from "@/content/links";
import type { Project } from "@/content/types";
import { Shot } from "./Shot";
import { StatusMark } from "./StatusMark";

/** One project in a list: screen on one side, label text on the other. */
export function ProjectRow({ project, headingLevel = "h3" }: { project: Project; headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  const narrow = project.hero.device === "phone" || project.hero.device === "watch";
  const live = primaryLink(project);
  return (
    <article className="group relative grid gap-6 border-t border-rule py-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-12 lg:py-14">
      {/* self-start: the frame hugs the screenshot instead of stretching to the text column's height. */}
      <div className={`self-start overflow-hidden border border-rule bg-wall-2 ${narrow ? "flex justify-center bg-[radial-gradient(ellipse_at_center,rgba(255,214,150,0.08),transparent_70%)] py-6" : ""}`}>
        <div className={narrow ? "w-[46%] max-w-[15rem]" : "w-full"}>
          <Shot media={project.hero} figure={false} sizes={narrow ? "(min-width: 768px) 15rem, 46vw" : "(min-width: 1024px) 55vw, 100vw"} />
        </div>
      </div>
      <div className="flex flex-col">
        <p className="label text-ink-2">
          {project.kind}, <span className="whitespace-nowrap">{project.years}</span>
        </p>
        <H className="mt-2 font-display text-4xl leading-none sm:text-5xl">
          <Link prefetch={false} href={`/work/${project.slug}/`} className="no-underline after:absolute after:inset-0 hover:text-brass">
            {project.title}
          </Link>
        </H>
        <p className="mt-4 max-w-[34rem] text-lg text-ink">{project.summary}</p>
        <dl className="mt-6 grid max-w-[34rem] grid-cols-[5rem_1fr] gap-x-3 gap-y-2 text-[0.95rem] sm:grid-cols-[6.5rem_1fr] sm:gap-x-4">
          <dt className="label pt-1 text-ink-2">Role</dt>
          <dd>{project.role}</dd>
          <dt className="label pt-1 text-ink-2">Medium</dt>
          <dd>{project.medium.join(", ")}</dd>
          <dt className="label pt-1 text-ink-2">Status</dt>
          <dd>
            <StatusMark status={project.status} className="text-brass" />
            <span className="block text-ink-2">{project.status.detail}</span>
          </dd>
        </dl>
        <div className="mt-auto flex flex-col items-start gap-3 pt-8">
          {live && (
            // Sits above the card-wide case study link.
            <a
              href={live.href}
              target="_blank"
              rel="noopener"
              className="label relative z-10 inline-flex min-h-11 items-center gap-2 border border-brass px-4 text-brass no-underline hover:bg-brass hover:text-placard-ink"
            >
              {live.label} <span aria-hidden="true">↗</span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
          <p className="label text-ink group-hover:text-brass">
            Read the case study <span aria-hidden="true">→</span>
          </p>
        </div>
      </div>
    </article>
  );
}
