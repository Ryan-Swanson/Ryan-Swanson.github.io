import Link from "next/link";
import { primaryLink } from "@/content/links";
import type { Project } from "@/content/types";
import { StatusMark } from "./StatusMark";

type Props = {
  project: Pick<Project, "slug" | "title" | "kind" | "years" | "medium" | "status" | "summary"> & Partial<Pick<Project, "links">>;
  /** Heading level for the title. */
  as?: "h2" | "h3" | "p";
  showLink?: boolean;
  /**
   * Tour label: smaller type, and on portrait phones no medium row and the links side by side,
   * so the label covers less of the scene. Short viewports also drop the summary.
   */
  compact?: boolean;
  className?: string;
};

/** A museum-style wall label: title, kind, medium, years, status. */
export function Placard({ project, as: Title = "h3", showLink = true, compact = false, className = "" }: Props) {
  const tight = compact ? "short:hidden" : "";
  // On portrait phones the medium row goes; wide layouts show it unless the viewport is short.
  const medium = compact ? "hidden wide:block short:hidden" : "";
  const live = project.links ? primaryLink({ links: project.links }) : undefined;
  return (
    <div className={`bg-placard text-placard-ink shadow-[0_1px_0_rgba(0,0,0,0.25),0_18px_40px_-20px_rgba(0,0,0,0.7)] ${className}`}>
      <div className={compact ? "px-4 pt-3 pb-2 wide:px-5 wide:pt-4 wide:pb-4" : "px-5 pt-4 pb-5"}>
        <Title className={`font-display leading-tight ${compact ? "text-[1.4rem] wide:text-[1.5rem]" : "text-[1.65rem]"}`}>
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
        <p className={`mt-0.5 text-placard-mute ${compact ? "text-[0.875rem]" : "text-[0.95rem]"}`}>
          {project.kind}, <span className="whitespace-nowrap">{project.years}</span>
        </p>
        <dl className={`grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 ${compact ? "mt-2 text-[0.85rem] wide:mt-3" : "mt-3 text-[0.9rem]"}`}>
          <dt className={`label pt-0.5 text-placard-mute ${medium}`}>Medium</dt>
          <dd className={medium}>{project.medium.join(", ")}</dd>
          <dt className="label pt-0.5 text-placard-mute">Status</dt>
          <dd>
            <StatusMark status={project.status} />
          </dd>
        </dl>
        <p className={`leading-snug ${compact ? "mt-2 text-[0.875rem] wide:mt-3 wide:text-[0.9rem]" : "mt-3 text-[0.95rem]"} ${tight}`}>{project.summary}</p>
        {(showLink || live) && (
          // Stacked: the live link on its own line above the case study link. Tour labels on phones
          // put them side by side to save height.
          <div
            className={`flex border-t border-placard-ink/20 ${
              compact
                ? "mt-3 flex-row flex-wrap items-center gap-x-4 pt-2 wide:mt-4 wide:flex-col wide:items-start wide:gap-1 wide:pt-3 short:wide:mt-2 short:wide:flex-row short:wide:items-center short:wide:gap-x-4 short:wide:pt-2"
                : "mt-4 flex-col items-start gap-1 pt-3"
            }`}
          >
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
                <span>
                  <span className={compact ? "sr-only wide:not-sr-only short:sr-only" : ""}>Read the </span>case study
                </span>{" "}
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
