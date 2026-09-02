/**
 * MarqueeTicker — the Y2K scrolling strip.
 *
 * The signature early-2000s move: an endless ticker of what the studio
 * does, gliding left forever in Game Paused with ember stars between
 * items. Sits between the hero and the first chapter like a TV lower-
 * third. Pauses on hover; fully static under reduced motion.
 */
export function MarqueeTicker({
  items,
  className = "",
}: {
  items?: string[];
  className?: string;
}) {
  const list =
    items ??
    [
      "Videos that sell",
      "Video ads",
      "UGC content",
      "AI avatars",
      "Product films",
      "Creative marketing",
      "Brief to final frame",
    ];

  const Row = () => (
    <div className="w8-marquee-group" aria-hidden="true">
      {list.map((t, i) => (
        <span key={i} className="w8-marquee-item">
          <span>✦</span>
          {t}
        </span>
      ))}
    </div>
  );

  return (
    <div className={`w8-marquee ${className}`} aria-hidden="true" data-nosnippet>
      <div className="w8-marquee-track">
        <Row />
        <Row />
      </div>
    </div>
  );
}
