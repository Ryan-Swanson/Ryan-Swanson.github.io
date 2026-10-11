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
  return (
    <figure className="w-full">
      <div className="overflow-hidden border border-rule bg-wall-2">{img}</div>
      <figcaption className="mt-2 text-[0.9rem] text-ink-2">
        {media.caption && <span className="text-ink">{media.caption} </span>}
        <span className="label block pt-1 text-ink-2/90">{provenance(media)}</span>
      </figcaption>
    </figure>
  );
}
