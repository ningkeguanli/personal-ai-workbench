// 只允许在专用测试数据库连接的应用实例执行，会新增模拟客户/任务/项目。
import assert from 'node:assert/strict';
if(process.env.RUN_HTTP_SMOKE!=='yes'||!process.env.APP_PASSWORD){console.error('需 RUN_HTTP_SMOKE=yes 和测试用 APP_PASSWORD，仅能连接一次性测试环境');process.exit(2)}
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3000';
async function request(path,{method='GET',body,cookie=''}={}){
 const headers={Origin:base};if(cookie)headers.Cookie=cookie;if(body)headers['Content-Type']='application/json';
 const res=await fetch(new URL(path,base),{method,headers,body:body?JSON.stringify(body):undefined,redirect:'manual'});
 const text=await res.text();let data;try{data=JSON.parse(text)}catch{data=text}
 return {status:res.status,data,cookie:res.headers.get('set-cookie')?.split(';')[0]||''};
}
let passed=0;
try{
 const blocked=await request('/api/clients');assert.equal(blocked.status,401);passed++;
 const login=await request('/api/session',{method:'POST',body:{password:process.env.APP_PASSWORD}});assert.equal(login.status,200);assert.ok(login.cookie);const cookie=login.cookie;passed++;
 const home=await request('/today',{cookie});assert.equal(home.status,200);passed++;
 const made=await request('/api/clients',{method:'POST',cookie,body:{name:'V362_SMOKE_'+Date.now()}});assert.equal(made.status,201);const clientId=made.data.client.id;passed++;
 const opp=await request('/api/opportunities',{method:'POST',cookie,body:{clientId,title:'验证商机关联'}});assert.equal(opp.status,201);const opportunityId=opp.data.opportunity.id;passed++;
 const proj=await request('/api/projects',{method:'POST',cookie,body:{title:'验证关联项目',clientId,opportunityId}});assert.equal(proj.status,201);const projectId=proj.data.project.id;assert.equal(proj.data.project.client_id,clientId);passed++;
 const task=await request('/api/tasks',{method:'POST',cookie,body:{title:'验证项目任务',projectId}});assert.equal(task.status,201);assert.equal(task.data.task.client_id,clientId);assert.equal(task.data.task.opportunity_id,opportunityId);passed++;
 const c1=await request('/api/communications',{method:'POST',cookie,body:{clientId,opportunityId,happenedAt:'2026-10-20T10:00:00+08:00',rawContent:'第一次客户沟通记录，尚无明确采购任务。'}});assert.equal(c1.status,201);passed++;
 const c2=await request('/api/communications',{method:'POST',cookie,body:{clientId,opportunityId,happenedAt:'2026-10-21T10:00:00+08:00',rawContent:'第二次客户沟通记录，确认下次会议。'}});assert.equal(c2.status,201);passed++;
 const page=await request(`/clients/${clientId}`,{cookie});assert.equal(page.status,200);passed++;
 const ppage=await request(`/projects/${projectId}`,{cookie});assert.equal(ppage.status,200);passed++;
 if(!process.env.OPENAI_API_KEY){const ai=await request('/api/analyses',{method:'POST',cookie,body:{communicationId:c1.data.communication.id,focus:'person'}});assert.equal(ai.status,503);assert.equal(ai.data.error,'AI_NOT_CONFIGURED');passed++}
 console.log('云端HTTP烟雾测试通过：'+passed+'项。注意：测试会向专用数据库新增记录，禁止在正式库执行。');
}catch(e){console.error('HTTP烟雾测试失败，已完成'+passed+'项',e);process.exitCode=1}
