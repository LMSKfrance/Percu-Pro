import { verbosDsiFmPercModel, type VerbosDsiFmPercModel } from "./instruments/verbosDsiFmPerc";
import { fmMdKickModel, type FmMdKickModel } from "./instruments/fmMdKick";
import { fmMdSnareModel, type FmMdSnareModel } from "./instruments/fmMdSnare";
import { fmMdHatModel, type FmMdHatModel } from "./instruments/fmMdHat";

export type InstrumentModel = VerbosDsiFmPercModel | FmMdKickModel | FmMdSnareModel | FmMdHatModel;

export const INSTRUMENT_MODELS: InstrumentModel[] = [verbosDsiFmPercModel, fmMdKickModel, fmMdSnareModel, fmMdHatModel];

export function getModelById(id: string): InstrumentModel | undefined {
  return INSTRUMENT_MODELS.find((m) => m.id === id);
}
