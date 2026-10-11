import Link from "next/link";
import { projects } from "@/content/projects";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[90rem] px-4 pt-16 sm:px-8">
      <p className="label text-ink-2">404</p>
      <h1 className="mt-3 font-display text-5xl leading-none sm:text-6xl">This page isn&rsquo;t on the wall.</h1>
      <p className="mt-5 max-w-[36rem] text-lg text-ink-2">
        The address may be from an older version of this site. Here is where everything lives now.
      </p>
      <ul className="mt-8 grid max-w-[40rem] gap-1">
        <li>
          <Link prefetch={false} href="/" className="inline-flex min-h-11 items-center hover:text-brass">Home</Link>
        </li>
        <li>
          <Link prefetch={false} href="/work/" className="inline-flex min-h-11 items-center hover:text-brass">All work</Link>
        </li>
        {projects.map((p) => (
          <li key={p.slug}>
            <Link prefetch={false} href={`/work/${p.slug}/`} className="inline-flex min-h-11 items-center pl-4 text-ink-2 hover:text-brass">
              {p.title}
            </Link>
          </li>
        ))}
        <li>
          <Link prefetch={false} href="/about/" className="inline-flex min-h-11 items-center hover:text-brass">About</Link>
        </li>
      </ul>
    </div>
  );
}
