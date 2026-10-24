import Link from 'next/link';import {notFound} from 'next/navigation';import {one,rows} from '@/lib/db';import ProjectWork from '@/components/project-work';
export const dynamic='force-dynamic';
export default async function ProjectDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{versionPage?:string;taskPage?:string}>}){
 const {id}=await params,sp=await searchParams;const versionPage=Math.max(1,Math.min(100000,parseInt(sp.versionPage||'1',10)||1)),taskPage=Math.max(1,Math.min(100000,parseInt(sp.taskPage||'1',10)||1)),pageSize=30;
 const project=await one(`SELECT p.*,v.label AS current_version,c.name AS client_name FROM projects p LEFT JOIN project_versions v ON v.id=p.current_version_id LEFT JOIN clients c ON c.id=p.client_id WHERE p.id=$1`,[id]);if(!project)notFound();
 const [tasks,versions,total,totalTasks]=await Promise.all([
 rows(`SELECT * FROM tasks WHERE project_id=$1 ORDER BY status,updated_at DESC,id DESC LIMIT $2 OFFSET $3`,[id,pageSize,(taskPage-1)*pageSize]),
 rows(`SELECT id,project_id,label,change_note,created_at,length(content) AS content_length FROM project_versions WHERE project_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,[id,pageSize,(versionPage-1)*pageSize]),
 one<{total:number}>(`SELECT count(*)::int AS total FROM project_versions WHERE project_id=$1`,[id]),
 one<{total:number}>(`SELECT count(*)::int AS total FROM tasks WHERE project_id=$1`,[id])]);
 return <><div className="breadcrumbs"><Link href="/projects">项目</Link><span> / </span><span>{project.title}</span></div><div className="pageHeader"><div><h1>{project.title}</h1><p className="muted">{project.kind} · {project.status}{project.client_name?` · 客户：${project.client_name}`:''}</p></div></div>
 <ProjectWork key={`${versionPage}-${taskPage}`} project={project} tasks={tasks} versions={versions} versionPage={versionPage} totalVersions={total?.total||0} taskPage={taskPage} totalTasks={totalTasks?.total||0} pageSize={pageSize}/></>
}
