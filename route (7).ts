import {NextRequest,NextResponse} from 'next/server';import {apiGuard} from '@/lib/auth';import {one,rows,transaction} from '@/lib/db';import {bad,failed,validUuid} from '@/lib/http';
import {analyzeCommunication} from '@/lib/ai';
export const maxDuration=60;
export async function POST(req:NextRequest){const g=apiGuard(req);if(g)return g;try{
 const b=await req.json(),id=b.communicationId,focus=b.focus;
 if(!validUuid(id)||!['business','person','both'].includes(focus))return bad('请选择沟通及分析目的');
 const comm=await one<{id:string;client_id:string;opportunity_id:string|null;raw_content:string;name:string;happened_at:string;created_at:string;}> (
 `SELECT c.id,c.client_id,c.opportunity_id,c.raw_content,c.happened_at,c.created_at,cl.name FROM communications c JOIN clients cl ON cl.id=c.client_id WHERE c.id=$1`,[id]);
 if(!comm)return bad('沟通记录不存在',404);
 if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:'AI_NOT_CONFIGURED',message:'尚未配置真实AI模型密钥。沟通记录已独立保存，可稍后分析。'},{status:503});
 // 时间边界：分析历史记录时不能把之后发生的沟通当成当时已知事实。
 const history=await rows(`SELECT happened_at, CASE WHEN length(raw_content)>6500 THEN left(raw_content,6500) || '【此条历史材料仅提供部分摘要，非全文】' ELSE raw_content END AS historical_excerpt
 FROM communications WHERE client_id=$1 AND id<>$2 AND (happened_at<$3 OR (happened_at=$3 AND created_at<$4))
 ORDER BY happened_at DESC,created_at DESC LIMIT 8`,[comm.client_id,id,comm.happened_at,comm.created_at]);
 const liveOpp=comm.opportunity_id?await one<{stage:string;status:string;next_action:string;stage_evidence:string;updated_at:Date}>(`SELECT stage,status,next_action,stage_evidence,updated_at FROM opportunities WHERE id=$1`,[comm.opportunity_id]):null;
 // 如果商机记录在被分析的历史沟通之后更新过，不能作为当时已知的阶段快照。
 const opp=liveOpp&&new Date(liveOpp.updated_at)<=new Date(comm.happened_at)?liveOpp:null;
 const output=await analyzeCommunication({focus,client:comm.name,content:comm.raw_content,history,opportunity:opp});
 const result=await transaction(async c=>{const {rows:[analysis]}=await c.query(`INSERT INTO analyses(communication_id,focus,business_summary,stage_suggestion,stage_evidence,ability_dimension,ability_observation,ability_evidence,external_constraints,business_action,training_action,confidence,limitations)
 VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13) RETURNING *`,[
 id,focus,output.businessSummary,output.stageSuggestion,JSON.stringify(output.stageEvidence),output.abilityDimension,output.abilityObservation,JSON.stringify(output.abilityEvidence),JSON.stringify(output.externalConstraints),output.businessAction,output.trainingAction,output.confidence,output.limitations]);
 if(analysis&&focus!=='business'&&output.abilityDimension&&output.abilityObservation&&output.abilityEvidence.length){
  await c.query(`INSERT INTO ability_observations(analysis_id,communication_id,dimension,observation,evidence,state) VALUES($1,$2,$3,$4,$5::jsonb,'候选待核实') ON CONFLICT (analysis_id) DO NOTHING`,[analysis.id,id,output.abilityDimension,output.abilityObservation,JSON.stringify(output.abilityEvidence)]);
 }
 return analysis;});
 return NextResponse.json({analysis:result},{status:201});
}catch(e){return failed(e)}}
