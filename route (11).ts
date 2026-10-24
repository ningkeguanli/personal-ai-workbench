import {NextRequest,NextResponse} from 'next/server';import {apiGuard} from '@/lib/auth';import {one} from '@/lib/db';import {bad,failed,field,validUuid} from '@/lib/http';
export async function POST(req:NextRequest){const g=apiGuard(req);if(g)return g;try{
 const b=await req.json(),title=field(b.title,400);if(!title)return bad('任务名称不能为空');
 for(const id of [b.clientId,b.projectId,b.opportunityId])if(id&&!validUuid(id))return bad('关联对象ID不正确');
 let effectiveClientId=b.clientId||null,effectiveOpportunityId=b.opportunityId||null;
 if(b.projectId){
  const project=await one<{id:string;client_id:string|null;opportunity_id:string|null}>(`SELECT id,client_id,opportunity_id FROM projects WHERE id=$1`,[b.projectId]);
  if(!project)return bad('关联项目不存在');
  if(project.client_id&&effectiveClientId&&project.client_id!==effectiveClientId)return bad('项目不属于所选客户');
  if(project.opportunity_id&&effectiveOpportunityId&&project.opportunity_id!==effectiveOpportunityId)return bad('项目不属于所选商机');
  effectiveClientId=project.client_id||effectiveClientId;
  effectiveOpportunityId=project.opportunity_id||effectiveOpportunityId;
 }
 if(effectiveClientId){const client=await one(`SELECT id FROM clients WHERE id=$1`,[effectiveClientId]);if(!client)return bad('关联客户不存在');}
 if(effectiveOpportunityId){const opp=await one<{client_id:string}>(`SELECT client_id FROM opportunities WHERE id=$1`,[effectiveOpportunityId]);if(!opp)return bad('关联商机不存在');if(!effectiveClientId||opp.client_id!==effectiveClientId)return bad('商机与客户不匹配');}
 const task=await one(`INSERT INTO tasks(title,kind,client_id,project_id,opportunity_id,due_date) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[
  title,b.kind==='训练'?'训练':'业务',effectiveClientId,b.projectId||null,effectiveOpportunityId,/^\d{4}-\d{2}-\d{2}$/.test(b.dueDate)?b.dueDate:null]);
 return NextResponse.json({task},{status:201});
}catch(e){return failed(e)}}
