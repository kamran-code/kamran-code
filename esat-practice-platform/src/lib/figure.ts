// Optional per-question figure support (diagrams, graphs, circuits).
//
// A figure is stored as a single string that is one of:
//   - inline SVG markup ("<svg ...>...</svg>")
//   - a data: URI ("data:image/png;base64,...", "data:image/svg+xml,...")
//   - an http(s) URL
//
// Figures always render inside an <img> element (see QuestionFigure), which
// prevents SVG scripts from executing and blocks external subresource loads.
// We additionally harden inline SVG on ingest as defense-in-depth.

const MAX_IMAGE_LEN = 500_000; // ~500 KB cap on a single figure string

function isSvg(s: string): boolean {
  return /^<svg[\s>]/i.test(s);
}

/** Strip obviously-dangerous constructs from inline SVG (defense-in-depth). */
function hardenSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

/**
 * Validate and normalize a figure value from untrusted input.
 * Returns the cleaned string, or null if it is absent/invalid.
 */
export function normalizeImage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s || s.length > MAX_IMAGE_LEN) return null;
  if (isSvg(s)) return hardenSvg(s);
  if (/^data:image\//i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return null;
}

/** Convert a stored figure value into a src usable by an <img> element. */
export function imageToSrc(image: string): string {
  const s = image.trim();
  if (isSvg(s)) return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
  return s; // data: URI or http(s) URL
}
