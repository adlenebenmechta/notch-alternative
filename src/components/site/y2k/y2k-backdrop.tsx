/**
 * Y2KBackdrop — the WENOV8 Y2K atmosphere.
 *
 * The year-2000 optimism layer, tamed into a design surface:
 *  - aurora mesh: three drifting, blurred brand-hue glows
 *    (bloom pink / ultra violet / ion cyan)
 *  - chrome orbs: glossy bubbles with specular highlights
 *  - an iridescent bubble ring slowly spinning
 *  - sparkle stars twinkling across the sky
 * Pure CSS (no canvas, no video) — theme-aware via tokens,
 * motion-safe (all animations respect prefers-reduced-motion).
 */
export function Y2KBackdrop() {
  return (
    <div aria-hidden className="w8-y2k-wrap" data-nosnippet>
      {/* aurora mesh */}
      <div className="w8-aurora w8-aurora-1" />
      <div className="w8-aurora w8-aurora-2" />
      <div className="w8-aurora w8-aurora-3" />

      {/* chrome orbs */}
      <div
        className="w8-orb w8-orb-a"
        style={{ width: 190, height: 190, top: "16%", left: "6%" }}
      />
      <div
        className="w8-orb w8-orb-b"
        style={{ width: 84, height: 84, top: "58%", left: "12%" }}
      />
      <div
        className="w8-orb w8-orb-c"
        style={{ width: 132, height: 132, top: "34%", right: "9%" }}
      />
      <div
        className="w8-orb w8-orb-a"
        style={{ width: 54, height: 54, top: "72%", right: "22%" }}
      />
      <div
        className="w8-orb w8-orb-b"
        style={{ width: 34, height: 34, top: "8%", right: "30%" }}
      />

      {/* iridescent bubble ring */}
      <div
        className="w8-bubble-ring"
        style={{ width: 300, height: 300, top: "12%", right: "14%" }}
      />

      {/* sparkle stars */}
      <Star size={13} top="14%" left="22%" dur="3.1s" dly="0s" />
      <Star size={9} top="9%" left="44%" dur="2.6s" dly="0.8s" />
      <Star size={16} top="22%" left="64%" dur="3.8s" dly="1.4s" />
      <Star size={8} top="30%" left="34%" dur="2.9s" dly="2.2s" />
      <Star size={11} top="48%" left="5%" dur="3.4s" dly="0.4s" />
      <Star size={7} top="52%" left="55%" dur="2.4s" dly="1.1s" />
      <Star size={12} top="64%" left="30%" dur="3.6s" dly="1.9s" />
      <Star size={9} top="76%" left="70%" dur="3s" dly="0.6s" />
      <Star size={14} top="84%" left="16%" dur="4s" dly="2.6s" />
      <Star size={8} top="88%" left="48%" dur="2.7s" dly="1.5s" />
      <Star size={10} top="70%" right="8%" dur="3.3s" dly="2s" />
    </div>
  );
}

function Star({
  size,
  top,
  left,
  right,
  dur,
  dly,
}: {
  size: number;
  top: string;
  left?: string;
  right?: string;
  dur: string;
  dly: string;
}) {
  return (
    <span
      className="w8-star"
      style={
        {
          width: size,
          height: size,
          top,
          ...(left ? { left } : {}),
          ...(right ? { right } : {}),
          "--w8-star-dur": dur,
          "--w8-star-dly": dly,
        } as React.CSSProperties
      }
    />
  );
}
