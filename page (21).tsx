import Link from 'next/link';import {rows} from '@/lib/db';import {CreateTask,TaskToggle} from '@/components/task-actions';
export const dynamic='force-dynamic';
export default async function Today(){
 let tasks:any[]=[],clients:any[]=[],projects:any[]=[],error='';
 try{[tasks,clients,projects]=await Promise.all([
 rows(`SELECT t.id,t.title,t.status,t.kind,t.due_date,c.name AS client_name FROM tasks t LEFT JOIN clients c ON c.id=t.client_id ORDER BY CASE WHEN t.status='已完成' THEN 1 ELSE 0 END,t.due_date NULLS LAST,t.updated_at DESC LIMIT 18`),
 rows(`SELECT id,name,status,next_action FROM clients ORDER BY updated_at DESC LIMIT 6`),
 rows(`SELECT id,title,status,next_action FROM projects ORDER BY updated_at DESC LIMIT 6`)
 ])}catch{error='尚未连接到可用数据库。请按照项目 README 配置 DATABASE_URL 并执行数据库迁移。'}
 const pending=tasks.filter(t=>t.status!=='已完成');
 return <><div className="pageHeader"><div><h1>今天的工作</h1><p className="muted">任务、最近客户和进行中的项目</p></div><CreateTask/></div>{error&&<p className="notice error">{error}</p>}
 <div className="twoColumns"><div><section className="workSection"><div className="sectionTitle"><h2>需要处理 <small>{pending.length}</small></h2></div>{pending.length?<div className="rows">{pending.map(t=><div className="taskRow" key={t.id}><TaskToggle id={t.id} status={t.status}/><div className="rowMain"><span>{t.title}</span><small>{t.client_name|| (t.kind==='训练'?'个人训练':'个人工作')}</small></div><time>{t.due_date?String(t.due_date).slice(0,10):''}</time></div>)}</div>:<p className="empty">暂无待处理任务。可以新建任务，或从客户和项目中安排下一步。</p>}</section>
 <section className="workSection"><div className="sectionTitle"><h2>最近客户</h2><Link href="/clients">查看全部 →</Link></div>{clients.length?<div className="rows">{clients.map(c=><Link className="recordRow" href={`/clients/${c.id}`} key={c.id}><div className="rowMain"><strong>{c.name}</strong><small>{c.next_action||'暂无明确的下一步'}</small></div><span className="rowStatus">{c.status}</span></Link>)}</div>:<p className="empty">没有客户记录。可以从客户页面开始建立。</p>}</section></div>
 <aside className="workAside"><section className="workSection"><div className="sectionTitle"><h2>最近项目</h2><Link href="/projects">查看全部 →</Link></div>{projects.length?<div className="rows">{projects.map(p=><Link key={p.id} className="sideRow" href={`/projects/${p.id}`}><strong>{p.title}</strong><small>{p.next_action||p.status}</small></Link>)}</div>:<p className="empty">暂无项目</p>}</section><section className="workSection"><h2>工作与成长</h2><p className="subtleText">一次客户沟通可以同时产生业务推进建议和个人训练目标；经确认后进入工作任务，下次沟通时再验证。</p><Link className="inlineLink" href="/clients">从客户记录开始 →</Link></section></aside></div></>
}
