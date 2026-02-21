import React from "react";
import { Knob } from "../Knob";
import { usePercuProV1Store } from "../../../core/store";

export const SubPercPanel: React.FC = () => {
  const { state, actions } = usePercuProV1Store();
  const s = state.ui.subPercInstrument ?? { presetId: "default", decay: 0.5, tone: 0.5, punch: 0.4 };
  const set = (patch: Partial<typeof s>) => actions.setSubPercInstrument({ ...s, ...patch });
  return (
    <div className="grid grid-cols-3 gap-6">
      <Knob label="Decay" value={Math.round(s.decay * 100)} min={0} max={100} size={44} onChange={(v) => set({ decay: v / 100 })} />
      <Knob label="Tone" value={Math.round(s.tone * 100)} min={0} max={100} size={44} onChange={(v) => set({ tone: v / 100 })} />
      <Knob label="Punch" value={Math.round(s.punch * 100)} min={0} max={100} size={44} onChange={(v) => set({ punch: v / 100 })} />
    </div>
  );
};
