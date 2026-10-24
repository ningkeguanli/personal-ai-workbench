// 旧库只有在核心表和关键列完整时才能自动标记初始迁移。
// 返回 fresh / legacy；部分安装必须中止，避免掩盖数据结构损坏。
export const baseColumns = {
 clients:['id','name','status','created_at'],
 contacts:['id','client_id','name'],
 opportunities:['id','client_id','stage','status'],
 projects:['id','title','current_version_id'],
 project_versions:['id','project_id','content'],
 tasks:['id','title','client_id','project_id','opportunity_id'],
 communications:['id','client_id','opportunity_id','raw_content','happened_at'],
 analyses:['id','communication_id','focus','status'],
 action_items:['id','analysis_id','communication_id','kind'],
 validations:['id','action_id','capability_outcome'],
 knowledge_files:['id','title','extracted_text']
};
export function assessBaseline(rows){
 const names=new Map();for(const r of rows){if(!names.has(r.table_name))names.set(r.table_name,new Set());names.get(r.table_name).add(r.column_name)}
 const observed=[...names.keys()].filter(name=>baseColumns[name]);
 if(observed.length===0)return {status:'fresh',missing:[]};
 const missing=[];
 for(const [name,cols] of Object.entries(baseColumns)){
  const has=names.get(name);
  if(!has){missing.push(`缺少表 ${name}`);continue}
  for(const col of cols)if(!has.has(col))missing.push(`缺少字段 ${name}.${col}`)
 }
 return missing.length?{status:'partial',missing}:{status:'legacy',missing:[]};
}
