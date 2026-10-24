import {NextRequest,NextResponse} from 'next/server';
import {apiGuard} from '@/lib/auth';import {one,rows} from '@/lib/db';import {bad,failed,field,pageParams} from '@/lib/http';
export async function GET(req:NextRequest){const g=apiGuard(req);if(g)return g;try{
 const {page,pageSize,offset}=pageParams(req.url,40);const q=(new URL(req.url).searchParams.get('q')||'').trim();if(q.length>150)return bad('搜索关键词过长');
 const term='%'+q.replace(/[!%_]/g,m=>'!'+m)+'%';
 const [clients,total]=await Promise.all([
  rows(`SELECT c.*, (SELECT count(*)::int FROM opportunities o WHERE o.client_id=c.id) AS opportunities_count FROM clients c WHERE ($1='' OR c.name ILIKE $2 ESCAPE '!' OR c.industry ILIKE $2 ESCAPE '!') ORDER BY c.updated_at DESC,c.id DESC LIMIT $3 OFFSET $4`,[q,term,pageSize,offset]),
  one<{total:number}>(`SELECT count(*)::int AS total FROM clients c WHERE ($1='' OR c.name ILIKE $2 ESCAPE '!' OR c.industry ILIKE $2 ESCAPE '!')`,[q,term])
 ]);
 return NextResponse.json({clients,pagination:{page,pageSize,total:total?.total||0}});
}catch(e){return failed(e)}}
export async function POST(req:NextRequest){const g=apiGuard(req);if(g)return g;try{
 const data=await req.json();const name=field(data.name,160);if(!name)return bad('客户名称不能为空');
 const client=await one(`INSERT INTO clients(name,industry,background,status) VALUES($1,$2,$3,'培育中') RETURNING *`,[name,field(data.industry,160),field(data.background,5000)]);
 return NextResponse.json({client},{status:201});
}catch(e){return failed(e)}}
