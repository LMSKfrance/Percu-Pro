import { verbosDsiFmPercModel, type VerbosDsiFmPercModel } from "./instruments/verbosDsiFmPerc";
import { fmMdKickModel, type FmMdKickModel } from "./instruments/fmMdKick";
import { fmMdSnareModel, type FmMdSnareModel } from "./instruments/fmMdSnare";

export type InstrumentModel = VerbosDsiFmPercModel | FmMdKickModel | FmMdSnareModel;

export const INSTRUMENT_MODELS: InstrumentModel[] = [verbosDsiFmPercModel, fmMdKickModel, fmMdSnareModel];

export function getModelById(id: string): InstrumentModel | undefined {
  return INSTRUMENT_MODELS.find((m) => m.id === id);
}
