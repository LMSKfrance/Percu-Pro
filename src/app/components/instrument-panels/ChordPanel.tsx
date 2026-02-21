import React from "react";
import { Knob } from "../Knob";
import { usePercuProV1Store } from "../../../core/store";

export const ChordPanel: React.FC = () => {
  const { state, actions } = usePercuProV1Store();
  const c = state.ui.chordInstrument ?? { presetId: "default", tone: 0.52, decay: 0.4, body: 0.5 };
  const set = (patch: Partial<typeof c>) => actions.setChordInstrument({ ...c, ...patch });
  return (
    <div className="grid grid-cols-3 gap-6">
      <Knob label="Tone" value={Math.round(c.tone * 100)} min={0} max={100} size={44} onChange={(v) => set({ tone: v / 100 })} />
      <Knob label="Decay" value={Math.round(c.decay * 100)} min={0} max={100} size={44} onChange={(v) => set({ decay: v / 100 })} />
      <Knob label="Body" value={Math.round(c.body * 100)} min={0} max={100} size={44} onChange={(v) => set({ body: v / 100 })} />
    </div>
  );
};
