/* DemoSlot: where a real screen recording of Braino goes (2026-10-13).
   Until the clip exists it shows a quiet placeholder that says what the clip
   will show. Drop the file in public/demos/ and pass `src` to make it real:
   it then autoplays muted and looped, with a button for sound. */
import { useRef, useState } from "react";

export function DemoSlot({ src, title, caption, poster }: { src?: string; title: string; caption: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(false);
  return (
    <figure className="dm">
      {src ? (
        <div className="dm-frame">
          <video ref={ref} src={src} poster={poster} autoPlay muted={!sound} loop playsInline />
          <button type="button" className="dm-sound" onClick={() => { setSound(!sound); if (ref.current) { ref.current.muted = sound; ref.current.currentTime = 0; void ref.current.play(); } }}>
            {sound ? "Sound off" : "Play with sound"}
          </button>
        </div>
      ) : (
        <div className="dm-frame dm-empty" role="img" aria-label={`Demo video coming soon: ${title}`}>
          <span className="dm-play" aria-hidden="true" />
          <b>{title}</b>
          <small>Real demo coming soon</small>
        </div>
      )}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
