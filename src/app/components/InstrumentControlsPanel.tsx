import React from "react";
import type { TrackId, HiPercInstrumentState } from "../../core/types";
import {
  INSTRUMENT_LABELS,
  NoisePanel,
  HiPercPanel,
  LowPercPanel,
  ClapPanel,
  ChordPanel,
  BassPanel,
  SubPercPanel,
  KickPanel,
} from "./instrument-panels";
import {
  KICK_PRESETS as KICK_PRESETS_DATA,
  NOISE_PRESETS as NOISE_PRESETS_DATA,
  LOW_PERC_PRESETS as LOW_PERC_PRESETS_DATA,
  CLAP_PRESETS as CLAP_PRESETS_DATA,
  CHORD_PRESETS as CHORD_PRESETS_DATA,
  BASS_PRESETS as BASS_PRESETS_DATA,
  SUB_PERC_PRESETS as SUB_PERC_PRESETS_DATA,
} from "./instrument-panels/instrumentPresets";
import { InstrumentPresetDropdown, type InstrumentPresetOption } from "./InstrumentPresetDropdown";
import { usePercuProV1Store } from "../../core/store";
import { verbosDsiFmPercModel } from "../../audio/models/instruments/verbosDsiFmPerc";
import { fmMdKickModel } from "../../audio/models/instruments/fmMdKick";
import { fmMdSnareModel } from "../../audio/models/instruments/fmMdSnare";
import { fmMdHatModel } from "../../audio/models/instruments/fmMdHat";

interface InstrumentControlsPanelProps {
  selectedTrackId: TrackId | null;
}

const PANEL_BY_TRACK: Record<TrackId, React.FC> = {
  noise: NoisePanel,
  hiPerc: HiPercPanel,
  lowPerc: LowPercPanel,
  clap: ClapPanel,
  chord: ChordPanel,
  bass: BassPanel,
  subPerc: SubPercPanel,
  kick: KickPanel,
};

const ACCENT = "#E66000";

function toOptions<T extends { id: string; name: string }>(arr: T[]): InstrumentPresetOption[] {
  return arr.map((p) => ({ id: p.id, name: p.name, color: ACCENT }));
}

const KICK_PRESETS_OPTIONS = toOptions(KICK_PRESETS_DATA);
const NOISE_PRESETS_OPTIONS = toOptions(NOISE_PRESETS_DATA);
const LOW_PERC_PRESETS_OPTIONS = toOptions(LOW_PERC_PRESETS_DATA);
const CLAP_PRESETS_OPTIONS = toOptions(CLAP_PRESETS_DATA);
const CHORD_PRESETS_OPTIONS = toOptions(CHORD_PRESETS_DATA);
const BASS_PRESETS_OPTIONS = toOptions(BASS_PRESETS_DATA);
const SUB_PERC_PRESETS_OPTIONS = toOptions(SUB_PERC_PRESETS_DATA);

/** Build flat list of Hi Perc presets (all models) with composite id "modelId:presetId" */
function getHiPercPresetOptions(): InstrumentPresetOption[] {
  const verbos = verbosDsiFmPercModel.presets.map((p) => ({
    id: `VERBOS_DSI_FM_PERC:${p.id}`,
    name: `${verbosDsiFmPercModel.name}: ${p.name}`,
    color: "#E66000",
  }));
  const kick = fmMdKickModel.presets.map((p) => ({
    id: `FM_MD_KICK:${p.id}`,
    name: `${fmMdKickModel.name}: ${p.name}`,
    color: "#E66000",
  }));
  const snare = fmMdSnareModel.presets.map((p) => ({
    id: `FM_MD_SNARE:${p.id}`,
    name: `${fmMdSnareModel.name}: ${p.name}`,
    color: "#E66000",
  }));
  const hat = fmMdHatModel.presets.map((p) => ({
    id: `FM_MD_HAT:${p.id}`,
    name: `${fmMdHatModel.name}: ${p.name}`,
    color: "#E66000",
  }));
  return [...verbos, ...kick, ...snare, ...hat];
}

const HIPERC_PRESETS = getHiPercPresetOptions();

function getHiPercCurrentValue(hi: HiPercInstrumentState): string {
  if (hi.modelId === "VERBOS_DSI_FM_PERC" && hi.presetId) {
    return `VERBOS_DSI_FM_PERC:${hi.presetId}`;
  }
  if (
    (hi.modelId === "FM_MD_KICK" || hi.modelId === "FM_MD_SNARE" || hi.modelId === "FM_MD_HAT") &&
    hi.fmMdPresetId
  ) {
    return `${hi.modelId}:${hi.fmMdPresetId}`;
  }
  if (hi.modelId === "VERBOS_DSI_FM_PERC") return "VERBOS_DSI_FM_PERC:";
  if (hi.modelId === "FM_MD_KICK") return "FM_MD_KICK:";
  if (hi.modelId === "FM_MD_SNARE") return "FM_MD_SNARE:";
  if (hi.modelId === "FM_MD_HAT") return "FM_MD_HAT:";
  return "default";
}

function applyHiPercPreset(
  actions: ReturnType<typeof usePercuProV1Store>["actions"],
  compositeId: string
): void {
  const [modelId, presetId] = compositeId.split(":") as [string, string];
  if (!presetId) return;

  if (modelId === "VERBOS_DSI_FM_PERC") {
    const preset = verbosDsiFmPercModel.presets.find((p) => p.id === presetId);
    if (preset) {
      actions.setHiPercInstrumentFull({
        modelId: "VERBOS_DSI_FM_PERC",
        presetId,
        color: preset.color,
        decay: preset.decay,
        drive: preset.drive,
        ratio: preset.ratio,
        tone: preset.tone,
        feedback: preset.feedback,
        fmMdPresetId: null,
        fmMdMacro1: 0.5,
        fmMdMacro2: 0.5,
        fmMdMacro3: 0.5,
      });
    }
    return;
  }

  if (modelId === "FM_MD_KICK") {
    const preset = fmMdKickModel.presets.find((p) => p.id === presetId) as
      | { id: string; pitch: number; punch: number; decay: number }
      | undefined;
    if (preset) {
      actions.setHiPercModel("FM_MD_KICK" as HiPercInstrumentState["modelId"]);
      actions.setHiPercFmMdPreset({
        presetId,
        m1: preset.pitch,
        m2: preset.punch,
        m3: preset.decay,
      });
    }
    return;
  }
  if (modelId === "FM_MD_SNARE") {
    const preset = fmMdSnareModel.presets.find((p) => p.id === presetId) as
      | { id: string; noiseMix: number; tone: number; snap: number }
      | undefined;
    if (preset) {
      actions.setHiPercModel("FM_MD_SNARE" as HiPercInstrumentState["modelId"]);
      actions.setHiPercFmMdPreset({
        presetId,
        m1: preset.noiseMix,
        m2: preset.tone,
        m3: preset.snap,
      });
    }
    return;
  }
  if (modelId === "FM_MD_HAT") {
    const preset = fmMdHatModel.presets.find((p) => p.id === presetId) as
      | { id: string; decay: number; tone: number; bright: number }
      | undefined;
    if (preset) {
      actions.setHiPercModel("FM_MD_HAT" as HiPercInstrumentState["modelId"]);
      actions.setHiPercFmMdPreset({
        presetId,
        m1: preset.decay,
        m2: preset.tone,
        m3: preset.bright,
      });
    }
  }
}

export const InstrumentControlsPanel: React.FC<InstrumentControlsPanelProps> = ({ selectedTrackId }) => {
  const { state, actions } = usePercuProV1Store();

  if (!selectedTrackId) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8 text-center border-t border-white/[0.03]">
        <span className="text-[10px] font-mono font-bold text-white/20 uppercase tracking-widest">
          Select an instrument
        </span>
        <span className="text-[9px] font-mono text-white/10 mt-2 block">
          Click a lane in the sequencer to show its controls here.
        </span>
      </div>
    );
  }

  const label = INSTRUMENT_LABELS[selectedTrackId];
  const Panel = PANEL_BY_TRACK[selectedTrackId];

  const hi = state.ui.hiPercInstrument;
  const presetsByTrack: Record<TrackId, InstrumentPresetOption[]> = {
    noise: NOISE_PRESETS_OPTIONS,
    hiPerc: HIPERC_PRESETS,
    lowPerc: LOW_PERC_PRESETS_OPTIONS,
    clap: CLAP_PRESETS_OPTIONS,
    chord: CHORD_PRESETS_OPTIONS,
    bass: BASS_PRESETS_OPTIONS,
    subPerc: SUB_PERC_PRESETS_OPTIONS,
    kick: KICK_PRESETS_OPTIONS,
  };
  const presets = presetsByTrack[selectedTrackId];
  const currentValue =
    selectedTrackId === "hiPerc" && hi
      ? getHiPercCurrentValue(hi)
      : selectedTrackId === "kick"
        ? (state.ui.kickInstrument?.presetId ?? "default")
        : selectedTrackId === "noise"
          ? (state.ui.noiseInstrument?.presetId ?? "default")
          : selectedTrackId === "lowPerc"
            ? (state.ui.lowPercInstrument?.presetId ?? "default")
            : selectedTrackId === "clap"
              ? (state.ui.clapInstrument?.presetId ?? "default")
              : selectedTrackId === "chord"
                ? (state.ui.chordInstrument?.presetId ?? "default")
                : selectedTrackId === "bass"
                  ? (state.ui.bassInstrument?.presetId ?? "default")
                  : selectedTrackId === "subPerc"
                    ? (state.ui.subPercInstrument?.presetId ?? "default")
                    : "default";
  const effectiveValue = presets.some((p) => p.id === currentValue) ? currentValue : presets[0]?.id ?? "default";

  const handlePresetSelect = (id: string) => {
    if (selectedTrackId === "hiPerc") {
      applyHiPercPreset(actions, id);
      return;
    }
    if (selectedTrackId === "kick") {
      const preset = KICK_PRESETS_DATA.find((p) => p.id === id);
      if (preset) actions.setKickInstrument({ presetId: preset.id, ...preset.params });
      return;
    }
    if (selectedTrackId === "noise") {
      const preset = NOISE_PRESETS_DATA.find((p) => p.id === id);
      if (preset) actions.setNoiseInstrument({ presetId: preset.id, ...preset.params });
      return;
    }
    if (selectedTrackId === "lowPerc") {
      const preset = LOW_PERC_PRESETS_DATA.find((p) => p.id === id);
      if (preset) actions.setLowPercInstrument({ presetId: preset.id, ...preset.params });
      return;
    }
    if (selectedTrackId === "clap") {
      const preset = CLAP_PRESETS_DATA.find((p) => p.id === id);
      if (preset) actions.setClapInstrument({ presetId: preset.id, ...preset.params });
      return;
    }
    if (selectedTrackId === "chord") {
      const preset = CHORD_PRESETS_DATA.find((p) => p.id === id);
      if (preset) actions.setChordInstrument({ presetId: preset.id, ...preset.params });
      return;
    }
    if (selectedTrackId === "bass") {
      const preset = BASS_PRESETS_DATA.find((p) => p.id === id);
      if (preset) actions.setBassInstrument({ presetId: preset.id, ...preset.params });
      return;
    }
    if (selectedTrackId === "subPerc") {
      const preset = SUB_PERC_PRESETS_DATA.find((p) => p.id === id);
      if (preset) actions.setSubPercInstrument({ presetId: preset.id, ...preset.params });
    }
  };

  return (
    <div className="flex flex-col border-t border-white/[0.03] bg-[#121212] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.02]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold font-sans uppercase tracking-widest text-[#E66000]">
              {label}
            </span>
            <span className="text-[8px] font-mono text-white/10 tracking-[0.2em] font-bold uppercase block mt-0.5">
              INSTRUMENT CONTROLS
            </span>
          </div>
          <InstrumentPresetDropdown
            presets={presets}
            value={effectiveValue}
            onSelect={handlePresetSelect}
            placeholder="Preset"
          />
        </div>
      </div>
      <div className="p-6 flex flex-col gap-8 overflow-y-auto">
        <Panel />
      </div>
    </div>
  );
};
