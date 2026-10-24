import Link from 'next/link';import {notFound} from 'next/navigation';import {one,rows} from '@/lib/db';import ClientWork from '@/components/client-work';
export const dynamic='force-dynamic';
type Params={historyPage?:string;actionPage?:string};
export default async function ClientDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Params>}){
 const {id}=await params,s=await searchParams;const historyPage=Math.max(1,Math.min(100000,parseInt(s.historyPage||'1',10)||1));
 const actionPage=Math.max(1,Math.min(100000,parseInt(s.actionPage||'1',10)||1));const pageSize=30;
 const client=await one(`SELECT * FROM clients WHERE id=$1`,[id]);if(!client)notFound();
 const [opportunities,communications,totalHistory,totalActions,actions]=await Promise.all([
  rows(`SELECT * FROM opportunities WHERE client_id=$1 ORDER BY updated_at DESC`,[id]),
  rows(`SELECT id,client_id,opportunity_id,channel,happened_at,summary,left(raw_content,1600) AS raw_preview,length(raw_content) AS raw_length FROM communications WHERE client_id=$1 ORDER BY happened_at DESC,id DESC LIMIT $2 OFFSET $3`,[id,pageSize,(historyPage-1)*pageSize]),
  one<{total:number}>(`SELECT count(*)::int AS total FROM communications WHERE client_id=$1`,[id]),
  one<{total:number}>(`SELECT count(*)::int AS total FROM action_items a JOIN communications c ON c.id=a.communication_id WHERE c.client_id=$1`,[id]),
  rows(`SELECT i.*,src.happened_at AS source_happened_at,src.opportunity_id AS source_opportunity_id,
    v.observed_behavior,v.business_outcome,v.capability_outcome,v.followup_communication_id,v.created_at AS validated_at
    FROM action_items i JOIN communications src ON src.id=i.communication_id
    LEFT JOIN LATERAL(SELECT v.* FROM validations v JOIN communications fc ON fc.id=v.followup_communication_id WHERE v.action_id=i.id ORDER BY fc.happened_at DESC,v.created_at DESC,v.id DESC LIMIT 1)v ON true
    WHERE src.client_id=$1 ORDER BY i.created_at DESC LIMIT $2 OFFSET $3`,[id,pageSize,(actionPage-1)*pageSize])
 ]);
 const analyses=communications.length?await rows(`SELECT a.*,COALESCE(o.state,'') AS observation_state, EXISTS(SELECT 1 FROM action_items i WHERE i.analysis_id=a.id AND i.kind='business') AS has_business_action, EXISTS(SELECT 1 FROM action_items i WHERE i.analysis_id=a.id AND i.kind='training') AS has_training_action FROM analyses a LEFT JOIN ability_observations o ON o.analysis_id=a.id WHERE a.communication_id=ANY($1::uuid[]) ORDER BY a.created_at DESC`,[communications.map(c=>c.id)]):[];
 // 后续沟通选择器只需元数据，不一次传送所有历史原文。
 return <><div className="breadcrumbs"><Link href="/clients">客户</Link><span> / </span><span>{client.name}</span></div>
 <div className="pageHeader"><div><h1>{client.name}</h1><p className="muted">{client.industry||'行业待补充'} · {client.status}</p></div></div>
 <ClientWork key={`${historyPage}-${actionPage}`} client={client} opportunities={opportunities} communications={communications} analyses={analyses} actions={actions}
 initialTab={actionPage>1?'actions':historyPage>1?'timeline':'overview'}
 historyPage={historyPage} totalHistory={totalHistory?.total||0} actionPage={actionPage} totalActions={totalActions?.total||0} pageSize={pageSize}/></>;
}
