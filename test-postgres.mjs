// 仅针对一次性测试数据库执行。所有样例写入在事务末尾ROLLBACK，不污染正式记录。
import pg from 'pg';import assert from 'node:assert/strict';
if(process.env.RUN_DB_INTEGRATION!=='yes'||!process.env.DATABASE_URL){console.error('测试需要 RUN_DB_INTEGRATION=yes 与指向独立测试库的 DATABASE_URL');process.exit(2)}
const client=new pg.Client({connectionString:process.env.DATABASE_URL});let n=0;
const q=async(sql,args=[])=>client.query(sql,args);
try{
 await client.connect();
 const version=await q(`SELECT filename FROM schema_migrations ORDER BY filename`);
 for(const filename of ['001_init.sql','002_integrity_and_continuity.sql','003_cross_object_links.sql'])assert.ok(version.rows.some(x=>x.filename===filename),`未迁移 ${filename}`);
 await q('BEGIN');
 const a=(await q(`INSERT INTO clients(name) VALUES('v362 集成测试客户') RETURNING id`)).rows[0].id;
 const b=(await q(`INSERT INTO clients(name) VALUES('v362 其他客户') RETURNING id`)).rows[0].id;
 const o=(await q(`INSERT INTO opportunities(client_id,title) VALUES($1,'测试商机') RETURNING id`,[a])).rows[0].id;
 const p=(await q(`INSERT INTO projects(title,client_id,opportunity_id) VALUES('关联项目',$1,$2) RETURNING id`,[a,o])).rows[0].id;
 const p2=(await q(`INSERT INTO projects(title) VALUES('独立项目') RETURNING id`)).rows[0].id;
 const v1=(await q(`INSERT INTO project_versions(project_id,label,content) VALUES($1,'基线','完整正文') RETURNING id`,[p])).rows[0].id;
 const v2=(await q(`INSERT INTO project_versions(project_id,label,content) VALUES($1,'错误来源','内容') RETURNING id`,[p2])).rows[0].id;
 await q(`UPDATE projects SET current_version_id=$2 WHERE id=$1`,[p,v1]);n++;
 await q('SAVEPOINT bad_version');let rejected=false;try{await q(`UPDATE projects SET current_version_id=$2 WHERE id=$1`,[p,v2])}catch{rejected=true}finally{await q('ROLLBACK TO SAVEPOINT bad_version')}assert.ok(rejected,'必须拒绝跨项目版本');n++;
 await q(`INSERT INTO tasks(title,client_id,opportunity_id,project_id) VALUES('准备沟通',$1,$2,$3)`,[a,o,p]);n++;
 await q('SAVEPOINT bad_task');rejected=false;try{await q(`INSERT INTO tasks(title,client_id,opportunity_id,project_id) VALUES('非法关系',$1,$2,$3)`,[b,o,p])}catch{rejected=true}finally{await q('ROLLBACK TO SAVEPOINT bad_task')}assert.ok(rejected,'必须拒绝任务错连客户');n++;
 const source=(await q(`INSERT INTO communications(client_id,opportunity_id,happened_at,raw_content) VALUES($1,$2,'2026-10-20T10:00:00Z','第一次沟通') RETURNING id`,[a,o])).rows[0].id;
 const follow=(await q(`INSERT INTO communications(client_id,opportunity_id,happened_at,raw_content) VALUES($1,$2,'2026-10-22T10:00:00Z','第二次沟通') RETURNING id`,[a,o])).rows[0].id;
 const old=(await q(`INSERT INTO communications(client_id,happened_at,raw_content) VALUES($1,'2026-10-19T10:00:00Z','更早的沟通') RETURNING id`,[a])).rows[0].id;
 const analysis=(await q(`INSERT INTO analyses(communication_id,focus,ability_dimension,ability_observation,ability_evidence) VALUES($1,'person','沟通追问','观察记录','["原文依据"]'::jsonb) RETURNING id`,[source])).rows[0].id;
 await q(`INSERT INTO ability_observations(analysis_id,communication_id,dimension,observation,state) VALUES($1,$2,'沟通追问','观察','已采纳待验证')`,[analysis,source]);n++;
 const act=(await q(`INSERT INTO action_items(analysis_id,communication_id,kind,title) VALUES($1,$2,'training','学习追问') RETURNING id`,[analysis,source])).rows[0].id;
 await q(`INSERT INTO validations(action_id,followup_communication_id,observed_behavior) VALUES($1,$2,'已追问')`,[act,follow]);n++;
 await q('SAVEPOINT bad_validation');rejected=false;try{await q(`INSERT INTO validations(action_id,followup_communication_id,observed_behavior) VALUES($1,$2,'应拒绝')`,[act,old])}catch{rejected=true}finally{await q('ROLLBACK TO SAVEPOINT bad_validation')}assert.ok(rejected,'必须拒绝早于来源的后续验证');n++;
 await q('ROLLBACK');console.log(`真实PostgreSQL集成：${n}项检查通过；全部测试记录已回滚`);
}catch(e){console.error('PostgreSQL集成测试未通过：',e.message);try{await q('ROLLBACK')}catch{}process.exitCode=1}finally{await client.end()}
