import Link from "next/link";
import { profile } from "@/content/profile";

export function Footer() {
  return (
    <footer id="contact" className="mt-24 border-t border-rule">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl">Get in touch</h2>
          <p className="mt-3 max-w-[36rem] text-ink-2">
            The best way to reach me is a message on LinkedIn. My public code and activity are on GitHub.
          </p>
          <ul className="mt-6 flex flex-wrap gap-3">
            {profile.links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  rel="me noopener"
                  className="inline-flex min-h-11 items-center gap-2 border border-rule px-4 no-underline hover:border-brass hover:text-brass"
                >
                  {l.label}
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-ink-2 md:justify-self-end md:text-right">
          <p>{profile.name}</p>
          <p>{profile.location}</p>
          <p className="mt-4">
            <Link prefetch={false} href="/work/" className="hover:text-brass">All work</Link>
            {" · "}
            <Link prefetch={false} href="/about/" className="hover:text-brass">About</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
