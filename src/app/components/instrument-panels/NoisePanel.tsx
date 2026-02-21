import React from "react";
import { motion } from "motion/react";
import { Knob } from "../Knob";
import { usePercuProV1Store } from "../../../core/store";

export const NoisePanel: React.FC = () => {
  const { state, actions } = usePercuProV1Store();
  const n = state.ui.noiseInstrument ?? { presetId: "default", decay: 0.4, tone: 0.65, noise: 0.8, hpf: 0.7 };
  const set = (patch: Partial<typeof n>) => actions.setNoiseInstrument({ ...n, ...patch });
  return (
    <>
      <div className="grid grid-cols-2 gap-6">
        <Knob label="Decay" value={Math.round(n.decay * 100)} min={0} max={100} size={44} onChange={(v) => set({ decay: v / 100 })} />
        <Knob label="Tone" value={Math.round(n.tone * 100)} min={0} max={100} size={44} onChange={(v) => set({ tone: v / 100 })} />
        <Knob label="Level" value={Math.round(n.noise * 100)} min={0} max={100} size={44} onChange={(v) => set({ noise: v / 100 })} />
        <Knob label="HPF" value={Math.round(n.hpf * 100)} min={0} max={100} size={44} onChange={(v) => set({ hpf: v / 100 })} />
      </div>
      <div className="h-10 flex items-end gap-[1px] bg-[#0a0a0a] rounded-[2px] border border-white/[0.03] p-2">
        {[...Array(24)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ height: [`${15 + Math.random() * 50}%`, `${20 + Math.random() * 40}%`] }}
            transition={{ repeat: Infinity, duration: 1.2, repeatType: "mirror" }}
            className="flex-1 bg-[#00D2FF]/20 rounded-[1px]"
          />
        ))}
      </div>
    </>
  );
};
