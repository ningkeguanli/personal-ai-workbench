import {NextRequest,NextResponse} from 'next/server';import {apiGuard} from '@/lib/auth';import {one,transaction} from '@/lib/db';import {bad,failed,field,longText,validUuid} from '@/lib/http';
type Context={params:Promise<{id:string}>};
export async function GET(req:NextRequest,ctx:Context){const g=apiGuard(req);if(g)return g;try{
 const {id}=await ctx.params;const versionId=new URL(req.url).searchParams.get('versionId');if(!validUuid(id)||!validUuid(versionId))return bad('请选择正确的项目版本');
 const version=await one(`SELECT id,project_id,label,content,change_note,created_at FROM project_versions WHERE id=$1 AND project_id=$2`,[versionId,id]);
 if(!version)return bad('版本不属于当前项目',404);return NextResponse.json({version});
}catch(e){return failed(e)}}
export async function POST(req:NextRequest,ctx:Context){const g=apiGuard(req);if(g)return g;try{
 const {id}=await ctx.params;if(!validUuid(id))return bad('项目ID无效');const b=await req.json(),label=field(b.label,100),content=longText(b.content,2_000_000,'项目版本正文');
 if(!label)return bad('版本名称不能为空');
 const exists=await one(`SELECT id FROM projects WHERE id=$1`,[id]);if(!exists)return bad('项目不存在',404);
 const version=await one(`INSERT INTO project_versions(project_id,label,content,change_note) VALUES($1,$2,$3,$4) RETURNING *`,[id,label,content,field(b.changeNote,1500)]);
 return NextResponse.json({version},{status:201});
}catch(e){return failed(e)}}
export async function PATCH(req:NextRequest,ctx:Context){const g=apiGuard(req);if(g)return g;try{
 const {id}=await ctx.params,b=await req.json();if(!validUuid(id)||!validUuid(b.versionId)||b.confirm!==true)return bad('请选择版本并明确确认设为有效版本');
 const result=await transaction(async c=>{
  const {rows:[v]}=await c.query(`SELECT id FROM project_versions WHERE id=$1 AND project_id=$2`,[b.versionId,id]);if(!v)return null;
  const {rows:[project]}=await c.query(`UPDATE projects SET current_version_id=$2,updated_at=now() WHERE id=$1 RETURNING *`,[id,b.versionId]);return project;
 });if(!result)return bad('版本不属于当前项目',404);return NextResponse.json({project:result});
}catch(e){return failed(e)}}
