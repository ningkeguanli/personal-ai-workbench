import {NextRequest,NextResponse} from 'next/server';import {apiGuard} from '@/lib/auth';import {rows} from '@/lib/db';import {failed} from '@/lib/http';
export async function GET(req:NextRequest){const g=apiGuard(req);if(g)return g;try{
 const q=(new URL(req.url).searchParams.get('q')||'').trim().slice(0,100);if(q.length<1)return NextResponse.json({results:[]});const term='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
 const [clients,projects,tasks]=await Promise.all([
 rows(`SELECT id,name AS title FROM clients WHERE name ILIKE $1 ESCAPE '\\' LIMIT 10`,[term]),
 rows(`SELECT id,title FROM projects WHERE title ILIKE $1 ESCAPE '\\' LIMIT 10`,[term]),
 rows(`SELECT id,title FROM tasks WHERE title ILIKE $1 ESCAPE '\\' LIMIT 10`,[term])
 ]);return NextResponse.json({results:[...clients.map(x=>({...x,kind:'客户'})),...projects.map(x=>({...x,kind:'项目'})),...tasks.map(x=>({...x,kind:'任务'}))]});
}catch(e){return failed(e)}}
