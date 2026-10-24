import {NextRequest,NextResponse} from 'next/server';
import {apiGuard} from '@/lib/auth';
import {transaction} from '@/lib/db';
import {bad,failed,field,validUuid} from '@/lib/http';
type Context={params:Promise<{id:string}>};

// 一次分析可分别采纳业务行动、个人训练与能力观察；同一项不得重复建任务。
export async function POST(req:NextRequest,ctx:Context){
 const guarded=apiGuard(req);if(guarded)return guarded;
 try{
  const {id}=await ctx.params;if(!validUuid(id))return bad('分析ID不正确');
  const body=await req.json();
  const includeBusiness=body.includeBusiness===true;
  const includeTraining=body.includeTraining===true;
  const includeObservation=body.includeObservation===true;
  if(!includeBusiness&&!includeTraining&&!includeObservation)return bad('请至少选择一项建议，或保留为待确认',422);
  const result=await transaction(async c=>{
   const {rows:[analysis]}=await c.query(`SELECT a.*,com.client_id,com.opportunity_id
    FROM analyses a JOIN communications com ON com.id=a.communication_id
    WHERE a.id=$1 FOR UPDATE OF a`,[id]);
   if(!analysis)return {error:'分析不存在',status:404};
   if(analysis.status==='rejected')return {error:'已拒绝的分析不能再采纳',status:409};
   if(includeObservation&&(!analysis.ability_dimension||!analysis.ability_observation||
     !Array.isArray(analysis.ability_evidence)||!analysis.ability_evidence.length))
    return {error:'没有足够证据保存能力观察',status:422};
   const choices=[
    ['business',includeBusiness,field(body.businessTitle,1200)||analysis.business_action],
    ['training',includeTraining,field(body.trainingTitle,1200)||analysis.training_action]
   ] as const;
   // 先验证所有待采纳内容，避免前一个任务已写入、后一个却因空内容失败。
   if(choices.some(([,selected,title])=>selected&&(!title||!title.trim())))
    return {error:'所选行动内容不能为空',status:422};
   const addedKinds:string[]=[];
   for(const [kind,selected,title] of choices){
    if(!selected)continue;
    const {rows:[existing]}=await c.query(`SELECT id FROM action_items WHERE analysis_id=$1 AND kind=$2`,[id,kind]);
    if(existing)continue;
    const {rows:[task]}=await c.query(`INSERT INTO tasks(title,kind,client_id,opportunity_id)
     VALUES($1,$2,$3,$4) RETURNING id`,[
     title,kind==='training'?'训练':'业务',analysis.client_id,analysis.opportunity_id]);
    await c.query(`INSERT INTO action_items(analysis_id,communication_id,task_id,kind,title)
     VALUES($1,$2,$3,$4,$5)`,[id,analysis.communication_id,task.id,kind,title]);
    addedKinds.push(kind);
   }
   if(includeObservation){
    await c.query(`INSERT INTO ability_observations(analysis_id,communication_id,dimension,observation,evidence,state)
     VALUES($1,$2,$3,$4,$5::jsonb,'已采纳待验证')
     ON CONFLICT (analysis_id) DO UPDATE SET state=CASE
     WHEN ability_observations.state='候选待核实' THEN '已采纳待验证'
     ELSE ability_observations.state END,updated_at=now()`,[
     id,analysis.communication_id,analysis.ability_dimension,analysis.ability_observation,JSON.stringify(analysis.ability_evidence)]);
   }
   if(analysis.status!=='accepted')await c.query(`UPDATE analyses SET status='accepted' WHERE id=$1`,[id]);
   return {ok:true,already:analysis.status==='accepted'&&addedKinds.length===0,addedKinds,observationApplied:includeObservation};
  });
  if('error'in result)return NextResponse.json(result,{status:result.status});
  return NextResponse.json(result);
 }catch(error){return failed(error)}
}
