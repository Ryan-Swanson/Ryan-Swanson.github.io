import type { MediaItem, MediaSource } from "@/content/types";

const sourceText: Record<MediaSource, string> = {
  "live-site": "Captured from the live site",
  "native-app": "Window capture of the installed app",
  simulator: "Simulator capture of the current build",
  "local-fixture": "Local build with authored sample data",
  existing: "Earlier capture from the product's own materials",
};

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export function provenance(m: MediaItem) {
  return `${sourceText[m.source]}, ${monthFmt.format(new Date(`${m.captured}-01T00:00:00Z`))}`;
}

type Props = {
  media: MediaItem;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Render a figure with caption and provenance. */
  figure?: boolean;
};

export function Shot({ media, sizes, priority = false, className = "", figure = true }: Props) {
  const largest = media.widths[media.widths.length - 1];
  const img = (
    // Static export: plain <img> with a pre-generated srcset is lighter than next/image here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${media.src}-${largest}.webp`}
      srcSet={media.widths.map((w) => `${media.src}-${w}.webp ${w}w`).join(", ")}
      sizes={sizes}
      width={media.width}
      height={media.height}
      alt={media.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={`block h-auto w-full ${className}`}
    />
  );
  if (!figure) return img;
  const full = `${media.src}-${largest}.webp`;
  return (
    <figure className="w-full">
      {/* Dense desktop captures are hard to read at phone width, so every figure opens full size. */}
      <a href={full} target="_blank" rel="noopener" className="block overflow-hidden border border-rule bg-wall-2 hover:border-brass">
        {img}
        <span className="sr-only">(opens the full-size screenshot in a new tab)</span>
      </a>
      <figcaption className="mt-2 text-[0.9rem] text-ink-2">
        {media.caption && <span className="text-ink">{media.caption} </span>}
        <span className="label flex flex-wrap items-baseline justify-between gap-x-4 pt-1 text-ink-2/90">
          <span>{provenance(media)}</span>
          <a href={full} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-1 hover:text-brass" aria-hidden="true" tabIndex={-1}>
            Full size <span>↗</span>
          </a>
        </span>
      </figcaption>
    </figure>
  );
}
