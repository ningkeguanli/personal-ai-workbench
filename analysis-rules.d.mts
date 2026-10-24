export type AnalysisOutput = {
 businessSummary:string;stageSuggestion:string;stageEvidence:string[];
 abilityDimension:string;abilityObservation:string;abilityEvidence:string[];
 externalConstraints:string[];businessAction:string;trainingAction:string;
 confidence:'证据充分'|'证据有限'|'不足以判断';limitations:string;
};
export function validateAnalysis(value:unknown):AnalysisOutput;
export function normalizeOutcome(v:unknown):string;
export function canPromoteStage(a:{confirmed:boolean;hasEvidence:boolean}):boolean;
