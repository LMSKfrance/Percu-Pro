/**
 * MIDI In: transport receive (Start / Continue / Stop) and clock sync.
 * Listens on a selected MIDI input and invokes callbacks so the app can drive transport and BPM.
 */

let midiAccess: MIDIAccess | null = null;
let selectedInputId: string | null = null;
let inputDevice: MIDIInput | null = null;

export function setMidiAccess(access: MIDIAccess | null): void {
  if (inputDevice) {
    inputDevice.onmidimessage = null;
    inputDevice = null;
  }
  midiAccess = access;
  if (access) {
    access.onstatechange = () => {
      if (inputDevice && inputDevice.id === selectedInputId) {
        const found = Array.from(midiAccess!.inputs.values()).find((i) => i.id === selectedInputId);
        if (!found) inputDevice = null;
      }
    };
  }
  if (selectedInputId && midiAccess) {
    const input = midiAccess.inputs.get(selectedInputId);
    if (input) {
      inputDevice = input;
      inputDevice.onmidimessage = (e: MIDIMessageEvent) => e.data && handleMessage(e.data);
    }
  }
}

export type TransportReceiveCallbacks = {
  onStart: () => void;
  onContinue: () => void;
  onStop: () => void;
  onClock: () => void;
  onBpmFromClock?: (bpm: number) => void;
};

let callbacks: TransportReceiveCallbacks | null = null;

const MIDI_CLOCK = 0xf8;
const MIDI_START = 0xfa;
const MIDI_CONTINUE = 0xfb;
const MIDI_STOP = 0xfc;

const CLOCKS_PER_BEAT = 24;
const MIN_BPM = 20;
const MAX_BPM = 300;

let lastClockTime = 0;
let clockCount = 0;
let inferredBpm = 120;

export function isMidiInSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.requestMIDIAccess;
}

export async function requestMidiInAccess(): Promise<boolean> {
  if (!isMidiInSupported()) return false;
  try {
    const access = await navigator.requestMIDIAccess({ sysex: false });
    setMidiAccess(access);
    if (selectedInputId) selectInput(selectedInputId);
    return true;
  } catch {
    return false;
  }
}

export function getInputs(): Array<{ id: string; name: string; manufacturer: string }> {
  if (!midiAccess) return [];
  return Array.from(midiAccess.inputs.values()).map((i) => ({
    id: i.id,
    name: i.name ?? i.id,
    manufacturer: (i as unknown as { manufacturer?: string }).manufacturer ?? "",
  }));
}

export function setTransportCallbacks(cb: TransportReceiveCallbacks | null): void {
  callbacks = cb;
}

function handleMessage(data: Uint8Array): void {
  if (data.length === 0) return;
  const status = data[0];
  if (status === MIDI_START) {
    callbacks?.onStart();
    clockCount = 0;
    lastClockTime = performance.now();
    return;
  }
  if (status === MIDI_CONTINUE) {
    callbacks?.onContinue();
    clockCount = 0;
    lastClockTime = performance.now();
    return;
  }
  if (status === MIDI_STOP) {
    callbacks?.onStop();
    return;
  }
  if (status === MIDI_CLOCK) {
    callbacks?.onClock();
    const now = performance.now();
    if (lastClockTime > 0) {
      clockCount++;
      if (clockCount >= CLOCKS_PER_BEAT) {
        const deltaSec = (now - lastClockTime) / 1000;
        if (deltaSec > 0) {
          const bpm = 60 / deltaSec;
          inferredBpm = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(bpm)));
          callbacks?.onBpmFromClock?.(inferredBpm);
        }
        clockCount = 0;
        lastClockTime = now;
      }
    } else {
      lastClockTime = now;
      clockCount = 0;
    }
    return;
  }
}

export function selectInput(id: string | null): void {
  if (inputDevice) {
    inputDevice.onmidimessage = null;
    inputDevice = null;
  }
  selectedInputId = id;
  if (!midiAccess || !id) return;
  const input = midiAccess.inputs.get(id);
  if (!input) return;
  inputDevice = input;
  inputDevice.onmidimessage = (e: MIDIMessageEvent) => {
    if (e.data) handleMessage(e.data);
  };
}

export function getSelectedInputId(): string | null {
  return selectedInputId;
}
