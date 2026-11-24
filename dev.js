(()=>{
 const $=id=>document.getElementById(id),login=$("login-panel"),dashboard=$("dashboard");
 $("back").addEventListener("click",()=>location.href="/");
 $("theme-choice").value=localStorage.getItem("gc_theme")||"mono";
 $("cloak-choice").value=localStorage.getItem("gc_url_cloak")||"on";
 function applySettings(){
  localStorage.setItem("gc_theme",$("theme-choice").value);
  localStorage.setItem("gc_url_cloak",$("cloak-choice").value);
  if($("cloak-choice").value==="on"){
   const random=Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,"0")).join("");
   history.replaceState(history.state,"",location.pathname+"?s="+random);
  }else{history.replaceState(history.state,"",location.pathname);}
  $("settings-status").textContent="Saved. URL display setting applied immediately.";
 }
 $("theme-choice").addEventListener("change",applySettings);$("cloak-choice").addEventListener("change",applySettings);
 async function load(){
  $("system-status").textContent="Checking D1 and loading account records…";
  try{
   const response=await fetch("/api/admin",{credentials:"same-origin",cache:"no-store"});
   const data=await response.json();if(!response.ok)throw new Error(data.error||"Admin request failed.");
   $("account-count").textContent=data.counts.accounts;$("save-count").textContent=data.counts.cookieSaves;$("api-status").textContent="ONLINE";$("system-status").textContent="Database query completed successfully.";
   const list=$("accounts-list");list.replaceChildren();
   if(!data.accounts.length){list.textContent="No accounts have been created yet.";return;}
   for(const account of data.accounts){
    const article=document.createElement("article");article.className="dev-account";
    const head=document.createElement("div");head.className="dev-account-head";
    const name=document.createElement("h3");name.textContent=account.username;
    const created=document.createElement("small");created.textContent="Created "+new Date(account.createdAt).toLocaleString();
    head.append(name,created);
    const info=document.createElement("div");info.className="dev-data";
    info.textContent="Account ID: "+account.id+" · Active sessions: "+account.activeSessions+" · Favourites: "+account.favorites.length+" · Recently played: "+account.recent.length+" · Data updated: "+(account.dataUpdatedAt?new Date(account.dataUpdatedAt).toLocaleString():"Never");
    const fav=document.createElement("div");fav.className="dev-data";fav.textContent="Favourites: "+(account.favorites.join(", ")||"None");
    const recent=document.createElement("div");recent.className="dev-data";recent.textContent="Recent games: "+(account.recent.join(", ")||"None");
    article.append(head,info,fav,recent);
    const saves=document.createElement("div");saves.className="dev-data";
    if(account.cookieSaves.length){saves.textContent="Cookie Clicker saves: ";for(const save of account.cookieSaves){const tag=document.createElement("span");tag.className="dev-save";tag.textContent=save.name+" · "+Math.max(1,Math.round(save.bytes/1024))+" KB · last played "+new Date(save.lastPlayedAt||save.updatedAt).toLocaleString();saves.append(tag);}}
    else saves.textContent="Cookie Clicker saves: none";
    article.append(saves);list.append(article);
   }
  }catch(error){$("api-status").textContent="ERROR";$("system-status").textContent=error.message;}
 }
 const DEV_PASSWORD="chinners";
 $("login-form").addEventListener("submit",async event=>{
  event.preventDefault();
  if($("admin-password").value!==DEV_PASSWORD){$("login-status").textContent="Incorrect Dev Mode password.";return;}
  $("admin-password").value="";
  login.hidden=true;dashboard.hidden=false;
  await load();
 });
 $("refresh").addEventListener("click",load);
 $("logout").addEventListener("click",()=>{dashboard.hidden=true;login.hidden=false;$("system-status").textContent="Dev Mode locked.";});
})();
