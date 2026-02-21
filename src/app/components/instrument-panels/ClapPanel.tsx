import React from "react";
import { Knob } from "../Knob";
import { usePercuProV1Store } from "../../../core/store";

export const ClapPanel: React.FC = () => {
  const { state, actions } = usePercuProV1Store();
  const c = state.ui.clapInstrument ?? { presetId: "default", decay: 0.6, snap: 0.55, tone: 0.5, stereo: 0.4, noise: 0.7, body: 0.45 };
  const set = (patch: Partial<typeof c>) => actions.setClapInstrument({ ...c, ...patch });
  return (
    <div className="grid grid-cols-3 gap-6">
      <Knob label="Decay" value={Math.round(c.decay * 100)} min={0} max={100} size={44} onChange={(v) => set({ decay: v / 100 })} />
      <Knob label="Snap" value={Math.round(c.snap * 100)} min={0} max={100} size={44} onChange={(v) => set({ snap: v / 100 })} />
      <Knob label="Tone" value={Math.round(c.tone * 100)} min={0} max={100} size={44} onChange={(v) => set({ tone: v / 100 })} />
      <Knob label="Stereo" value={Math.round(c.stereo * 100)} min={0} max={100} size={44} onChange={(v) => set({ stereo: v / 100 })} />
      <Knob label="Noise" value={Math.round(c.noise * 100)} min={0} max={100} size={44} onChange={(v) => set({ noise: v / 100 })} />
      <Knob label="Body" value={Math.round(c.body * 100)} min={0} max={100} size={44} onChange={(v) => set({ body: v / 100 })} />
    </div>
  );
};
