import Link from 'next/link';import {one,rows} from '@/lib/db';import {CreateEntity} from '@/components/create-entity';import {Pager} from '@/components/pager';
export const dynamic='force-dynamic';
type Search={page?:string;q?:string};
export default async function Clients({searchParams}:{searchParams:Promise<Search>}){
 const s=await searchParams,q=(s.q||'').trim().slice(0,150),page=Math.max(1,Math.min(100000,parseInt(s.page||'1',10)||1)),pageSize=40,term='%'+q.replace(/[!%_]/g,m=>'!'+m)+'%';
 let clients:any[]=[],total=0,error='';try{const [data,count]=await Promise.all([
 rows(`SELECT c.*, (SELECT count(*)::int FROM opportunities o WHERE o.client_id=c.id) AS opp_count FROM clients c WHERE ($1='' OR c.name ILIKE $2 ESCAPE '!' OR c.industry ILIKE $2 ESCAPE '!') ORDER BY c.updated_at DESC,c.id DESC LIMIT $3 OFFSET $4`,[q,term,pageSize,(page-1)*pageSize]),
 one<{total:number}>(`SELECT count(*)::int AS total FROM clients WHERE ($1='' OR name ILIKE $2 ESCAPE '!' OR industry ILIKE $2 ESCAPE '!')`,[q,term])]);clients=data;total=count?.total||0;
 }catch{error='数据库尚未准备就绪，请检查连接及迁移。'}
 return <><div className="pageHeader"><div><h1>客户</h1><p className="muted">客户关系、沟通、商机与后续工作</p></div><CreateEntity kind="client"/></div>
 {error&&<p className="notice error">{error}</p>}
 <form method="get" className="filterLine"><input name="q" defaultValue={q} aria-label="搜索客户" placeholder="搜索客户名称或行业"/><button className="btn">查找</button></form>
 <div className="listTable"><div className="listHeader"><span>客户名称</span><span>当前状态</span><span>商机</span><span>下一步</span></div>
 {clients.length?clients.map(c=><Link className="listLine" key={c.id} href={`/clients/${c.id}`}><span className="mainCell">{c.name}<small>{c.industry||'未填写行业'}</small></span><span>{c.status}</span><span>{c.opp_count}</span><span className="singleLine">{c.next_action||'暂无'}</span></Link>):<p className="empty">{q?'没有匹配的客户':'还没有客户。可以新建客户，之后的沟通和商机都会关联同一档案。'}</p>}</div>
 <Pager base="/clients" page={page} total={total} pageSize={pageSize} params={{q}}/></>
}
