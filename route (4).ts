import {NextRequest,NextResponse} from 'next/server';import {apiGuard} from '@/lib/auth';import {one,rows} from '@/lib/db';import {bad,failed,field,pageParams,validUuid} from '@/lib/http';
export async function GET(req:NextRequest){const g=apiGuard(req);if(g)return g;try{
 const {page,pageSize,offset}=pageParams(req.url,40);const q=(new URL(req.url).searchParams.get('q')||'').trim();if(q.length>150)return bad('搜索关键词过长');
 const term='%'+q.replace(/[!%_]/g,m=>'!'+m)+'%';
 const [projects,total]=await Promise.all([
  rows(`SELECT p.*,v.label AS current_version,c.name AS client_name FROM projects p LEFT JOIN project_versions v ON v.id=p.current_version_id LEFT JOIN clients c ON c.id=p.client_id WHERE ($1='' OR p.title ILIKE $2 ESCAPE '!') ORDER BY p.updated_at DESC,p.id DESC LIMIT $3 OFFSET $4`,[q,term,pageSize,offset]),
  one<{total:number}>(`SELECT count(*)::int AS total FROM projects WHERE ($1='' OR title ILIKE $2 ESCAPE '!')`,[q,term])]);
 return NextResponse.json({projects,pagination:{page,pageSize,total:total?.total||0}});
}catch(e){return failed(e)}}
export async function POST(req:NextRequest){const g=apiGuard(req);if(g)return g;try{
 const b=await req.json(),title=field(b.title,200);if(!title)return bad('项目名称不能为空');
 if(b.clientId&&!validUuid(b.clientId))return bad('客户ID不正确');if(b.opportunityId&&!validUuid(b.opportunityId))return bad('商机ID不正确');
 if(b.opportunityId){if(!b.clientId)return bad('关联商机时必须选择客户');const opp=await one(`SELECT id FROM opportunities WHERE id=$1 AND client_id=$2`,[b.opportunityId,b.clientId]);if(!opp)return bad('商机与客户不匹配');}
 if(b.clientId){const client=await one(`SELECT id FROM clients WHERE id=$1`,[b.clientId]);if(!client)return bad('关联客户不存在');}
 const project=await one(`INSERT INTO projects(title,kind,summary,next_action,client_id,opportunity_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[title,field(b.kind,100)||'长期项目',field(b.summary,5000),field(b.nextAction,1200),b.clientId||null,b.opportunityId||null]);
 return NextResponse.json({project},{status:201});
}catch(e){return failed(e)}}
