// 业务和能力结果必须分开；不根据客户成交与否推断个人能力。
export function validateAnalysis(a){
  if(!a||typeof a!=='object'||Array.isArray(a))throw new Error('分析结果必须为对象');
  const str=(v,max=4000)=>typeof v==='string'?v.slice(0,max).trim():'';
  const list=v=>Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,8).map(x=>x.slice(0,650)):[];
  return {
    businessSummary:str(a.businessSummary),stageSuggestion:str(a.stageSuggestion,160),stageEvidence:list(a.stageEvidence),
    abilityDimension:str(a.abilityDimension,150),abilityObservation:str(a.abilityObservation),abilityEvidence:list(a.abilityEvidence),
    externalConstraints:list(a.externalConstraints),businessAction:str(a.businessAction,1000),trainingAction:str(a.trainingAction,1000),
    confidence:['证据充分','证据有限','不足以判断'].includes(a.confidence)?a.confidence:'不足以判断',limitations:str(a.limitations,1000)
  };
}
export function normalizeOutcome(v){return ['行为已实践并观察到有效反馈','行为已实践但效果未确认','未实践','暂无新证据'].includes(v)?v:'暂无新证据'}
export function canPromoteStage({confirmed,hasEvidence}){return confirmed===true&&hasEvidence===true}
