import Link from 'next/link';
export function Pager({base,page,total,pageSize,params={}}:{base:string;page:number;total:number;pageSize:number;params?:Record<string,string|number>}){
 const pages=Math.max(1,Math.ceil(total/pageSize));if(pages<=1)return null;
 function link(target:number){const q=new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k,v])=>[k,String(v)])));q.set('page',String(target));return `${base}?${q}`}
 return <nav className="pager" aria-label="分页"><span>共 {total} 条 · 第 {Math.min(page,pages)}/{pages} 页</span>
 {page>1?<Link href={link(page-1)}>上一页</Link>:<span>上一页</span>}
 {page<pages?<Link href={link(page+1)}>下一页</Link>:<span>下一页</span>}</nav>
}
