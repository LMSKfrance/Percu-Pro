import { verbosDsiFmPercModel, type VerbosDsiFmPercModel } from "./instruments/verbosDsiFmPerc";
import { fmMdKickModel, type FmMdKickModel } from "./instruments/fmMdKick";

export type InstrumentModel = VerbosDsiFmPercModel | FmMdKickModel;

export const INSTRUMENT_MODELS: InstrumentModel[] = [verbosDsiFmPercModel, fmMdKickModel];

export function getModelById(id: string): InstrumentModel | undefined {
  return INSTRUMENT_MODELS.find((m) => m.id === id);
}
