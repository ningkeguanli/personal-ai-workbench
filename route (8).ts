import {NextRequest,NextResponse} from 'next/server';
import {apiGuard} from '@/lib/auth';import {rows} from '@/lib/db';import {failed} from '@/lib/http';
export async function GET(req:NextRequest){const g=apiGuard(req);if(g)return g;try{
 const [tasks,clients,projects]=await Promise.all([
  rows(`SELECT t.id,t.title,t.status,t.kind,t.due_date,t.client_id,c.name as client_name FROM tasks t LEFT JOIN clients c ON c.id=t.client_id ORDER BY CASE WHEN t.status='已完成' THEN 1 ELSE 0 END,t.due_date NULLS LAST,t.updated_at DESC LIMIT 30`),
  rows(`SELECT id,name,status,next_action,updated_at FROM clients ORDER BY updated_at DESC LIMIT 8`),
  rows(`SELECT p.id,p.title,p.status,p.next_action,p.updated_at,v.label as current_version FROM projects p LEFT JOIN project_versions v ON v.id=p.current_version_id ORDER BY p.updated_at DESC LIMIT 8`)
 ]);return NextResponse.json({tasks,clients,projects});
}catch(e){return failed(e)}}
