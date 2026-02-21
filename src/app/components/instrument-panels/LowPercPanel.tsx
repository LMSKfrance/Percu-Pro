import React from "react";
import { Knob } from "../Knob";
import { usePercuProV1Store } from "../../../core/store";

export const LowPercPanel: React.FC = () => {
  const { state, actions } = usePercuProV1Store();
  const p = state.ui.lowPercInstrument ?? { presetId: "default", tune: 0.38, decay: 0.55, punch: 0.35, color: 0.45, shape: 0.5, noise: 0.25 };
  const set = (patch: Partial<typeof p>) => actions.setLowPercInstrument({ ...p, ...patch });
  return (
    <div className="grid grid-cols-3 gap-6">
      <Knob label="Tune" value={Math.round(p.tune * 100)} min={0} max={100} size={44} onChange={(v) => set({ tune: v / 100 })} />
      <Knob label="Decay" value={Math.round(p.decay * 100)} min={0} max={100} size={44} onChange={(v) => set({ decay: v / 100 })} />
      <Knob label="Punch" value={Math.round(p.punch * 100)} min={0} max={100} size={44} onChange={(v) => set({ punch: v / 100 })} />
      <Knob label="Color" value={Math.round(p.color * 100)} min={0} max={100} size={44} onChange={(v) => set({ color: v / 100 })} />
      <Knob label="Shape" value={Math.round(p.shape * 100)} min={0} max={100} size={44} onChange={(v) => set({ shape: v / 100 })} />
      <Knob label="Noise" value={Math.round(p.noise * 100)} min={0} max={100} size={44} onChange={(v) => set({ noise: v / 100 })} />
    </div>
  );
};
