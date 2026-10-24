import {NextRequest,NextResponse} from 'next/server';
import {apiGuard} from '@/lib/auth';import {one,rows} from '@/lib/db';import {bad,failed,field,validUuid} from '@/lib/http';
type Context={params:Promise<{id:string}>};
export async function GET(req:NextRequest,ctx:Context){const g=apiGuard(req);if(g)return g;try{
 const {id}=await ctx.params;if(!validUuid(id))return bad('无效客户ID');
 const sp=new URL(req.url).searchParams;const p=Number(sp.get('page')||'1'),page=Number.isSafeInteger(p)?Math.max(1,Math.min(100000,p)):1,size=30,offset=(page-1)*size;
 const client=await one(`SELECT * FROM clients WHERE id=$1`,[id]);if(!client)return bad('客户不存在',404);
 const [opportunities,communications,total,analyses,actions]=await Promise.all([
  rows(`SELECT * FROM opportunities WHERE client_id=$1 ORDER BY updated_at DESC`,[id]),
  rows(`SELECT id,client_id,opportunity_id,channel,happened_at,summary,left(raw_content,1600) AS raw_preview,length(raw_content) AS raw_length FROM communications WHERE client_id=$1 ORDER BY happened_at DESC,id DESC LIMIT $2 OFFSET $3`,[id,size,offset]),
  one<{total:number}>(`SELECT count(*)::int AS total FROM communications WHERE client_id=$1`,[id]),
  rows(`SELECT a.* FROM analyses a JOIN communications c ON c.id=a.communication_id WHERE c.client_id=$1 ORDER BY a.created_at DESC LIMIT $2 OFFSET $3`,[id,size,offset]),
  rows(`SELECT i.*,v.observed_behavior,v.business_outcome,v.capability_outcome,v.followup_communication_id,v.created_at AS validated_at FROM action_items i JOIN communications c ON c.id=i.communication_id LEFT JOIN LATERAL (SELECT * FROM validations v WHERE v.action_id=i.id ORDER BY v.created_at DESC LIMIT 1)v ON true WHERE c.client_id=$1 ORDER BY i.created_at DESC LIMIT $2 OFFSET $3`,[id,size,offset])
 ]);
 return NextResponse.json({client,opportunities,communications,analyses,actions,pagination:{page,pageSize:size,total:total?.total||0},note:'沟通正文请通过GET /api/communications?id=...单独读取；分析及行动列表也采用分页。'});
}catch(e){return failed(e)}}
export async function PATCH(req:NextRequest,ctx:Context){const g=apiGuard(req);if(g)return g;try{
 const {id}=await ctx.params;if(!validUuid(id))return bad('无效客户ID');const b=await req.json();
 const client=await one(`UPDATE clients SET name=COALESCE($2,name),industry=COALESCE($3,industry),background=COALESCE($4,background),next_action=COALESCE($5,next_action),updated_at=now() WHERE id=$1 RETURNING *`,[
 id,typeof b.name==='string'?field(b.name,160)||null:null,typeof b.industry==='string'?field(b.industry,160):null,typeof b.background==='string'?field(b.background,7000):null,typeof b.next_action==='string'?field(b.next_action,1200):null]);
 if(!client)return bad('客户不存在',404);return NextResponse.json({client});
}catch(e){return failed(e)}}
