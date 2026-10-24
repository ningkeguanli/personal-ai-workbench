import {NextRequest,NextResponse} from 'next/server';
import {checkPassword,setSessionCookie,clearSessionCookie} from '@/lib/auth';
import {bad,failed} from '@/lib/http';
export async function POST(req:NextRequest){try{
 const origin=req.headers.get('origin');const host=req.headers.get('x-forwarded-host')||req.headers.get('host');
 if(!origin||new URL(origin).host!==host)return bad('请求来源不正确',403);
 const data=await req.json();if(!data||typeof data.password!=='string')return bad('请输入密码');
 if(!checkPassword(data.password))return NextResponse.json({error:'INVALID_PASSWORD',message:'密码不正确'},{status:401});
 const res=NextResponse.json({ok:true});setSessionCookie(res);return res;
}catch(e){return failed(e)}}
export async function DELETE(req:NextRequest){
 const origin=req.headers.get('origin');const host=req.headers.get('x-forwarded-host')||req.headers.get('host');
 if(!origin||new URL(origin).host!==host)return bad('请求来源不正确',403);
 const res=NextResponse.json({ok:true});clearSessionCookie(res);return res;
}
