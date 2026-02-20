/**
 * Groove facade: generation, mutation, apply groove, export. No React.
 */

export { generatePattern } from "./generatePattern";
export type { GenerateControls, GenerateScope, PercuStyleDerived } from "./generatePattern";
export { computePercuStyleDerived, percuStyleBarSeed, cityToDetroitBerlin } from "./generatePattern";
export { mutatePattern as mutatePatternEngine } from "./mutatePattern";
export { applyGroove } from "./applyGroove";
export type { ApplyGrooveParams } from "./applyGroove";
export { enginePatternToStorePattern, storePatternToChannelStates } from "./mapToStore";
export { setGrooveBridge, onGrooveButtonPressed, setSwing, setGrooveTemplate, regeneratePattern, mutatePattern } from "./uiContract";
export type { GrooveScope, GrooveButtonContext, GrooveBridge } from "./uiContract";
export { getGrooveTemplate, GROOVE_TEMPLATES, getDefaultGrooveTemplateId } from "./grooveTemplates";
export type { ProjectState, ChannelState, StepState, PatternState, GrooveTemplate, AvatarProfile } from "./types";
export { exportPercuPayload } from "./exportPercuPayload";
export type { PercuGroovePayload, ExportOptions } from "./exportPercuPayload";
export { getRoleCaps, ROLE_CAPS, HUKABY_BIAS, DEFAULT_TASTE_CONTROLS } from "./taste";
export type { RoleCaps } from "./taste";
export { hashEnginePatternState, hashStorePatternState } from "./hashPatternState";
