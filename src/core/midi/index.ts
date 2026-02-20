/**
 * MIDI: out (notes + transport send), in (transport receive + clock sync).
 * Call initMidi() once (e.g. on app load or user gesture) to request Web MIDI access.
 */

import * as midiOut from "./midiOut";
import * as midiIn from "./midiIn";

export type { StepTriggerPayload, StepTriggerCallback, MidiPortInfo, MidiSyncMode } from "./types";
export type { TransportReceiveCallbacks } from "./midiIn";

export const isMidiSupported = midiOut.isMidiSupported;

/** Request Web MIDI access once; enables both inputs and outputs. */
export async function initMidi(): Promise<boolean> {
  if (!midiOut.isMidiSupported()) return false;
  try {
    const access = await navigator.requestMIDIAccess({ sysex: false });
    midiOut.setMidiAccess(access);
    midiIn.setMidiAccess(access);
    return true;
  } catch {
    return false;
  }
}

// --- Out ---
export const getOutputs = midiOut.getOutputs;
export const selectOutput = midiOut.selectOutput;
export const getSelectedOutputId = midiOut.getSelectedOutputId;
export const sendStepTrigger = midiOut.sendStepTrigger;
export const sendTransportStart = midiOut.sendTransportStart;
export const sendTransportContinue = midiOut.sendTransportContinue;
export const sendTransportStop = midiOut.sendTransportStop;
export const setTransportBpm = midiOut.setTransportBpm;

// --- In ---
export const getInputs = midiIn.getInputs;
export const selectInput = midiIn.selectInput;
export const getSelectedInputId = midiIn.getSelectedInputId;
export const setTransportCallbacks = midiIn.setTransportCallbacks;
