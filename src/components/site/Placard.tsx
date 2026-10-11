import Link from "next/link";
import { primaryLink } from "@/content/links";
import type { Project } from "@/content/types";
import { StatusMark } from "./StatusMark";

type Props = {
  project: Pick<Project, "slug" | "title" | "kind" | "years" | "medium" | "status" | "summary"> & Partial<Pick<Project, "links">>;
  /** Heading level for the title. */
  as?: "h2" | "h3" | "p";
  showLink?: boolean;
  className?: string;
};

/** A museum-style wall label: title, kind, medium, years, status. */
export function Placard({ project, as: Title = "h3", showLink = true, className = "" }: Props) {
  const live = project.links ? primaryLink({ links: project.links }) : undefined;
  return (
    <div className={`bg-placard text-placard-ink shadow-[0_1px_0_rgba(0,0,0,0.25),0_18px_40px_-20px_rgba(0,0,0,0.7)] ${className}`}>
      <div className="px-5 pt-4 pb-5">
        <Title className="font-display text-[1.65rem] leading-tight">
          {/* The title is a link too: to the live product when there is one, otherwise the case study. */}
          {live ? (
            <a href={live.href} target="_blank" rel="noopener" className="no-underline decoration-1 underline-offset-4 hover:underline">
              {project.title}
              <span aria-hidden="true" className="ml-1.5 align-[0.2em] text-[0.6em] text-placard-mute">↗</span>
              <span className="sr-only"> (opens {live.label.replace(/^(Open|Visit|View on) /, "")} in a new tab)</span>
            </a>
          ) : (
            <Link prefetch={false} href={`/work/${project.slug}/`} className="no-underline decoration-1 underline-offset-4 hover:underline">
              {project.title}
            </Link>
          )}
        </Title>
        <p className="mt-0.5 text-[0.95rem] text-placard-mute">
          {project.kind}, {project.years}
        </p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[0.9rem]">
          <dt className="label pt-0.5 text-placard-mute">Medium</dt>
          <dd>{project.medium.join(", ")}</dd>
          <dt className="label pt-0.5 text-placard-mute">Status</dt>
          <dd>
            <StatusMark status={project.status} />
          </dd>
        </dl>
        <p className="mt-3 text-[0.95rem] leading-snug">{project.summary}</p>
        {(showLink || live) && (
          // Always stacked: the live link on its own line above the case study link, on every card.
          <div className="mt-4 flex flex-col items-start gap-1 border-t border-placard-ink/20 pt-3">
            {live && (
              <a
                href={live.href}
                target="_blank"
                rel="noopener"
                className="label inline-flex min-h-11 items-center gap-2 bg-placard-ink px-3 text-placard no-underline hover:bg-[#2e3532]"
              >
                {live.label} <span aria-hidden="true">↗</span>
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
            {showLink && (
              <Link prefetch={false}
                href={`/work/${project.slug}/`}
                className="label inline-flex min-h-11 items-center gap-2 no-underline hover:underline"
              >
                Read the case study <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
