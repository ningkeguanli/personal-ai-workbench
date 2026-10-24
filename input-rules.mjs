// 可复用、可独立单测的数据完整性规则。
export function preserveText(value,limit){
 if(typeof value!=='string'||!value.trim())return '';
 if(value.length>limit){const error=new RangeError('INPUT_TOO_LONG');error.limit=limit;throw error;}
 return value;
}
export function eligibleFollowup(original,next){
 return Boolean(original&&next&&original.client_id&&original.client_id===next.client_id
  &&Number.isFinite(new Date(original.source_time).getTime())&&Number.isFinite(new Date(next.happened_at).getTime())
  &&new Date(next.happened_at).getTime()>new Date(original.source_time).getTime()
  &&(!original.opportunity_id||!next.opportunity_id||original.opportunity_id===next.opportunity_id));
}
export function escapeLike(value){return value.replace(/[!%_]/g,char=>'!'+char)}

// 严格核对本地日历字段，防止Date.parse将2月30日悄悄归一化到3月。
export function validOffsetDateTime(v){
 if(typeof v!=='string')return false;
 const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(v);
 if(!m)return false;
 const year=Number(m[1]),month=Number(m[2]),day=Number(m[3]),hour=Number(m[4]),minute=Number(m[5]),second=Number(m[6]||0),tzHour=Number(m[10]||0),tzMinute=Number(m[11]||0);
 const leap=(year%4===0 && (year%100!==0||year%400===0));
 const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 return year>=1900&&month>=1&&month<=12&&day>=1&&day<=days[month-1]&&hour<=23&&minute<=59&&second<=59&&tzHour<=14&&tzMinute<=59&&(tzHour<14||tzMinute===0)&&Number.isFinite(Date.parse(v));
}
