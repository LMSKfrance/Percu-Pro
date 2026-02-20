/**
 * MIDI Out: Web MIDI API output, note mapping, transport send (Start/Stop/Continue, Clock).
 */

import type { TrackId } from "../types";
import type { StepTriggerPayload } from "./types";

const MIDI_CHANNEL_DRUMS = 9; // 0-based; channel 10 in 1-based
const NOTE_OFF_MS = 80;

/** GM-style drum notes per track (channel 10) */
const TRACK_BASE_NOTE: Record<TrackId, number> = {
  kick: 36,
  subPerc: 37,
  clap: 39,
  noise: 42,   // closed hi-hat
  lowPerc: 45,
  hiPerc: 47,
  chord: 60,   // C4 for chord stab
  bass: 48,    // C3 for bass, + pitch
};

let midiAccess: MIDIAccess | null = null;
let selectedOutputId: string | null = null;
let outputDevice: MIDIOutput | null = null;

export function setMidiAccess(access: MIDIAccess | null): void {
  midiAccess = access;
  if (access) {
    access.onstatechange = () => {
      if (outputDevice && selectedOutputId) {
        const found = Array.from(midiAccess!.outputs.values()).find((o) => o.id === selectedOutputId);
        if (!found) outputDevice = null;
      }
    };
  }
  if (selectedOutputId && midiAccess) outputDevice = midiAccess.outputs.get(selectedOutputId) ?? null;
  else outputDevice = null;
}

export function isMidiSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.requestMIDIAccess;
}

export async function requestMidiAccess(): Promise<boolean> {
  if (!isMidiSupported()) return false;
  try {
    const access = await navigator.requestMIDIAccess({ sysex: false });
    setMidiAccess(access);
    if (selectedOutputId) selectOutput(selectedOutputId);
    return true;
  } catch {
    return false;
  }
}

export function getOutputs(): Array<{ id: string; name: string; manufacturer: string }> {
  if (!midiAccess) return [];
  return Array.from(midiAccess.outputs.values()).map((o) => ({
    id: o.id,
    name: o.name ?? o.id,
    manufacturer: (o as unknown as { manufacturer?: string }).manufacturer ?? "",
  }));
}

export function selectOutput(id: string | null): void {
  selectedOutputId = id;
  if (!midiAccess) {
    outputDevice = null;
    return;
  }
  if (!id) {
    outputDevice = null;
    return;
  }
  outputDevice = midiAccess.outputs.get(id) ?? null;
}

export function getSelectedOutputId(): string | null {
  return selectedOutputId;
}

function send(data: number[]): void {
  if (!outputDevice) return;
  try {
    outputDevice.send(data);
  } catch {
    // port may be disconnected
  }
}

/** Velocity 0..1 -> 1..127 */
function toMidiVelocity(v: number): number {
  return Math.max(1, Math.min(127, Math.round(v * 127)));
}

/** Send note on; caller should schedule note off after NOTE_OFF_MS */
export function sendNoteOn(channel: number, note: number, velocity: number): void {
  send([0x90 | (channel & 0x0f), note & 0x7f, toMidiVelocity(velocity)]);
}

export function sendNoteOff(channel: number, note: number): void {
  send([0x80 | (channel & 0x0f), note & 0x7f, 0]);
}

/** Map track + pitch to MIDI note (channel 10). */
function getNoteForTrack(laneId: TrackId, pitchSemitones: number): number {
  const base = TRACK_BASE_NOTE[laneId] ?? 60;
  const note = base + (pitchSemitones ?? 0);
  return Math.max(0, Math.min(127, Math.round(note)));
}

/** Called from audio engine when a step triggers; sends MIDI note on and schedules note off. */
export function sendStepTrigger(payload: StepTriggerPayload): void {
  if (!outputDevice) return;
  const note = getNoteForTrack(payload.laneId, payload.pitchSemitones);
  const vel = payload.velocity;
  sendNoteOn(MIDI_CHANNEL_DRUMS, note, payload.accent ? Math.min(1, vel * 1.2) : vel);
  setTimeout(() => {
    sendNoteOff(MIDI_CHANNEL_DRUMS, note);
  }, NOTE_OFF_MS);
}

// --- Transport send (Master) ---

const MIDI_CLOCK = 0xf8;
const MIDI_START = 0xfa;
const MIDI_CONTINUE = 0xfb;
const MIDI_STOP = 0xfc;

let clockIntervalId: ReturnType<typeof setInterval> | null = null;
let clockBpm = 120;

export function sendTransportStart(): void {
  send([MIDI_START]);
  startClock();
}

export function sendTransportContinue(): void {
  send([MIDI_CONTINUE]);
  startClock();
}

export function sendTransportStop(): void {
  stopClock();
  send([MIDI_STOP]);
}

function startClock(): void {
  stopClock();
  const msPerClock = (60 / clockBpm) * 1000 / 24;
  clockIntervalId = setInterval(() => send([MIDI_CLOCK]), msPerClock);
}

function stopClock(): void {
  if (clockIntervalId !== null) {
    clearInterval(clockIntervalId);
    clockIntervalId = null;
  }
}

export function setTransportBpm(bpm: number): void {
  clockBpm = Math.max(20, Math.min(300, bpm));
  if (clockIntervalId !== null) startClock();
}
