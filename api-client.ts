export async function api<T=unknown>(url:string,method='GET',body?:unknown):Promise<T>{
 const res=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin'});
 let data:any={};try{data=await res.json()}catch{}
 if(!res.ok)throw new Error(data.message||`操作失败（${res.status}）`);return data as T;
}
