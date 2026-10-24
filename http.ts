import {NextResponse} from 'next/server';import {preserveText,validOffsetDateTime} from './input-rules.mjs';
export class InputLimitError extends Error {
  constructor(public readonly label:string,public readonly limit:number){super(`${label}超过当前支持的${limit.toLocaleString('zh-CN')}字符，请缩短输入或分成独立记录；本次提交已拒绝，不会截断后保存。`);this.name='InputLimitError'}
}
export function bad(message:string,status=400){return NextResponse.json({error:'BAD_REQUEST',message},{status})}
export function failed(e:unknown){
 if(e instanceof InputLimitError)return NextResponse.json({error:'INPUT_TOO_LONG',message:e.message},{status:413});
 const message=e instanceof Error?e.message:'';
 if(message==='DATABASE_URL_NOT_CONFIGURED')return NextResponse.json({error:'DATABASE_NOT_CONFIGURED',message:'尚未配置云端数据库'},{status:503});
 if(message==='AI_INPUT_TOO_LONG')return NextResponse.json({error:'AI_INPUT_TOO_LONG',message:'原文已完整保存，但超过当前单次AI分析容量。请拆分为较短的独立分析任务；系统没有仅分析前半段。'},{status:422});
 console.error('API request failed',e);return NextResponse.json({error:'SERVER_ERROR',message:'操作失败，请稍后重试'},{status:500});
}
export function field(v:unknown,max=1000,label='输入内容'){
 if(typeof v!=='string')return '';
 const text=v.trim();if(text.length>max)throw new InputLimitError(label,max);return text;
}
export function longText(v:unknown,max=2_000_000,label='正文'){try{return preserveText(v,max)}catch(e){if(e instanceof RangeError)throw new InputLimitError(label,max);throw e}}
export function validUuid(v:unknown){return typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)}
// 明确要求带时区的ISO时间，避免服务器部署位置改变沟通的发生日期。
export function happenedAt(v:unknown){
 if(v===undefined||v===null||v==='')return new Date().toISOString();
 if(typeof v!=='string'||!validOffsetDateTime(v))return null;
 const date=new Date(v);if(date.getTime()>Date.now()+5*60*1000)return null;
 return date.toISOString();
}
export function pageParams(url:string,defaultSize=40){
 const sp=new URL(url).searchParams;const raw=Number(sp.get('page')||'1');const page=Number.isSafeInteger(raw)?Math.min(100000,Math.max(1,raw)):1;
 const size=Math.min(100,Math.max(1,defaultSize));return {page,pageSize:size,offset:(page-1)*size};
}
