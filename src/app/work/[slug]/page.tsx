import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Shot } from "@/components/site/Shot";
import { StatusMark } from "@/components/site/StatusMark";
import { getProject, projects } from "@/content/projects";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const project = getProject((await params).slug);
  if (!project) return {};
  const image = `${project.hero.src}-${project.hero.widths.at(-1)}.webp`;
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `/work/${project.slug}/` },
    openGraph: {
      title: `${project.title} | Ryan Swanson`,
      description: project.summary,
      url: `/work/${project.slug}/`,
      images: [{ url: image, width: project.hero.width, height: project.hero.height, alt: project.hero.alt }],
    },
  };
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t border-rule py-10 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10 lg:py-12">
      <h2 id={id} className="font-display text-2xl leading-tight md:sticky md:top-6 md:self-start">
        {title}
      </h2>
      <div className="prose-case max-w-[44rem] text-[1.0625rem]">{children}</div>
    </section>
  );
}

export default async function CaseStudy({ params }: Params) {
  const project = getProject((await params).slug);
  if (!project) notFound();
  const cs = project.caseStudy;
  const index = projects.findIndex((p) => p.slug === project.slug);
  const prev = projects[(index - 1 + projects.length) % projects.length]!;
  const next = projects[(index + 1) % projects.length]!;
  const rest = cs.gallery.filter((m) => m.src !== project.hero.src);
  const isTall = (m: (typeof rest)[number]) => m.device === "phone" || m.device === "watch";
  const wide = rest.filter((m) => !isTall(m));
  const tall = rest.filter(isTall);
  const heroIsNarrow = project.hero.device === "phone" || project.hero.device === "watch";

  return (
    <article className="mx-auto max-w-[90rem] px-4 sm:px-8">
      <nav aria-label="Breadcrumb" className="label pt-8 text-ink-2">
        <Link prefetch={false} href="/work/" className="hover:text-brass">
          Work
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{project.title}</span>
      </nav>

      <header className="grid gap-10 pt-6 pb-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <p className="label text-ink-2">{project.kind}</p>
          <h1 className="mt-3 font-display text-5xl leading-[0.98] tracking-[-0.01em] sm:text-7xl">{project.title}</h1>
          <p className="mt-5 max-w-[36rem] text-xl leading-relaxed">{project.summary}</p>
        </div>
        <div className="self-end bg-placard p-5 text-placard-ink">
          <dl className="grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-2 text-[0.95rem]">
            <dt className="label pt-0.5 text-placard-mute">Role</dt>
            <dd>{project.role}</dd>
            <dt className="label pt-0.5 text-placard-mute">Years</dt>
            <dd>{project.years}</dd>
            <dt className="label pt-0.5 text-placard-mute">Platforms</dt>
            <dd>{project.platforms.join(", ")}</dd>
            <dt className="label pt-0.5 text-placard-mute">Medium</dt>
            <dd>{project.medium.join(", ")}</dd>
            <dt className="label pt-0.5 text-placard-mute">Status</dt>
            <dd>
              <StatusMark status={project.status} />
              <span className="mt-0.5 block text-placard-mute">{project.status.detail}</span>
            </dd>
          </dl>
          {project.links.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2 border-t border-placard-ink/15 pt-4">
              {project.links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    rel="noopener"
                    className="inline-flex min-h-11 items-center gap-2 bg-placard-ink px-4 text-placard no-underline hover:bg-[#2e3532]"
                  >
                    {l.label} <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[0.875rem] leading-snug text-placard-mute">{project.sourceNote}</p>
        </div>
      </header>

      <div className={heroIsNarrow ? "mx-auto max-w-[20rem]" : ""}>
        <Shot media={project.hero} sizes="(min-width: 1440px) 1376px, 100vw" priority />
      </div>

      <div className="mt-12">
        <Section id="problem" title="The problem">
          <p>{cs.problem}</p>
          <p className="text-ink-2">
            <span className="label mr-2 text-ink">For</span>
            {cs.audience}
          </p>
        </Section>

        <Section id="built" title="What I built">
          <ul>
            {cs.built.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </Section>

        <Section id="architecture" title="Architecture">
          <ul>
            {cs.architecture.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Section>

        <Section id="decisions" title="Decisions">
          <div className="grid gap-8">
            {cs.decisions.map((d) => (
              <div key={d.title}>
                <h3 className="font-display text-xl text-brass">{d.title}</h3>
                <p className="mt-2">{d.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="hard-problem" title="The hard part">
          <h3 className="font-display text-xl text-brass">{cs.hardProblem.title}</h3>
          <p className="mt-2">{cs.hardProblem.body}</p>
        </Section>

        {rest.length > 0 && (
          <section aria-labelledby="screens" className="border-t border-rule py-10 lg:py-12">
            <h2 id="screens" className="font-display text-2xl">
              Screens
            </h2>
            {wide.length > 0 && (
              <div className="mt-6 grid items-start gap-x-8 gap-y-10 md:grid-cols-2">
                {wide.map((m) => (
                  <Shot key={m.src} media={m} sizes="(min-width: 768px) 45vw, 100vw" />
                ))}
              </div>
            )}
            {tall.length > 0 && (
              <div className="mt-10 flex flex-wrap items-start justify-center gap-x-10 gap-y-10 md:justify-start">
                {tall.map((m) => (
                  <div key={m.src} className={m.device === "watch" ? "w-[11rem]" : "w-[15rem]"}>
                    <Shot media={m} sizes={m.device === "watch" ? "176px" : "240px"} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <Section id="validation" title="Testing and validation">
          <ul>
            {cs.validation.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </Section>

        <Section id="result" title="Where it stands">
          <p>{cs.result}</p>
          <h3 className="label mt-6 text-ink-2">What’s next</h3>
          <ul className="mt-3">
            {cs.next.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Section>
      </div>

      <nav aria-label="More projects" className="grid gap-4 border-t border-rule pt-10 sm:grid-cols-2">
        <Link prefetch={false} href={`/work/${prev.slug}/`} className="group block border border-rule p-5 no-underline hover:border-brass">
          <span className="label text-ink-2">Previous</span>
          <span className="mt-1 block font-display text-2xl group-hover:text-brass">{prev.title}</span>
        </Link>
        <Link prefetch={false} href={`/work/${next.slug}/`} className="group block border border-rule p-5 text-right no-underline hover:border-brass">
          <span className="label text-ink-2">Next</span>
          <span className="mt-1 block font-display text-2xl group-hover:text-brass">{next.title}</span>
        </Link>
      </nav>
    </article>
  );
}
