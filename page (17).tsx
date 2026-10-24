import Link from 'next/link';import {rows,one} from '@/lib/db';
export const dynamic='force-dynamic';
export default async function Growth({searchParams}:{searchParams:Promise<{page?:string}>}){
 const s=await searchParams,page=Math.max(1,Math.min(100000,parseInt(s.page||'1',10)||1)),size=30;
 let observations:any[]=[],total=0,error='';try{
 const [data,count]=await Promise.all([
  rows(`SELECT o.dimension,o.observation,o.state,o.evidence,o.created_at,c.client_id,c.happened_at,cl.name AS client_name
        FROM ability_observations o JOIN communications c ON c.id=o.communication_id JOIN clients cl ON cl.id=c.client_id
        WHERE o.state<>'候选待核实' ORDER BY o.created_at DESC,o.id DESC LIMIT $1 OFFSET $2`,[size,(page-1)*size]),
  one<{total:number}>(`SELECT count(*)::int AS total FROM ability_observations WHERE state<>'候选待核实'`)]);observations=data;total=count?.total||0;
 }catch{error='能力观察记录暂时无法读取，请检查数据库迁移。'}
 const pages=Math.ceil(total/size);
 return <><div className="pageHeader"><div><h1>成长</h1><p className="muted">基于真实工作观察，持续追踪实践与反馈</p></div></div>
 {error&&<p className="notice error">{error}</p>}
 <section className="workSection"><h2>个人能力观察</h2><p className="subtleText">仅展示已采纳且具备证据的能力观察，无论是否创建训练任务，不以单次沟通为个人能力打分。训练中的实践结果由后续沟通验证关联。</p>
 {observations.map((o,i)=><div className="contentRow" key={i}><small>{new Date(o.happened_at).toLocaleDateString('zh-CN')} · {o.client_name} · {o.dimension} · {o.state}</small><p>{o.observation}</p><Link className="inlineLink" href={`/clients/${o.client_id}`}>查看对应客户 →</Link></div>)}
 {!observations.length&&!error&&<p className="empty">尚无已确认的能力观察。完成客户沟通复盘并确认有证据的能力观察后，此处才会出现记录。</p>}
 {pages>1&&<nav className="pager"><span>共 {total} 条 · 第 {page}/{pages} 页</span>{page>1?<Link href={`/growth?page=${page-1}`}>上一页</Link>:<span>上一页</span>}{page<pages?<Link href={`/growth?page=${page+1}`}>下一页</Link>:<span>下一页</span>}</nav>}
 </section></>;
}
