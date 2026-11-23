(() => {
  const grid = document.getElementById("game-grid");
  const welcome = document.getElementById("welcome-screen");
  const menu = document.getElementById("menu-screen");
  const proxy = document.getElementById("proxy-screen");
  const gunspinScreen = document.getElementById("gunspin-screen");
  const cookieClickerScreen = document.getElementById("cookieclicker-screen");
  const accountScreen = document.getElementById("account-screen");
  const minecraftScreen = document.getElementById("minecraft-screen");
  const groupcatScreen = document.getElementById("groupcat-screen");
  const finmalcScreen = document.getElementById("finmalc-screen");
  const appShell = document.querySelector(".app-shell");
  const showScreen = screen => { welcome.hidden = screen !== "welcome"; menu.hidden = screen !== "menu"; proxy.hidden = screen !== "proxy"; gunspinScreen.hidden = screen !== "gunspin"; cookieClickerScreen.hidden = screen !== "cookieclicker"; accountScreen.hidden = screen !== "account"; minecraftScreen.hidden = screen !== "minecraft"; groupcatScreen.hidden = screen !== "groupcat"; finmalcScreen.hidden = screen !== "finmalc"; appShell.hidden = screen !== "games"; window.scrollTo(0,0); };
  const search = document.getElementById("search");
  const count = document.getElementById("game-count");
  const title = document.getElementById("section-title");
  const empty = document.getElementById("empty-state");
  const sort = document.getElementById("sort");
  const overlay = document.getElementById("player-overlay");
  const frame = document.getElementById("game-frame");
  const playerTitle = document.getElementById("player-title");
  const icons = {arcade:"✦",action:"⚔",puzzle:"◇",racing:"⌁",sports:"◉",strategy:"♟"};
  const colors = {arcade:"linear-gradient(135deg,#39284e,#1c1b2a)",action:"linear-gradient(135deg,#4a293b,#211923)",puzzle:"linear-gradient(135deg,#293d50,#1b202b)",racing:"linear-gradient(135deg,#51402b,#211e1b)",sports:"linear-gradient(135deg,#24453e,#1b2424)",strategy:"linear-gradient(135deg,#3d3855,#211f2d)"};
  let category = "all";
  let query = "";
  let games = Array.isArray(window.GAMES) ? window.GAMES : [];
  const getStore = key => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };
  const saveStore = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value.slice(0,30))); } catch {} if (window.GROUPCAT_ACCOUNT?.user) syncAccountData(); };
  const recent = getStore("groupcat-recent");
  const favorites = getStore("groupcat-favorites");
  window.GROUPCAT_ACCOUNT = { user: null, mode: "login", syncing: false, syncPending: false };
  const accountMessage = document.getElementById("account-message");
  function accountStatus(message, error=false) { accountMessage.textContent=message; accountMessage.classList.toggle("error",error); }
  function setAccountMode(mode) {
    window.GROUPCAT_ACCOUNT.mode=mode;
    document.getElementById("account-login-tab").classList.toggle("active",mode==="login");
    document.getElementById("account-signup-tab").classList.toggle("active",mode==="signup");
    document.getElementById("account-heading").textContent=mode==="login"?"Welcome back.":"Create your account.";
    document.getElementById("account-description").textContent=mode==="login"?"Sign in to sync your favourites and recently played games across devices.":"Pick a username and password. Your game data will be saved to your account.";
    document.getElementById("account-submit").innerHTML=(mode==="login"?"Log in":"Create account")+" <span>↗</span>";
    document.getElementById("account-password").autocomplete=mode==="login"?"current-password":"new-password";
    document.getElementById("account-password").minLength=mode==="login"?1:8;
    accountStatus("");
  }
  async function accountRequest(action, body) {
    const response=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({action,...body})});
    const data=await response.json().catch(()=>({error:"The server returned an invalid response."}));
    if(!response.ok) throw new Error(data.error||"Something went wrong.");
    return data;
  }
  async function syncAccountData() {
    if(!window.GROUPCAT_ACCOUNT.user)return;
    if(window.GROUPCAT_ACCOUNT.syncing){window.GROUPCAT_ACCOUNT.syncPending=true;return;}
    window.GROUPCAT_ACCOUNT.syncing=true;
    try {
      do {
        window.GROUPCAT_ACCOUNT.syncPending=false;
        const response=await fetch("/api/data",{method:"PUT",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({favorites,recent})});
        if(!response.ok) throw new Error("Could not save your account data.");
      } while(window.GROUPCAT_ACCOUNT.syncPending);
      document.getElementById("account-signed-message").textContent="Your game data is saved.";
      updateAccountStats();
    } catch(error) { document.getElementById("account-signed-message").textContent=error.message; }
    finally { window.GROUPCAT_ACCOUNT.syncing=false; }
  }
  function updateAccountStats() {
    document.getElementById("account-fav-count").textContent=favorites.length;
    document.getElementById("account-recent-count").textContent=recent.length;
  }
  async function loadAccountData() {
    const response=await fetch("/api/data",{credentials:"same-origin"});
    if(!response.ok) throw new Error("Signed in, but your saved data could not be loaded.");
    const data=await response.json();
    window.GROUPCAT_ACCOUNT.syncing=true;
    favorites.splice(0,favorites.length,...(Array.isArray(data.favorites)?data.favorites:[]));
    recent.splice(0,recent.length,...(Array.isArray(data.recent)?data.recent:[]));
    try { localStorage.setItem("groupcat-favorites",JSON.stringify(favorites)); localStorage.setItem("groupcat-recent",JSON.stringify(recent)); } catch {}
    window.GROUPCAT_ACCOUNT.syncing=false;
    updateAccountStats(); render();
  }
  function showAccountUser(user) {
    window.GROUPCAT_ACCOUNT.user=user;
    document.getElementById("account-logged-out").hidden=!!user;
    document.getElementById("account-logged-in").hidden=!user;
    if(user) {
      document.getElementById("account-welcome").textContent="Hi, "+user.username+".";
      document.getElementById("account-avatar").textContent=user.username.slice(0,1).toUpperCase();
      updateAccountStats();
      document.getElementById("account-signed-message").textContent="Loading your saved data…";
    }
  }
  async function checkExistingSession() {
    try {
      const response=await fetch("/api/auth",{credentials:"same-origin"});
      if(!response.ok)return;
      const data=await response.json();
      if(data.user){showAccountUser(data.user);await loadAccountData();}
    } catch {}
  }

  const cookieFrame=document.getElementById("cookieclicker-frame");
  const cookieSaveList=document.getElementById("cookie-save-list");
  const cookieSaveMessage=document.getElementById("cookie-save-message");
  let cookieSaves=[];
  const cookieSaveStatus=message=>{cookieSaveMessage.textContent=message;};
  async function refreshCookieSaves(){
    if(!window.GROUPCAT_ACCOUNT.user)return;
    cookieSaveStatus("Loading your saves…");
    try{
      const response=await fetch("/api/cookie-saves",{credentials:"same-origin"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Could not load your saves.");
      cookieSaves=Array.isArray(data.saves)?data.saves:[];
      document.getElementById("cookie-save-count").textContent=cookieSaves.length+" / 3 slots used";
      cookieSaveList.replaceChildren();
      if(!cookieSaves.length){
        const empty=document.createElement("p");empty.className="cookie-save-empty";empty.textContent="No saves yet. Start playing, name your bakery save, then press Save current game.";cookieSaveList.append(empty);
      }
      for(const save of cookieSaves){
        const card=document.createElement("article");card.className="cookie-save-card";
        const details=document.createElement("div");details.className="cookie-save-details";
        const name=document.createElement("strong");name.textContent=save.name;
        const date=document.createElement("span");date.textContent="Last saved "+new Date(save.updated_at).toLocaleString();
        details.append(name,date);
        const actions=document.createElement("div");actions.className="cookie-save-actions";
        for(const [action,label] of [["load","Load"],["update","Update"],["delete","Delete"]]){
          const button=document.createElement("button");button.type="button";button.dataset.action=action;button.dataset.id=save.id;button.textContent=label;
          if(action==="delete")button.className="danger";
          actions.append(button);
        }
        card.append(details,actions);cookieSaveList.append(card);
      }
      cookieSaveStatus("");
      document.getElementById("cookie-save-new").disabled=cookieSaves.length>=3;
    }catch(error){cookieSaveStatus(error.message);cookieSaveList.replaceChildren();document.getElementById("cookie-save-new").disabled=true;}
  }
  async function waitForCookieGame(){
    if(cookieFrame.contentWindow?.GroupcatCookieGame)return cookieFrame.contentWindow.GroupcatCookieGame;
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error("Cookie Clicker is still loading. Try again in a moment.")),15000);
      cookieFrame.addEventListener("load",()=>{clearTimeout(timer);resolve();},{once:true});
    });
    if(!cookieFrame.contentWindow?.GroupcatCookieGame)throw new Error("Cookie Clicker did not finish loading. Refresh the page and try again.");
    return cookieFrame.contentWindow.GroupcatCookieGame;
  }
  async function saveCookieSlot(id=null){
    try{
      const existing=cookieSaves.find(s=>s.id===id);
      const name=existing?existing.name:document.getElementById("cookie-save-name").value.trim();
      if(!name)throw new Error("Enter a name for this save first.");
      if(!id&&cookieSaves.length>=3)throw new Error("You already have 3 saves. Delete one first.");
      const game=await waitForCookieGame();
      const save=game.exportSave();
      const response=await fetch("/api/cookie-saves",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({id,name,save})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Could not save your bakery.");
      if(!id)document.getElementById("cookie-save-name").value="";
      cookieSaveStatus("Bakery saved to your account.");
      await refreshCookieSaves();
    }catch(error){cookieSaveStatus(error.message);}
  }
  document.getElementById("cookie-save-new").addEventListener("click",()=>saveCookieSlot());
  cookieSaveList.addEventListener("click",async event=>{
    const button=event.target.closest("button[data-action]");if(!button)return;
    const id=button.dataset.id,action=button.dataset.action;
    if(action==="delete"){
      if(!confirm("Delete this Cookie Clicker save permanently?"))return;
      try{const response=await fetch("/api/cookie-saves?id="+encodeURIComponent(id),{method:"DELETE",credentials:"same-origin"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not delete save.");cookieSaveStatus("Save deleted.");await refreshCookieSaves();}catch(error){cookieSaveStatus(error.message);}
    }else if(action==="update"){await saveCookieSlot(id);}
    else if(action==="load"){
      try{
        const response=await fetch("/api/cookie-saves?id="+encodeURIComponent(id),{credentials:"same-origin"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not load save.");
        const game=await waitForCookieGame();game.importSave(data.save);cookieSaveStatus("Loaded "+data.name+".");
      }catch(error){cookieSaveStatus(error.message);}
    }
  });
  document.getElementById("menu-cookieclicker").addEventListener("click",()=>{if(window.GROUPCAT_ACCOUNT.user)refreshCookieSaves();});

  document.getElementById("account-login-tab").addEventListener("click",()=>setAccountMode("login"));
  document.getElementById("account-signup-tab").addEventListener("click",()=>setAccountMode("signup"));
  document.getElementById("account-form").addEventListener("submit",async event=>{
    event.preventDefault();
    const username=document.getElementById("account-username").value.trim();
    const password=document.getElementById("account-password").value;
    const button=document.getElementById("account-submit");
    button.disabled=true; accountStatus("Please wait…");
    try {
      const data=await accountRequest(window.GROUPCAT_ACCOUNT.mode,{username,password});
      showAccountUser(data.user);
      if(window.GROUPCAT_ACCOUNT.mode==="signup") {
        const saved=await fetch("/api/data",{method:"PUT",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({favorites,recent})});
        if(!saved.ok) throw new Error("Account created, but the database needs to be connected before data can be saved.");
      } else { await loadAccountData(); }
      document.getElementById("account-signed-message").textContent="Account ready. Your data is saved.";
    } catch(error) { accountStatus(error.message,true); }
    finally { button.disabled=false; }
  });
  document.getElementById("account-logout").addEventListener("click",async()=>{
    try { await accountRequest("logout",{}); } catch {}
    showAccountUser(null); accountStatus("You have been logged out."); setAccountMode("login");
  });
  document.getElementById("menu-account").addEventListener("click",()=>{showScreen("account");});
  document.getElementById("minecraft-launch").addEventListener("click",async()=>{
    const button=document.getElementById("minecraft-launch");
    const status=document.getElementById("minecraft-status");
    button.disabled=true; status.textContent="Checking the self-hosted Minecraft client…";
    try {
      const response=await fetch("/minecraft/26.3.html",{method:"HEAD",cache:"no-store"});
      if(!response.ok) {
        status.textContent=response.status===503
          ?"Minecraft storage is not connected yet. The site owner needs to add the client file to Cloudflare R2."
          :"The Minecraft 26.3 client file has not been uploaded yet.";
        return;
      }
      document.getElementById("minecraft-frame").src="/minecraft/26.3.html";
      document.getElementById("minecraft-frame-wrap").hidden=false;
      status.textContent="Loading Minecraft 26.3…";
      button.hidden=true;
    } catch {
      status.textContent="Could not reach the self-hosted Minecraft file. Try again after the site has deployed.";
    } finally { button.disabled=false; }
  });



  function selectCategory(next) {
    category = next;
    document.querySelectorAll("[data-category]").forEach(el => el.classList.toggle("active", el.classList.contains("nav-link") && el.dataset.category === next));
    document.querySelectorAll(".filter-chip").forEach(el => el.classList.toggle("selected", el.dataset.category === next));
    const labels = {all:"All games",popular:"Popular games",recent:"Recently played",favorites:"Favourites",arcade:"Arcade",action:"Action",puzzle:"Puzzle",racing:"Racing",sports:"Sports",strategy:"Strategy"};
    title.childNodes[0].textContent = (labels[next] || "All games") + " ";
    render();
  }
  function visibleGames() {
    let list = games.filter(g => {
      const matchCategory = category === "all" || category === "popular" || category === "recent" || category === "favorites" || g.category === category;
      const haystack = (g.name+" "+g.description+" "+g.category+" "+(g.tags||[]).join(" ")).toLowerCase();
      return matchCategory && haystack.includes(query);
    });
    if (category === "recent") list = recent.map(id => games.find(g => g.id === id)).filter(Boolean).filter(g => (g.name+" "+g.description).toLowerCase().includes(query));
    if (category === "favorites") list = favorites.map(id => games.find(g => g.id === id)).filter(Boolean).filter(g => (g.name+" "+g.description).toLowerCase().includes(query));
    if (category === "popular") list = list.slice(0,24);
    if (sort.value === "name") list.sort((a,b)=>a.name.localeCompare(b.name));
    return list;
  }
  function render() {
    const list = visibleGames();
    count.textContent = list.length;
    grid.innerHTML = "";
    empty.hidden = list.length !== 0;
    list.forEach(game => {
      const card = document.createElement("article");
      card.className = "game-card";
      card.tabIndex = 0;
      card.setAttribute("role","button");
      card.setAttribute("aria-label","Play "+game.name);
      const thumb = document.createElement("div");
      thumb.className = "game-thumb";
      thumb.style.background = colors[game.category] || colors.arcade;
      const tag = document.createElement("span");
      tag.className = "game-tag";
      tag.textContent = game.category;
      const icon = document.createElement("span");
      icon.className = "thumb-icon";
      icon.textContent = icons[game.category] || "✦";
      const play = document.createElement("span");
      play.className = "card-play";
      play.textContent = "▶";
      const fav = document.createElement("button");
      fav.className = "favorite-btn" + (favorites.includes(game.id) ? " is-favorite" : "");
      fav.type = "button";
      fav.textContent = favorites.includes(game.id) ? "♥" : "♡";
      fav.title = favorites.includes(game.id) ? "Remove from favourites" : "Add to favourites";
      fav.addEventListener("click", e => { e.stopPropagation(); const next = favorites.includes(game.id) ? favorites.filter(id => id !== game.id) : [game.id, ...favorites]; favorites.splice(0, favorites.length, ...next); saveStore("groupcat-favorites", favorites); render(); });
      thumb.append(tag,icon,play,fav);
      const info = document.createElement("div");
      info.className = "game-info";
      const name = document.createElement("div");
      name.className = "game-title";
      name.textContent = game.name;
      const desc = document.createElement("div");
      desc.className = "game-desc";
      desc.textContent = game.description || "Play now";
      info.append(name,desc);
      card.append(thumb,info);
      const open = () => launch(game);
      card.addEventListener("click",open);
      card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}});
      grid.append(card);
    });
  }
  function launch(game) {
    recent.unshift(game.id);
    saveStore("groupcat-recent",[...new Set(recent)]);
    if (game.external) {
      window.open(game.path, "_blank", "noopener,noreferrer");
      return;
    }
    overlay.hidden = false;
    playerTitle.textContent = game.name;
    frame.src = game.path;
    document.body.style.overflow = "hidden";
    history.replaceState(null,"","#play="+encodeURIComponent(game.id));
  }
  function close() {
    overlay.hidden = true;
    frame.src = "about:blank";
    document.body.style.overflow = "";
    history.replaceState(null,"",location.pathname+location.search);
  }
  document.getElementById("welcome-play").addEventListener("click",()=>showScreen("menu"));
  document.getElementById("menu-back-home").addEventListener("click",()=>showScreen("welcome"));
  document.getElementById("menu-proxy").addEventListener("click",()=>showScreen("proxy"));
  document.getElementById("account-back").addEventListener("click",()=>showScreen("menu"));
  document.getElementById("menu-groupcat").addEventListener("click",()=>{document.getElementById("groupcat-lock").hidden=false;document.getElementById("groupcat-secret").hidden=true;document.getElementById("groupcat-password").value="";document.getElementById("groupcat-password-error").hidden=true;showScreen("groupcat");});
  document.getElementById("groupcat-back").addEventListener("click",()=>showScreen("menu"));
  document.getElementById("groupcat-password-form").addEventListener("submit",e=>{e.preventDefault();if(document.getElementById("groupcat-password").value==="finmilk"){document.getElementById("groupcat-lock").hidden=true;document.getElementById("groupcat-secret").hidden=false;}else{document.getElementById("groupcat-password-error").hidden=false;}});
  document.getElementById("menu-finmalc").addEventListener("click",()=>showScreen("finmalc"));
  document.getElementById("finmalc-back").addEventListener("click",()=>showScreen("menu"));
  document.getElementById("proxy-back").addEventListener("click",()=>showScreen("menu"));
  document.getElementById("games-back").addEventListener("click",()=>showScreen("menu"));
  document.querySelectorAll("[data-category]").forEach(el=>el.addEventListener("click",()=>selectCategory(el.dataset.category)));
  search.addEventListener("input",()=>{query=search.value.trim().toLowerCase();render();});
  sort.addEventListener("change",render);
  document.getElementById("close-player").addEventListener("click",close);
  document.getElementById("fullscreen").addEventListener("click",()=>{const target=frame; if(target.requestFullscreen) target.requestFullscreen();});
  overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&!overlay.hidden)close();
    if(e.key==="/"&&overlay.hidden&&document.activeElement!==search){e.preventDefault();search.focus();}
  });
  const hash = new URLSearchParams(location.hash.slice(1));
  const requested = hash.get("play");
  if(requested){const game=games.find(g=>g.id===requested);if(game)launch(game);}
  render();
  checkExistingSession();
})();