import {cookies, headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {NextRequest, NextResponse} from 'next/server';
const SESSION='pw_session';
const TTL=7*24*60*60*1000;
function secret(){const v=process.env.APP_SESSION_SECRET;if(!v||v.length<32)throw new Error('APP_SESSION_SECRET must be at least 32 characters');return v}
function mac(v:string){return createHmac('sha256',secret()).update(v).digest('base64url')}
export function checkPassword(v:string){const expected=process.env.APP_PASSWORD;if(!expected||expected.length<12)throw new Error('APP_PASSWORD must be at least 12 characters');const a=Buffer.from(expected),b=Buffer.from(v);return a.length===b.length&&timingSafeEqual(a,b)}
export function makeSession(){const expires=String(Date.now()+TTL);return expires+'.'+mac(expires)}
export function validateSession(token?:string){if(!token)return false;const [expires,signature,...extra]=token.split('.');if(!expires||!signature||extra.length||!/^[0-9]+$/.test(expires)||Number(expires)<Date.now())return false;const a=Buffer.from(mac(expires)),b=Buffer.from(signature);return a.length===b.length&&timingSafeEqual(a,b)}
export const cookieConfig={httpOnly:true,sameSite:'strict' as const,secure:process.env.NODE_ENV==='production',path:'/',maxAge:TTL/1000};
export async function pageAuthorized(){const jar=await cookies();return validateSession(jar.get(SESSION)?.value)}
export async function requirePageAuth(){if(!(await pageAuthorized()))redirect('/login')}
export function publicHostAllowed(request:NextRequest){const origin=request.headers.get('origin');if(!origin)return false;const h=request.headers.get('x-forwarded-host')||request.headers.get('host');try{return new URL(origin).host===h}catch{return false}}
export function apiGuard(request:NextRequest):NextResponse|null{
  const token=request.cookies.get(SESSION)?.value;
  if(!validateSession(token))return NextResponse.json({error:'UNAUTHORIZED',message:'请先登录'},{status:401});
  if(request.method!=='GET'&&!publicHostAllowed(request))return NextResponse.json({error:'ORIGIN_REJECTED',message:'请求来源校验失败'},{status:403});
  return null;
}
export function setSessionCookie(response:NextResponse){response.cookies.set(SESSION,makeSession(),cookieConfig)}
export function clearSessionCookie(response:NextResponse){response.cookies.set(SESSION,'',{...cookieConfig,maxAge:0})}
