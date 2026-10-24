import pg from 'pg';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {baseColumns,assessBaseline} from './schema-baseline.mjs';
const url=process.env.DATABASE_URL;if(!url){console.error('请先配置 DATABASE_URL');process.exit(1)}
const client=new pg.Client({connectionString:url,ssl:process.env.PGSSL==='require'?{rejectUnauthorized:true}:undefined});
try{
 await client.connect();
 // 与其他实例并发迁移时互斥；连接释放后自动解锁。
 await client.query('SELECT pg_advisory_lock(636201)');
 await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations(filename text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())`);
 const {rows:installed}=await client.query('SELECT filename FROM schema_migrations ORDER BY filename');
 const validFiles=readdirSync(resolve('db')).filter(f=>/^\d+_.*\.sql$/.test(f)).sort();
 if(!installed.length){
  const {rows:columns}=await client.query(`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[])`,[Object.keys(baseColumns)]);
  const assessment=assessBaseline(columns);
  if(assessment.status==='partial')throw new Error('检测到不完整的历史数据库，拒绝自动标记001迁移。请备份并检查：'+assessment.missing.join('；'));
  if(assessment.status==='legacy'){
   await client.query('BEGIN');
   try{
    await client.query(`INSERT INTO schema_migrations(filename) VALUES('001_init.sql') ON CONFLICT DO NOTHING`);
    await client.query('COMMIT');
   }catch(e){await client.query('ROLLBACK');throw e}
   console.log('检测到完整的旧版基础结构，已标记001迁移（不修改已有业务记录）');
  }
 }
 for(const filename of validFiles){
  const exists=await client.query('SELECT 1 FROM schema_migrations WHERE filename=$1',[filename]);if(exists.rowCount)continue;
  const sql=readFileSync(resolve('db',filename),'utf8');
  await client.query('BEGIN');
  try{await client.query(sql);await client.query('INSERT INTO schema_migrations(filename) VALUES($1)',[filename]);await client.query('COMMIT');console.log('已应用:',filename)}
  catch(e){await client.query('ROLLBACK');throw e}
 }
 console.log('数据库迁移检查完成');
}catch(e){console.error('数据库迁移失败:',e);process.exitCode=1}
finally{try{await client.query('SELECT pg_advisory_unlock(636201)')}catch{}await client.end()}
