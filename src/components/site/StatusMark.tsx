import type { Project } from "@/content/types";

/**
 * Status is encoded by shape as well as text: a filled dot for live, a ring for
 * limited availability, a dashed ring for work in development.
 */
export function StatusMark({ status, className = "" }: { status: Project["status"]; className?: string }) {
  const shape =
    status.tone === "live"
      ? "bg-current border-current"
      : status.tone === "limited"
        ? "border-current"
        : "border-current border-dashed";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span aria-hidden="true" className={`inline-block size-2.5 shrink-0 rounded-full border ${shape}`} />
      {status.label}
    </span>
  );
}
