const COOKIE = "gc_session";
const SESSION_DAYS = 30;
const json = (data, status=200, headers={}) => Response.json(data,{status,headers});
const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const randomToken = () => { const bytes=new Uint8Array(32); crypto.getRandomValues(bytes); return b64url(bytes); };
const digest = async value => b64url(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)));
const cookieValue = (request,name) => {
  const match=request.headers.get("Cookie")?.match(new RegExp("(?:^|;\\s*)"+name+"=([^;]*)"));
  return match?decodeURIComponent(match[1]):null;
};
const cookieHeader = (value,maxAge) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const passwordHash = async (password,salt) => {
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:210000,hash:"SHA-256"},key,256);
  return b64url(bits);
};
const decodeSalt = value => Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));
async function currentUser(request,env) {
  const token=cookieValue(request,COOKIE);
  if(!token)return null;
  const row=await env.DB.prepare("SELECT users.id, users.username FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?").bind(await digest(token),Date.now()).first();
  return row?{id:row.id,username:row.username}:null;
}
export async function onRequest(context) {
  const {request,env}=context;
  if(!env.DB)return json({error:"Accounts are not connected yet. The site owner needs to connect the Groupcat D1 database."},503);
  if(request.method==="GET") {
    try { return json({user:await currentUser(request,env)}); }
    catch { return json({error:"Account database is not ready."},503); }
  }
  if(request.method!=="POST")return json({error:"Method not allowed."},405);
  let body;
  try { body=await request.json(); } catch { return json({error:"Please send valid account details."},400); }
  const action=body.action;
  if(action==="logout") {
    const token=cookieValue(request,COOKIE);
    if(token)await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await digest(token)).run();
    return json({ok:true},200,{"Set-Cookie":cookieHeader("",0)});
  }
  const username=String(body.username||"").trim();
  const normalized=username.toLowerCase();
  const password=String(body.password||"");
  if(!/^[a-zA-Z0-9_]{3,24}$/.test(username))return json({error:"Username must be 3–24 characters using letters, numbers or underscores."},400);
  if(password.length<8||password.length>128)return json({error:"Password must be between 8 and 128 characters."},400);
  try {
    let user;
    if(action==="signup") {
      const saltBytes=new Uint8Array(16);crypto.getRandomValues(saltBytes);
      const salt=b64url(saltBytes);
      const hash=await passwordHash(password,saltBytes);
      const id=crypto.randomUUID();
      try {
        await env.DB.prepare("INSERT INTO users (id,username,username_norm,password_hash,salt,created_at) VALUES (?,?,?,?,?,?)").bind(id,username,normalized,hash,salt,Date.now()).run();
      } catch(error) {
        if(String(error).toLowerCase().includes("unique"))return json({error:"That username is already taken."},409);
        throw error;
      }
      user={id,username};
    } else if(action==="login") {
      const row=await env.DB.prepare("SELECT id,username,password_hash,salt FROM users WHERE username_norm=?").bind(normalized).first();
      if(!row)return json({error:"Incorrect username or password."},401);
      const check=await passwordHash(password,decodeSalt(row.salt));
      if(check!==row.password_hash)return json({error:"Incorrect username or password."},401);
      user={id:row.id,username:row.username};
    } else return json({error:"Unknown account action."},400);
    const token=randomToken();
    const tokenHash=await digest(token);
    const expires=Date.now()+SESSION_DAYS*86400000;
    await env.DB.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(tokenHash,user.id,expires).run();
    return json({ok:true,user:{username:user.username}},200,{"Set-Cookie":cookieHeader(token,SESSION_DAYS*86400)});
  } catch(error) {
    return json({error:"The account service could not complete that request. Check that the database tables have been created."},503);
  }
}
