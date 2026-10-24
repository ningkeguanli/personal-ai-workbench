import {NextRequest,NextResponse} from 'next/server';import {apiGuard} from '@/lib/auth';import {one,rows} from '@/lib/db';import {bad,failed,validUuid} from '@/lib/http';
type Context={params:Promise<{id:string}>};
export async function GET(req:NextRequest,ctx:Context){const g=apiGuard(req);if(g)return g;try{
 const {id}=await ctx.params;if(!validUuid(id))return bad('项目ID错误');
 const project=await one(`SELECT p.*,v.label AS current_version FROM projects p LEFT JOIN project_versions v ON v.id=p.current_version_id WHERE p.id=$1`,[id]);
 if(!project)return bad('项目不存在',404);
 const sp=new URL(req.url).searchParams;const raw=Number(sp.get('page')||'1'),page=Number.isSafeInteger(raw)?Math.max(1,Math.min(100000,raw)):1,rawTask=Number(sp.get('taskPage')||'1'),taskPage=Number.isSafeInteger(rawTask)?Math.max(1,Math.min(100000,rawTask)):1,size=30;
 const [tasks,versions,total,totalTasks]=await Promise.all([
 rows(`SELECT * FROM tasks WHERE project_id=$1 ORDER BY status,updated_at DESC,id DESC LIMIT $2 OFFSET $3`,[id,size,(taskPage-1)*size]),
 rows(`SELECT id,project_id,label,change_note,created_at,length(content) AS content_length FROM project_versions WHERE project_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,[id,size,(page-1)*size]),
 one<{total:number}>(`SELECT count(*)::int AS total FROM project_versions WHERE project_id=$1`,[id]),one<{total:number}>(`SELECT count(*)::int AS total FROM tasks WHERE project_id=$1`,[id])]);
 return NextResponse.json({project,tasks,versions,pagination:{page,pageSize:size,total:total?.total||0},taskPagination:{page:taskPage,pageSize:size,total:totalTasks?.total||0},note:'版本正文单独按ID读取。'});
}catch(e){return failed(e)}}
