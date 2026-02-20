import { verbosDsiFmPercModel, type VerbosDsiFmPercModel } from "./instruments/verbosDsiFmPerc";

export type InstrumentModel = VerbosDsiFmPercModel;

export const INSTRUMENT_MODELS: InstrumentModel[] = [verbosDsiFmPercModel];

export function getModelById(id: string): InstrumentModel | undefined {
  return INSTRUMENT_MODELS.find((m) => m.id === id);
}
