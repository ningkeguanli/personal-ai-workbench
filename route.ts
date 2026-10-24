import {NextRequest,NextResponse} from 'next/server';import {apiGuard} from '@/lib/auth';import {one} from '@/lib/db';import {bad,failed,field,validUuid} from '@/lib/http';
export async function POST(req:NextRequest){const g=apiGuard(req);if(g)return g;try{
 const b=await req.json();if(!validUuid(b.clientId)||!field(b.title,180))return bad('请选择客户并填写商机名称');
 const opportunity=await one(`INSERT INTO opportunities(client_id,title,next_action) VALUES($1,$2,$3) RETURNING *`,[b.clientId,field(b.title,180),field(b.nextAction,1200)]);
 return NextResponse.json({opportunity},{status:201});
}catch(e){return failed(e)}}
