import { imageToSrc } from "@/lib/figure";

/**
 * Renders an optional question figure. Always uses an <img> element, which
 * prevents SVG scripts from executing and blocks external subresource loads,
 * so untrusted SVG is safe to display. Returns null when there is no figure.
 */
export function QuestionFigure({
  image,
  alt,
  className = "",
}: {
  image?: string;
  alt?: string;
  className?: string;
}) {
  if (!image) return null;
  const src = imageToSrc(image);
  return (
    <div className={`my-3 overflow-x-auto ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || "Question figure"}
        className="max-w-full rounded-lg border border-slate-200 bg-white"
      />
    </div>
  );
}
