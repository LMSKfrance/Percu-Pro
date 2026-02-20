import React from "react";
import { Knob } from "../Knob";
import { usePercuProV1Store } from "../../../core/store";
import { verbosDsiFmPercModel } from "../../../audio/models/instruments/verbosDsiFmPerc";

const defaultHiPercInstrument = {
  modelId: "default" as const,
  presetId: null as string | null,
  color: 0.4,
  decay: 0.4,
  drive: 0.2,
  ratio: 2,
  tone: 0.6,
  feedback: 0.08,
};

export const HiPercPanel: React.FC = () => {
  const { state, actions } = usePercuProV1Store();
  const hi = state.ui.hiPercInstrument ?? defaultHiPercInstrument;
  const isVerbos = hi.modelId === "VERBOS_DSI_FM_PERC";

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest">Model</span>
        <select
          value={hi.modelId}
          onChange={(e) => actions.setHiPercModel(e.target.value as "default" | "VERBOS_DSI_FM_PERC")}
          className="w-full py-2 px-3 rounded-[2px] bg-white/[0.06] border border-white/[0.08] text-[11px] font-mono text-white focus:outline-none focus:border-[#E66000]/50"
        >
          <option value="default">Default</option>
          <option value="VERBOS_DSI_FM_PERC">{verbosDsiFmPercModel.name}</option>
        </select>
      </div>
      {isVerbos && (
        <>
          <div className="flex flex-col gap-3">
            <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest">Preset</span>
            <select
              value={hi.presetId ?? ""}
              onChange={(e) => {
                const id = e.target.value || null;
                actions.setHiPercPreset(id);
                if (id) {
                  const preset = verbosDsiFmPercModel.presets.find((p) => p.id === id);
                  if (preset) {
                    actions.setHiPercInstrumentFull({
                      modelId: "VERBOS_DSI_FM_PERC",
                      presetId: id,
                      color: preset.color,
                      decay: preset.decay,
                      drive: preset.drive,
                      ratio: preset.ratio,
                      tone: preset.tone,
                      feedback: preset.feedback,
                    });
                  }
                }
              }}
              className="w-full py-2 px-3 rounded-[2px] bg-white/[0.06] border border-white/[0.08] text-[11px] font-mono text-white focus:outline-none focus:border-[#E66000]/50"
            >
              <option value="">—</option>
              {verbosDsiFmPercModel.presets.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <Knob
              label="Color"
              value={Math.round(hi.color * 100)}
              min={0}
              max={100}
              size={44}
              onChange={(v) => actions.setHiPercMacro({ color: v / 100 })}
            />
            <Knob
              label="Decay"
              value={Math.round(hi.decay * 100)}
              min={0}
              max={100}
              size={44}
              onChange={(v) => actions.setHiPercMacro({ decay: v / 100 })}
            />
            <Knob
              label="Drive"
              value={Math.round(hi.drive * 100)}
              min={0}
              max={100}
              size={44}
              onChange={(v) => actions.setHiPercMacro({ drive: v / 100 })}
            />
          </div>
        </>
      )}
      {!isVerbos && (
        <div className="grid grid-cols-3 gap-6">
          <Knob label="Tune" value={62} size={44} />
          <Knob label="Decay" value={55} size={44} />
          <Knob label="Punch" value={35} size={44} />
          <Knob label="Color" value={45} size={44} />
          <Knob label="Shape" value={50} size={44} />
          <Knob label="Noise" value={25} size={44} />
        </div>
      )}
    </>
  );
};
