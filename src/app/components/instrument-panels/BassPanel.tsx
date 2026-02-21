import React from "react";
import { Knob } from "../Knob";
import { usePercuProV1Store } from "../../../core/store";

export const BassPanel: React.FC = () => {
  const { state, actions } = usePercuProV1Store();
  const b = state.ui.bassInstrument ?? { presetId: "default", pitch: 0.5, cutoff: 0.5, resonance: 0.4, decay: 0.35, drive: 0.3 };
  const set = (patch: Partial<typeof b>) => actions.setBassInstrument({ ...b, ...patch });
  return (
    <div className="grid grid-cols-3 gap-6">
      <Knob label="Pitch" value={Math.round(b.pitch * 100)} min={0} max={100} size={44} onChange={(v) => set({ pitch: v / 100 })} />
      <Knob label="Cutoff" value={Math.round(b.cutoff * 100)} min={0} max={100} size={44} onChange={(v) => set({ cutoff: v / 100 })} />
      <Knob label="Reso" value={Math.round(b.resonance * 100)} min={0} max={100} size={44} onChange={(v) => set({ resonance: v / 100 })} />
      <Knob label="Decay" value={Math.round(b.decay * 100)} min={0} max={100} size={44} onChange={(v) => set({ decay: v / 100 })} />
      <Knob label="Drive" value={Math.round(b.drive * 100)} min={0} max={100} size={44} onChange={(v) => set({ drive: v / 100 })} />
    </div>
  );
};
