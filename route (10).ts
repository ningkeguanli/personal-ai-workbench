import {NextRequest,NextResponse} from 'next/server';import {apiGuard} from '@/lib/auth';import {one} from '@/lib/db';import {bad,failed,field,longText,happenedAt,validUuid} from '@/lib/http';
export async function POST(req:NextRequest){const g=apiGuard(req);if(g)return g;try{
 const b=await req.json();const text=longText(b.rawContent,2_000_000,'沟通原文');const occurred=happenedAt(b.happenedAt);if(!occurred)return bad('沟通发生时间不正确，请提供带时区的有效时间');
 if(!validUuid(b.clientId)||!text)return bad('请选择客户并填写沟通内容');
 if(b.opportunityId&&!validUuid(b.opportunityId))return bad('商机ID不正确');
 if(b.projectId&&!validUuid(b.projectId))return bad('项目ID不正确');
 if(b.projectId){const linked=await one(`SELECT client_id,opportunity_id FROM projects WHERE id=$1`,[b.projectId]);
  if(!linked||linked.client_id!==b.clientId||(linked.opportunity_id&&b.opportunityId&&linked.opportunity_id!==b.opportunityId))return bad('项目与客户或商机不匹配');}
 if(b.opportunityId){const valid=await one(`SELECT 1 FROM opportunities WHERE id=$1 AND client_id=$2`,[b.opportunityId,b.clientId]);if(!valid)return bad('商机不属于该客户');}
 const communication=await one(`INSERT INTO communications(client_id,opportunity_id,project_id,channel,raw_content,summary,happened_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[
 b.clientId,b.opportunityId||null,b.projectId||null,field(b.channel,80)||'沟通',text,field(b.summary,2000),occurred]);
 return NextResponse.json({communication},{status:201});
}catch(e){return failed(e)}}

export async function GET(req:NextRequest){const g=apiGuard(req);if(g)return g;try{
 const id=new URL(req.url).searchParams.get('id');if(!validUuid(id))return bad('无效沟通ID');
 const communication=await one(`SELECT id,client_id,opportunity_id,channel,happened_at,raw_content,summary,created_at FROM communications WHERE id=$1`,[id]);
 if(!communication)return bad('沟通不存在',404);return NextResponse.json({communication});
}catch(e){return failed(e)}}
