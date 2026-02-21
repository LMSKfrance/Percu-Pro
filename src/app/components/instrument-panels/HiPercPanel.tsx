import React from "react";
import { Knob } from "../Knob";
import { usePercuProV1Store } from "../../../core/store";
import type { HiPercInstrumentState } from "../../../core/types";
import { verbosDsiFmPercModel } from "../../../audio/models/instruments/verbosDsiFmPerc";
import { fmMdKickModel } from "../../../audio/models/instruments/fmMdKick";
import { fmMdSnareModel } from "../../../audio/models/instruments/fmMdSnare";
import { fmMdHatModel } from "../../../audio/models/instruments/fmMdHat";

const defaultHiPercInstrument: HiPercInstrumentState = {
  modelId: "default",
  presetId: null,
  color: 0.4,
  decay: 0.4,
  drive: 0.2,
  ratio: 2,
  tone: 0.6,
  feedback: 0.08,
  fmMdPresetId: null,
  fmMdMacro1: 0.5,
  fmMdMacro2: 0.5,
  fmMdMacro3: 0.5,
};

export const HiPercPanel: React.FC = () => {
  const { state, actions } = usePercuProV1Store();
  const hi = state.ui.hiPercInstrument ?? defaultHiPercInstrument;
  const isVerbos = hi.modelId === "VERBOS_DSI_FM_PERC";
  const isFmMd = hi.modelId === "FM_MD_KICK" || hi.modelId === "FM_MD_SNARE" || hi.modelId === "FM_MD_HAT";
  const fmMdModel = isFmMd
    ? hi.modelId === "FM_MD_KICK"
      ? fmMdKickModel
      : hi.modelId === "FM_MD_SNARE"
        ? fmMdSnareModel
        : fmMdHatModel
    : null;
  const m1 = hi.fmMdMacro1 ?? 0.5;
  const m2 = hi.fmMdMacro2 ?? 0.5;
  const m3 = hi.fmMdMacro3 ?? 0.5;

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest">Model</span>
        <select
          value={hi.modelId}
          onChange={(e) => actions.setHiPercModel(e.target.value as HiPercInstrumentState["modelId"])}
          className="w-full py-2 px-3 rounded-[2px] bg-white/[0.06] border border-white/[0.08] text-[11px] font-mono text-white focus:outline-none focus:border-[#E66000]/50"
        >
          <option value="default">Default</option>
          <option value="VERBOS_DSI_FM_PERC">{verbosDsiFmPercModel.name}</option>
          <option value="FM_MD_KICK">{fmMdKickModel.name}</option>
          <option value="FM_MD_SNARE">{fmMdSnareModel.name}</option>
          <option value="FM_MD_HAT">{fmMdHatModel.name}</option>
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
      {isFmMd && fmMdModel && (
        <>
          <div className="flex flex-col gap-3">
            <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest">Preset</span>
            <select
              value={hi.fmMdPresetId ?? ""}
              onChange={(e) => {
                const id = e.target.value || null;
                if (id) {
                  const preset = (fmMdModel as { presets: Array<{ id: string; name: string; [k: string]: unknown }> }).presets.find((p) => p.id === id);
                  if (preset) {
                    const a = (preset as Record<string, number>)[fmMdModel.macros[0].id] ?? 0.5;
                    const b = (preset as Record<string, number>)[fmMdModel.macros[1].id] ?? 0.5;
                    const c = (preset as Record<string, number>)[fmMdModel.macros[2].id] ?? 0.5;
                    actions.setHiPercFmMdPreset({ presetId: id, m1: a, m2: b, m3: c });
                  }
                } else {
                  actions.setHiPercFmMdPreset({ presetId: null, m1, m2, m3 });
                }
              }}
              className="w-full py-2 px-3 rounded-[2px] bg-white/[0.06] border border-white/[0.08] text-[11px] font-mono text-white focus:outline-none focus:border-[#E66000]/50"
            >
              <option value="">—</option>
              {(fmMdModel as { presets: Array<{ id: string; name: string }> }).presets.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <Knob
              label={fmMdModel.macros[0].label}
              value={Math.round(m1 * 100)}
              min={0}
              max={100}
              size={44}
              onChange={(v) => actions.setHiPercFmMdMacro({ m1: v / 100 })}
            />
            <Knob
              label={fmMdModel.macros[1].label}
              value={Math.round(m2 * 100)}
              min={0}
              max={100}
              size={44}
              onChange={(v) => actions.setHiPercFmMdMacro({ m2: v / 100 })}
            />
            <Knob
              label={fmMdModel.macros[2].label}
              value={Math.round(m3 * 100)}
              min={0}
              max={100}
              size={44}
              onChange={(v) => actions.setHiPercFmMdMacro({ m3: v / 100 })}
            />
          </div>
        </>
      )}
      {!isVerbos && !isFmMd && (
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
