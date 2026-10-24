import Link from 'next/link';import {one,rows} from '@/lib/db';import {CreateEntity} from '@/components/create-entity';import {Pager} from '@/components/pager';
export const dynamic='force-dynamic';
type Search={page?:string;q?:string};
export default async function Projects({searchParams}:{searchParams:Promise<Search>}){
 const s=await searchParams,q=(s.q||'').trim().slice(0,150),page=Math.max(1,Math.min(100000,parseInt(s.page||'1',10)||1)),pageSize=40,term='%'+q.replace(/[!%_]/g,m=>'!'+m)+'%';
 let projects:any[]=[],total=0,error='';try{const [data,count]=await Promise.all([
 rows(`SELECT p.*,v.label AS current_version,c.name AS client_name FROM projects p LEFT JOIN project_versions v ON v.id=p.current_version_id LEFT JOIN clients c ON c.id=p.client_id WHERE ($1='' OR p.title ILIKE $2 ESCAPE '!') ORDER BY p.updated_at DESC,p.id DESC LIMIT $3 OFFSET $4`,[q,term,pageSize,(page-1)*pageSize]),
 one<{total:number}>(`SELECT count(*)::int AS total FROM projects WHERE ($1='' OR title ILIKE $2 ESCAPE '!')`,[q,term])]);projects=data;total=count?.total||0;
 }catch{error='数据库尚未准备就绪，请检查连接及迁移。'}
 return <><div className="pageHeader"><div><h1>项目</h1><p className="muted">进度、任务、版本与长期续作</p></div><CreateEntity kind="project"/></div>
 {error&&<p className="notice error">{error}</p>}<form method="get" className="filterLine"><input name="q" defaultValue={q} aria-label="搜索项目" placeholder="搜索项目名称"/><button className="btn">查找</button></form>
 <div className="listTable"><div className="listHeader projectCols"><span>项目名称</span><span>状态</span><span>有效版本</span><span>下一步</span></div>
 {projects.length?projects.map(item=><Link className="listLine projectCols" href={`/projects/${item.id}`} key={item.id}><span className="mainCell">{item.title}<small>{item.client_name?`关联客户：${item.client_name}`:item.kind}</small></span><span>{item.status}</span><span>{item.current_version||'尚无'}</span><span className="singleLine">{item.next_action||'暂无'}</span></Link>):<p className="empty">{q?'没有匹配的项目':'暂无项目。创建后可以管理任务、成果、版本与关键决策。'}</p>}</div>
 <Pager base="/projects" page={page} total={total} pageSize={pageSize} params={{q}}/></>
}
