/* ============================================================
   Brainelle.tsx — Brainelle. Not a second character: the same
   parametric mascot from BrainoChar.tsx wearing the `femme`
   flag, so every pose, dance, walk cycle and expression he
   already has works on her for free.

   What makes her her: a silk bow tied on the crown where the
   midline seam parts (same white-with-coral-trim material as
   his gloves and shoes), a scalloped polka dot skirt, round
   wire specs, outward-flicking lashes, a warmer blush, and
   pink shoes. The body, gradients, silhouette and footprint
   are untouched, so she still fits the notch, the bar, and
   the 24px favicon.

   A SKIRT, not a dress. She has no neck and no shoulders: her
   arms leave the body at y 53, above her mouth at y 61, so a
   neckline can only ever land on her face. A skirt does not
   hang, it sits on the base at y 70.

   Pass specs={false} or dress={false} to strip her back.

   Exports: Brainelle. Gradients still come from <BrainoDefs/>.
   ============================================================ */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Braino } from "./BrainoChar";

export function Brainelle({ accessory = "bow", specs = true, hair = "trim", dress = "bell", hairColor = "honey", ...rest }: any) {
  return <Braino femme accessory={accessory} specs={specs} hair={hair} dress={dress} hairColor={hairColor} {...rest} />;
}

export default Brainelle;
