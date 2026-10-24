import {NextRequest,NextResponse} from 'next/server';import {apiGuard} from '@/lib/auth';import {one} from '@/lib/db';import {bad,failed,field,validUuid} from '@/lib/http';
type Context={params:Promise<{id:string}>};
export async function PATCH(req:NextRequest,ctx:Context){const g=apiGuard(req);if(g)return g;try{
 const {id}=await ctx.params;if(!validUuid(id))return bad('任务ID无效');const b=await req.json();
 if(!['待执行','进行中','受阻','已完成'].includes(b.status))return bad('任务状态不正确');
 const task=await one(`UPDATE tasks SET status=$2,result=COALESCE($3,result),updated_at=now() WHERE id=$1 RETURNING *`,[id,b.status,typeof b.result==='string'?field(b.result,3000):null]);
 if(!task)return bad('任务不存在',404);return NextResponse.json({task});
}catch(e){return failed(e)}}
