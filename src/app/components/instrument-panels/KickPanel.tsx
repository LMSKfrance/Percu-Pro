import React from "react";
import { Knob } from "../Knob";
import { usePercuProV1Store } from "../../../core/store";

export const KickPanel: React.FC = () => {
  const { state, actions } = usePercuProV1Store();
  const k = state.ui.kickInstrument ?? { presetId: "default", pitch: 0.42, decay: 0.65, punch: 0.55, tone: 0.5, drive: 0.3, sub: 0.7 };
  const set = (patch: Partial<typeof k>) => actions.setKickInstrument({ ...k, ...patch });
  return (
    <div className="grid grid-cols-3 gap-6">
      <Knob label="Pitch" value={Math.round(k.pitch * 100)} min={0} max={100} size={44} onChange={(v) => set({ pitch: v / 100 })} />
      <Knob label="Decay" value={Math.round(k.decay * 100)} min={0} max={100} size={44} onChange={(v) => set({ decay: v / 100 })} />
      <Knob label="Punch" value={Math.round(k.punch * 100)} min={0} max={100} size={44} onChange={(v) => set({ punch: v / 100 })} />
      <Knob label="Tone" value={Math.round(k.tone * 100)} min={0} max={100} size={44} onChange={(v) => set({ tone: v / 100 })} />
      <Knob label="Drive" value={Math.round(k.drive * 100)} min={0} max={100} size={44} onChange={(v) => set({ drive: v / 100 })} />
      <Knob label="Sub" value={Math.round(k.sub * 100)} min={0} max={100} size={44} onChange={(v) => set({ sub: v / 100 })} />
    </div>
  );
};
