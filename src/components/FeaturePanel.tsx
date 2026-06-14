/* ============================================================
   Embeds the use-case feature design (chips + heading + browser
   mockup graphic + "what you can use it for" table) inside the
   Profile Grid feature popup modals and the Demos gallery.
   ============================================================ */
import { Feature, FeatureBody, FeatureHeaderInfo, FEATURES } from "@/pages/UseCases";

/** Feature design embedded inside the popup modal: chips header + full body. */
export function FeaturePanelContent({ feature }: { feature: Feature }) {
  return (
    <div style={{ background: "var(--sb-bg)", color: "var(--sb-ink)" }}>
      <div style={{ padding: "30px 32px 4px" }}>
        <FeatureHeaderInfo feature={feature} isOpen />
      </div>
      <FeatureBody feature={feature} />
    </div>
  );
}

/** Maps a Profile-Grid feature-card id to a use-case Feature. */
export const CARD_TO_FEATURE: Record<string, string> = {
  chat: "chat",
  lectures: "record",
  meetings: "meetings",
  agent: "delegate",
};

export function featureById(id: string): Feature | undefined {
  return FEATURES.find(f => f.id === id);
}
