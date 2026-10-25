import Link from "next/link";
import { profile } from "@/content/profile";
import { MotionToggle } from "./MotionToggle";

const navLink = "label inline-flex min-h-11 items-center px-1.5 no-underline hover:text-brass sm:px-2";

export function Header() {
  return (
    <header className="relative z-20 mx-auto grid max-w-[90rem] grid-cols-[1fr_auto] items-center gap-x-4 px-4 pt-3 sm:flex sm:justify-between sm:px-8 sm:pt-6">
      <Link prefetch={false} href="/" className="inline-flex min-h-11 items-center font-display text-xl tracking-tight no-underline sm:text-2xl">
        Ryan Swanson
      </Link>
      <div className="sm:order-last">
        <MotionToggle />
      </div>
      <nav aria-label="Primary" className="col-span-2 -mx-1.5 flex flex-wrap items-center sm:mx-0 sm:ml-auto">
        <Link prefetch={false} href="/work/" className={navLink}>
          Work
        </Link>
        <Link prefetch={false} href="/about/" className={navLink}>
          About
        </Link>
        {profile.links.map((l) => (
          <a key={l.href} href={l.href} rel="me noopener" className={navLink}>
            {l.label}
            <span aria-hidden="true">&nbsp;↗</span>
          </a>
        ))}
      </nav>
    </header>
  );
}
