const COOKIE="gc_session";
const json=(data,status=200)=>Response.json(data,{status});
const digest=async value=>{
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
};
function cookieValue(request) {
  const match=request.headers.get("Cookie")?.match(/(?:^|;\\s*)gc_session=([^;]*)/);
  return match?decodeURIComponent(match[1]):null;
}
async function userFor(request,env) {
  const token=cookieValue(request);if(!token)return null;
  return await env.DB.prepare("SELECT users.id,users.username FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?").bind(await digest(token),Date.now()).first();
}
const cleanList=value=>Array.isArray(value)?[...new Set(value.filter(v=>typeof v==="string"&&v.length>0&&v.length<=100))].slice(0,30):[];
export async function onRequest(context) {
  const {request,env}=context;
  if(!env.DB)return json({error:"Accounts database is not connected."},503);
  try {
    const user=await userFor(request,env);
    if(!user)return json({error:"Please log in first."},401);
    if(request.method==="GET") {
      const row=await env.DB.prepare("SELECT data_json FROM user_data WHERE user_id=?").bind(user.id).first();
      let data={favorites:[],recent:[]};
      if(row?.data_json){try{const saved=JSON.parse(row.data_json);data={favorites:cleanList(saved.favorites),recent:cleanList(saved.recent)};}catch{}}
      return json(data);
    }
    if(request.method==="PUT") {
      const body=await request.json();
      const data={favorites:cleanList(body.favorites),recent:cleanList(body.recent)};
      await env.DB.prepare("INSERT INTO user_data (user_id,data_json,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at").bind(user.id,JSON.stringify(data),Date.now()).run();
      return json({ok:true});
    }
    return json({error:"Method not allowed."},405);
  } catch {
    return json({error:"Could not access your saved data."},500);
  }
}
