const COOKIE="gc_session";
const json=(data,status=200)=>Response.json(data,{status});
const digest=async value=>{
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
};
function cookieValue(request){
  const match=request.headers.get("Cookie")?.match(/(?:^|;\s*)gc_session=([^;]*)/);
  return match?decodeURIComponent(match[1]):null;
}
async function userFor(request,env){
  const token=cookieValue(request);if(!token)return null;
  return await env.DB.prepare("SELECT users.id,users.username FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?").bind(await digest(token),Date.now()).first();
}
export async function onRequest(context){
  const {request,env}=context;
  if(!env.DB)return json({error:"Accounts database is not connected."},503);
  try{
    const user=await userFor(request,env);
    if(!user)return json({error:"Please log in to use Cookie Clicker cloud saves."},401);
    if(request.method==="GET"){
      const id=new URL(request.url).searchParams.get("id");
      if(id){
        const now=Date.now();
        const row=await env.DB.prepare("SELECT id,name,save_data,created_at,updated_at FROM cookie_saves WHERE id=? AND user_id=?").bind(id,user.id).first();
        if(!row)return json({error:"Save not found."},404);
        await env.DB.prepare("UPDATE cookie_saves SET last_played_at=? WHERE id=? AND user_id=?").bind(now,id,user.id).run();
        return json({id:row.id,name:row.name,save:row.save_data,createdAt:row.created_at,updatedAt:row.updated_at,lastPlayedAt:now});
      }
      const result=await env.DB.prepare("SELECT id,name,created_at,updated_at,last_played_at FROM cookie_saves WHERE user_id=? ORDER BY last_played_at DESC").bind(user.id).all();
      return json({saves:result.results||[],limit:3});
    }
    if(request.method==="POST"){
      const body=await request.json();
      const name=String(body.name||"").trim().slice(0,32);
      const save=String(body.save||"");
      if(!name)return json({error:"Give this save a name."},400);
      if(!save||save.length>1000000)return json({error:"The save is empty or too large (maximum 1 MB)."},413);
      try{const parsed=JSON.parse(save);if(!parsed||typeof parsed!=="object"||typeof parsed.cookies!=="number"||!parsed.upgrades)throw new Error("Invalid save");}
      catch{return json({error:"That Cookie Clicker save is invalid."},400);}
      const now=Date.now();
      if(body.id){
        const result=await env.DB.prepare("UPDATE cookie_saves SET name=?,save_data=?,updated_at=?,last_played_at=? WHERE id=? AND user_id=?").bind(name,save,now,now,String(body.id),user.id).run();
        if(!result.meta?.changes)return json({error:"Save not found."},404);
        return json({ok:true,id:body.id,updatedAt:now});
      }
      const id=crypto.randomUUID();
      const result=await env.DB.prepare("INSERT INTO cookie_saves (id,user_id,name,save_data,created_at,updated_at,last_played_at) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM cookie_saves WHERE user_id=?) < 3").bind(id,user.id,name,save,now,now,now,user.id).run();
      if(!result.meta?.changes)return json({error:"You already have 3 saves. Delete one before creating another."},409);
      return json({ok:true,id,createdAt:now});
    }
    if(request.method==="DELETE"){
      const id=new URL(request.url).searchParams.get("id");
      if(!id)return json({error:"Choose a save to delete."},400);
      const result=await env.DB.prepare("DELETE FROM cookie_saves WHERE id=? AND user_id=?").bind(id,user.id).run();
      return result.meta?.changes?json({ok:true}):json({error:"Save not found."},404);
    }
    return json({error:"Method not allowed."},405);
  }catch(error){
    return json({error:"Could not access your Cookie Clicker saves. Check the D1 migration has been run."},500);
  }
}
