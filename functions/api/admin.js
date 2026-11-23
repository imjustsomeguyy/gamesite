const COOKIE="gc_admin";
const json=(data,status=200,headers={})=>Response.json(data,{status,headers});
const enc=value=>btoa(String.fromCharCode(...new TextEncoder().encode(value))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const dec=value=>new TextDecoder().decode(Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-value.length%4)%4)),c=>c.charCodeAt(0)));
const cookie=request=>{const m=request.headers.get("Cookie")?.match(/(?:^|;\s*)gc_admin=([^;]*)/);return m?decodeURIComponent(m[1]):null;};
const cookieHeader=(value,age)=>`${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
async function sign(payload,secret){
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return enc(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(payload)));
}
async function validSession(request,secret){
 try{
  const raw=cookie(request);if(!raw)return false;
  const [payload,signature]=raw.split(".");if(!payload||!signature)return false;
  const expected=await sign(payload,secret);
  const a=new TextEncoder().encode(signature),b=new TextEncoder().encode(expected);
  if(a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
  if(diff!==0)return false;
  return JSON.parse(dec(payload)).exp>Date.now();
 }catch{return false;}
}
export async function onRequest({request,env}){
 if(!env.GROUPCAT_ADMIN_PASSWORD)return json({error:"Admin password secret is not configured in Cloudflare Pages."},503);
 if(!env.DB)return json({error:"D1 database binding DB is missing."},503);
 if(request.method==="POST"){
  let body;try{body=await request.json();}catch{return json({error:"Invalid request."},400);}
  if(body.action==="login"){
   const supplied=String(body.password||"");
   const a=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(supplied));
   const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(env.GROUPCAT_ADMIN_PASSWORD));
   const aa=new Uint8Array(a),bb=new Uint8Array(b);let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];
   if(diff!==0)return json({error:"Incorrect admin password."},401);
   const payload=enc(JSON.stringify({exp:Date.now()+8*60*60*1000,nonce:crypto.randomUUID()}));
   const token=payload+"."+await sign(payload,env.GROUPCAT_ADMIN_PASSWORD);
   return json({ok:true},200,{"Set-Cookie":cookieHeader(token,8*60*60)});
  }
  if(body.action==="logout")return json({ok:true},200,{"Set-Cookie":cookieHeader("",0)});
  return json({error:"Unknown action."},400);
 }
 if(request.method!=="GET")return json({error:"Method not allowed."},405);
 if(!await validSession(request,env.GROUPCAT_ADMIN_PASSWORD))return json({error:"Admin login required."},401);
 try{
  const users=await env.DB.prepare("SELECT id,username,created_at FROM users ORDER BY created_at DESC LIMIT 500").all();
  const data=await env.DB.prepare("SELECT user_id,data_json,updated_at FROM user_data").all();
  const saves=await env.DB.prepare("SELECT id,user_id,name,length(save_data) AS bytes,created_at,updated_at,last_played_at FROM cookie_saves ORDER BY last_played_at DESC LIMIT 1500").all();
  const dataByUser=new Map((data.results||[]).map(row=>[row.user_id,row]));
  const savesByUser=new Map();
  for(const save of saves.results||[]){if(!savesByUser.has(save.user_id))savesByUser.set(save.user_id,[]);savesByUser.get(save.user_id).push({id:save.id,name:save.name,bytes:save.bytes,createdAt:save.created_at,updatedAt:save.updated_at,lastPlayedAt:save.last_played_at});}
  return json({ok:true,accounts:(users.results||[]).map(user=>{
   let saved={favorites:[],recent:[]};const row=dataByUser.get(user.id);
   if(row?.data_json){try{const parsed=JSON.parse(row.data_json);saved={favorites:Array.isArray(parsed.favorites)?parsed.favorites:[],recent:Array.isArray(parsed.recent)?parsed.recent:[]};}catch{}}
   return {id:user.id,username:user.username,createdAt:user.created_at,dataUpdatedAt:row?.updated_at||null,favorites:saved.favorites,recent:saved.recent,cookieSaves:savesByUser.get(user.id)||[]};
  }),counts:{accounts:(users.results||[]).length,cookieSaves:(saves.results||[]).length}});
 }catch{return json({error:"Could not read the account tables. Check the D1 schema and migrations."},500);}
}
