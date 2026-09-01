"use client";

/**
 * VideoBackdrop — the WENOV8 atmosphere.
 *
 * A looping retro-astronaut film, tamed into a design surface:
 *  - dark mode: the film glows softly behind a deep-space veil
 *  - light mode: a paper veil turns it into a faint, warm texture
 * On top sits the signature pixel grid — the evolved pixel identity:
 * a drifting 46px grid that gives the film a subtle arcade frame.
 * All copy renders above with guaranteed contrast (see .w8-scrim).
 */
export function VideoBackdrop() {
  return (
    <div aria-hidden className="w8-video-wrap" data-nosnippet>
      <video
        className="w8-video"
        src="/videos/astronaut-bg.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
      />
      <div className="w8-video-veil" />
      <div className="w8-video-grid" />
    </div>
  );
}
