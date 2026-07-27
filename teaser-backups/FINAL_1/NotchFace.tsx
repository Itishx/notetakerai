/**
 * NotchFace.tsx — Braino's notch as a web component.
 *
 * The markup below is a hand-kept VERBATIM duplicate of the notch in
 * mac/braino-mac/renderer/index.html (#notch-face), with ids converted to
 * classes so multiple instances can live on one page. The CSS lives in
 * ./notch-face.css, ported the same way from braino-mac.css. If the app's
 * notch art or states change, mirror both files.
 *
 * State classes are the app's own, applied to the root element:
 *   on · home · asleep · dozing · awake · blink · listen · speak ·
 *   captioning · nf-auth · nf-auth-ok · nf-auth-err · nf-greet ·
 *   mic-live · wake-armed · busy · music · live
 */
import { forwardRef } from "react";
import "./notch-face.css";

const FOLD_DARK = [16, 44, 72, 128, 156, 184];
const foldPath = (x: number, dir: number) =>
  `M ${x} 2 Q ${x + 7 * dir} 20 ${x} 37 Q ${x - 7 * dir} 54 ${x} 72`;

export const NOTCH_FACE_MARKUP = `
  <div class="nf-sonar"><i></i><i></i><i></i></div>
  <div class="nf-pill">
    <svg class="nf-folds" viewBox="0 0 200 74" preserveAspectRatio="none">
      ${FOLD_DARK.map((x) => `<path d="${foldPath(x, x < 100 ? 1 : -1)}" fill="none" stroke="#B34A41" stroke-width="2" stroke-linecap="round" opacity="0.55"/>`).join("")}
      ${FOLD_DARK.map((x) => `<path d="${foldPath(x + 2.4, x < 100 ? 1 : -1)}" fill="none" stroke="#FBD9D2" stroke-width="1.1" stroke-linecap="round" opacity="0.5"/>`).join("")}
    </svg>
    <div class="nf-band">
      <svg class="nf-mini" viewBox="0 0 120 56">
        <g class="nf-ears" opacity="0.32"><ellipse cx="38" cy="30" rx="8" ry="4.5" fill="#E14A48"/><ellipse cx="82" cy="30" rx="8" ry="4.5" fill="#E14A48"/></g>
        <g class="nf-eye nf-eye-l"><circle cx="49" cy="22" r="12" fill="#fff"/><circle class="nf-pupil-l" cx="49" cy="22" r="6.2" fill="#1B1713"/><circle class="nf-glint-l" cx="51.3" cy="19.3" r="2" fill="#fff"/></g>
        <g class="nf-eye nf-eye-r"><circle cx="71" cy="22" r="12" fill="#fff"/><circle class="nf-pupil-r" cx="71" cy="22" r="6.2" fill="#1B1713"/><circle class="nf-glint-r" cx="73.3" cy="19.3" r="2" fill="#fff"/></g>
        <path class="nf-lid" d="M 36 22 Q 49 28 62 22" fill="none" stroke="#F4E4DC" stroke-width="2.6" stroke-linecap="round"/>
        <path class="nf-lid" d="M 58 22 Q 71 28 84 22" fill="none" stroke="#F4E4DC" stroke-width="2.6" stroke-linecap="round"/>
        <path class="nf-mouth-idle" d="M 52 41 Q 60 49 68 41" fill="none" stroke="#7E2A24" stroke-width="2.6" stroke-linecap="round"/>
        <path class="nf-mouth-listen" d="M 55 43 Q 60 45 65 43" fill="none" stroke="#E8786E" stroke-width="2.4" stroke-linecap="round" style="display:none"/>
        <ellipse class="nf-mouth-talk" cx="60" cy="43" rx="4.6" ry="3.2" fill="#E8786E" style="display:none"/>
      </svg>
      <div class="nf-viz"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <div class="nf-dancer"></div>
    </div>
    <div class="nf-cap nf-cap-l"></div>
    <div class="nf-status"><span class="nf-status-inner"></span></div>
    <div class="nf-privacy"></div>
  </div>
`;

/** Set the island's little status ticker ("authenticating" / "authenticated"). */
export function setNotchStatus(host: HTMLElement | null, text: string) {
  if (!host) return;
  const status = host.querySelector<HTMLElement>(".nf-status");
  if (!status) return;
  status.classList.toggle("show", Boolean(text));
  const inner = status.querySelector<HTMLElement>(".nf-status-inner");
  if (inner) inner.textContent = text || "";
}

/** Type what he "heard" into the caption wing, like the real captioning state. */
export function typeNotchCaption(host: HTMLElement | null, text: string, speed = 60) {
  if (!host) return;
  const cap = host.querySelector<HTMLElement>(".nf-cap-l");
  if (!cap) return;
  cap.textContent = "";
  let i = 0;
  const t = window.setInterval(() => {
    if (!host.classList.contains("captioning")) { window.clearInterval(t); return; }
    cap.textContent = text.slice(0, ++i);
    if (i >= text.length) window.clearInterval(t);
  }, speed);
}

interface NotchFaceProps {
  id?: string;
  className?: string; // the app's state classes, e.g. "on home dozing wake-armed"
}

const NotchFace = forwardRef<HTMLDivElement, NotchFaceProps>(({ id, className = "" }, ref) => (
  <div
    ref={ref}
    id={id}
    className={`nf-face ${className}`}
    aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: NOTCH_FACE_MARKUP }}
  />
));
NotchFace.displayName = "NotchFace";

export default NotchFace;
