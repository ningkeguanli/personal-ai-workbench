import {Pool, type PoolClient, type QueryResultRow} from 'pg';
const holder=globalThis as unknown as { __workbenchPool?: Pool };
export function pool(): Pool {
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL_NOT_CONFIGURED');
  if(!holder.__workbenchPool){
    holder.__workbenchPool=new Pool({connectionString:process.env.DATABASE_URL,max:5,ssl:process.env.PGSSL==='require'?{rejectUnauthorized:true}:undefined});
  }
  return holder.__workbenchPool;
}
export async function rows<T extends QueryResultRow=QueryResultRow>(sql:string,params:unknown[]=[]):Promise<T[]> {
  return (await pool().query<T>(sql,params)).rows;
}
export async function one<T extends QueryResultRow=QueryResultRow>(sql:string,params:unknown[]=[]):Promise<T|null>{
  return (await rows<T>(sql,params))[0]??null;
}
export async function transaction<T>(fn:(client:PoolClient)=>Promise<T>):Promise<T>{
  const c=await pool().connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
}
