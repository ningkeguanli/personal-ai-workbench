import {readFileSync,existsSync} from 'node:fs';
const files=['package.json','db/001_init.sql','lib/ai.ts','lib/auth.ts','app/(workspace)/today/page.tsx','app/(workspace)/clients/[id]/page.tsx','app/(workspace)/projects/[id]/page.tsx','app/api/communications/route.ts','app/api/analyses/route.ts','app/api/analyses/[id]/apply/route.ts','app/api/validations/route.ts','README.md'];
for(const f of files)if(!existsSync(f))throw new Error(`缺少必要文件 ${f}`);
const sql=readFileSync('db/001_init.sql','utf8');for(const table of ['clients','opportunities','projects','project_versions','tasks','communications','analyses','action_items','validations'])if(!sql.includes(`CREATE TABLE IF NOT EXISTS ${table}`))throw new Error(`数据库缺少 ${table}`);
for(const f of ['app/api/communications/route.ts','app/api/analyses/route.ts','app/api/analyses/[id]/apply/route.ts','app/api/validations/route.ts']){const data=readFileSync(f,'utf8');if(!data.includes('apiGuard(req)'))throw new Error(`API未检查会话 ${f}`)}
const ai=readFileSync('lib/ai.ts','utf8');if(!ai.includes('api.openai.com/v1/responses')||!ai.includes('store:false'))throw new Error('AI服务端接口缺失');
const apply=readFileSync('app/api/analyses/[id]/apply/route.ts','utf8');if(!apply.includes('FOR UPDATE OF a')||!apply.includes('status=\'accepted\''))throw new Error('分析采纳幂等检查不足');
console.log(`关键工程结构检查通过：${files.length}个文件，9个核心数据表，4条受保护流程接口`);

const integrity=readFileSync('db/002_integrity_and_continuity.sql','utf8');
if(!integrity.includes('fk_projects_active_version_same_project')||!integrity.includes('trg_validation_source'))throw new Error('缺少V3.6.1数据库一致性约束');
const http=readFileSync('lib/http.ts','utf8');if(!http.includes('InputLimitError')||!http.includes('longText'))throw new Error('缺少超限内容拒绝机制');
const communication=readFileSync('app/api/communications/route.ts','utf8');if(!communication.includes('happenedAt')||!communication.includes('longText'))throw new Error('沟通发生时间和原文保存检查不足');
const validation=readFileSync('app/api/validations/route.ts','utf8');if(!validation.includes('followupCommunicationId')||!validation.includes('eligibleFollowup'))throw new Error('后续验证来源检查不足');
console.log('V3.6.1数据完整性、连续验证与版本约束静态检查通过');
