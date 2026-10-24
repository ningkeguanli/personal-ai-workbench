import {NextRequest,NextResponse} from 'next/server';
import {apiGuard} from '@/lib/auth';import {transaction} from '@/lib/db';
import {bad,failed,field,validUuid} from '@/lib/http';import {eligibleFollowup} from '@/lib/input-rules.mjs';
export async function POST(req:NextRequest){const g=apiGuard(req);if(g)return g;try{
 const b=await req.json();if(!validUuid(b.actionId)||!validUuid(b.followupCommunicationId))return bad('请选择待验证行动及后续沟通');
 const observed=field(b.observedBehavior,5000,'实际观察');if(!observed)return bad('请填写实际观察到的行为或反馈');
 const allowed=['行为已实践并观察到有效反馈','行为已实践但效果未确认','未实践','暂无新证据'];
 const outcome=allowed.includes(b.capabilityOutcome)?b.capabilityOutcome:'暂无新证据';
 const saved=await transaction(async c=>{
  const {rows:[action]}=await c.query(`SELECT a.id,a.kind,a.communication_id,a.status,source.client_id,source.opportunity_id,source.happened_at AS source_time
   FROM action_items a JOIN communications source ON source.id=a.communication_id WHERE a.id=$1 FOR UPDATE OF a`,[b.actionId]);
  if(!action)return {error:'未找到对应行动',status:404};
  const {rows:[follow]}=await c.query(`SELECT id,client_id,opportunity_id,happened_at FROM communications WHERE id=$1`,[b.followupCommunicationId]);
  if(!eligibleFollowup(action,follow))
    return {error:'后续沟通必须属于同一客户、发生在原沟通之后，且不能关联其他商机',status:422};
  const {rows:[validation]}=await c.query(`INSERT INTO validations(action_id,followup_communication_id,observed_behavior,business_outcome,capability_outcome)
   VALUES($1,$2,$3,$4,$5) RETURNING *`,[b.actionId,follow.id,observed,field(b.businessOutcome,4000,'业务结果'),outcome]);
  await c.query(`UPDATE action_items SET status='已有反馈' WHERE id=$1`,[b.actionId]);
  if(action.kind==='training'){
   // 重复补录时，以实际后续沟通时间而非验证填写时间判断最新状态。候选观察不会被训练记录擅自采纳。
   // “暂无新证据”仅记录反馈，不撤销以前的有效行为观察。
   // 对多次迟录的记录，按真实沟通发生时间确定最近的一条有信息量的反馈。
   const {rows:[latest]}=await c.query(`SELECT v.capability_outcome FROM validations v JOIN communications follow ON follow.id=v.followup_communication_id
    WHERE v.action_id=$1 AND v.capability_outcome IN ('行为已实践并观察到有效反馈','行为已实践但效果未确认','未实践')
    ORDER BY follow.happened_at DESC,v.created_at DESC,v.id DESC LIMIT 1`,[b.actionId]);
   if(latest){
    const newState=latest.capability_outcome==='行为已实践并观察到有效反馈'?'单次正向证据':latest.capability_outcome==='行为已实践但效果未确认'?'已实践待验证':'训练待实践';
    await c.query(`UPDATE ability_observations SET state=$2,updated_at=now() WHERE analysis_id=(SELECT analysis_id FROM action_items WHERE id=$1) AND state<>'候选待核实'`,[b.actionId,newState]);
   }
  }
  return {validation};
 });
 if('error' in saved)return NextResponse.json(saved,{status:saved.status});
 return NextResponse.json(saved,{status:201});
}catch(e){return failed(e)}}

export async function GET(req:NextRequest){const g=apiGuard(req);if(g)return g;try{
 const search=new URL(req.url).searchParams;const id=search.get('actionId');if(!validUuid(id))return bad('行动ID不正确');
 const raw=Number(search.get('page')||'1'),page=Number.isSafeInteger(raw)?Math.max(1,Math.min(100000,raw)):1,pageSize=40;
 const {rows:results}=await transaction(async c=>c.query(`SELECT follow.id,follow.happened_at,follow.channel,follow.opportunity_id
  FROM action_items a JOIN communications src ON src.id=a.communication_id
  JOIN communications follow ON follow.client_id=src.client_id AND follow.happened_at>src.happened_at
  AND (src.opportunity_id IS NULL OR follow.opportunity_id IS NULL OR follow.opportunity_id=src.opportunity_id)
  WHERE a.id=$1 ORDER BY follow.happened_at DESC,follow.id DESC LIMIT $2 OFFSET $3`,[id,pageSize+1,(page-1)*pageSize]));
 return NextResponse.json({communications:results.slice(0,pageSize),page,hasMore:results.length>pageSize});
}catch(e){return failed(e)}}
