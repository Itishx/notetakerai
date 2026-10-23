import { Avatar } from "../Dashboard";
import type { FounderCard } from "../store";

/* The founder's name and face on the founder card (2026-10-23). The photo is
   shrunk to 160px so it fits in browser storage; "Use my photo" takes the one
   already in Settings (from Google sign-in or uploaded there). */
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = 160, c = document.createElement("canvas");
      c.width = s; c.height = s;
      const k = Math.max(s / img.width, s / img.height);
      const w = img.width * k, h = img.height * k;
      c.getContext("2d")!.drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
const mine = (): { name?: string; photo?: string } => { try { return JSON.parse(localStorage.getItem("foundry-v2-settings") || "{}"); } catch (_) { return {}; } };

export function FounderIdentity({ f, set }: { f: FounderCard; set: (k: "name" | "photo", v: string) => void }) {
  const me = mine();
  return (
    <div className="fx-fid">
      <Avatar name={f.name || f.who || "?"} photo={f.photo} size={64} />
      <div className="fx-fid-r">
        <label className="fx-fid-name"><span>Name</span><input value={f.name || ""} placeholder={me.name || "Your name"} onChange={(e) => set("name", e.target.value)} /></label>
        <div className="fx-fid-acts">
          <label className="fx-fid-btn">{f.photo ? "Change photo" : "Add a photo"}<input type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void shrink(file).then((p) => set("photo", p)); }} /></label>
          {me.photo && me.photo !== f.photo && <button type="button" className="fx-fid-btn" onClick={() => { set("photo", me.photo!); if (!f.name && me.name) set("name", me.name); }}>Use my photo</button>}
          {f.photo && <button type="button" className="fx-fid-btn quiet" onClick={() => set("photo", "")}>Remove</button>}
        </div>
      </div>
    </div>
  );
}
