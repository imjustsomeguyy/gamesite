(() => {
  const $=id=>document.getElementById(id);
  const getStore=key=>{try{return JSON.parse(localStorage.getItem(key)||"[]");}catch{return [];}};
  const favorites=getStore("groupcat-favorites");
  const recent=getStore("groupcat-recent");
  window.GROUPCAT_ACCOUNT={user:null,mode:"login",syncing:false,syncPending:false};
  const accountMessage=$("account-message");
  function accountStatus(message,error=false){if(!accountMessage)return;accountMessage.textContent=message;accountMessage.classList.toggle("error",error);}
  function setAccountMode(mode){
    window.GROUPCAT_ACCOUNT.mode=mode;
    $("account-login-tab").classList.toggle("active",mode==="login");
    $("account-signup-tab").classList.toggle("active",mode==="signup");
    $("account-heading").textContent=mode==="login"?"Welcome back.":"Create your account.";
    $("account-description").textContent=mode==="login"?"Sign in to sync your favourites and recently played games across devices.":"Pick a username and password. Your game data will be saved to your account.";
    $("account-submit").innerHTML=(mode==="login"?"Log in":"Create account")+" <span>↗</span>";
    $("account-password").autocomplete=mode==="login"?"current-password":"new-password";
    $("account-password").minLength=mode==="login"?1:8;
    accountStatus("");
  }
  async function accountRequest(action,body){
    const response=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({action,...body})});
    const data=await response.json().catch(()=>({error:"The server returned an invalid response."}));
    if(!response.ok)throw new Error(data.error||"Something went wrong.");return data;
  }
  function updateStats(){$("account-fav-count").textContent=favorites.length;$("account-recent-count").textContent=recent.length;}
  async function loadAccountData(){
    const response=await fetch("/api/data",{credentials:"same-origin"});if(!response.ok)throw new Error("Signed in, but your saved data could not be loaded.");
    const data=await response.json();favorites.splice(0,favorites.length,...(Array.isArray(data.favorites)?data.favorites:[]));recent.splice(0,recent.length,...(Array.isArray(data.recent)?data.recent:[]));
    try{localStorage.setItem("groupcat-favorites",JSON.stringify(favorites));localStorage.setItem("groupcat-recent",JSON.stringify(recent));}catch{}updateStats();window.dispatchEvent(new Event("groupcat:data-loaded"));
  }
  function showUser(user){
    window.GROUPCAT_ACCOUNT.user=user;$("account-logged-out").hidden=!!user;$("account-logged-in").hidden=!user;
    if(user){$("account-welcome").textContent="Hi, "+user.username+".";$("account-avatar").textContent=user.username.slice(0,1).toUpperCase();updateStats();$("account-signed-message").textContent="Loading your saved data…";}
  }
  async function checkSession(){try{const response=await fetch("/api/auth",{credentials:"same-origin"});if(!response.ok)return;const data=await response.json();if(data.user){showUser(data.user);await loadAccountData();}}catch{}}
  $("welcome-play").addEventListener("click",()=>window.showSiteScreen("menu"));
  $("menu-back-home").addEventListener("click",()=>window.showSiteScreen("welcome"));
  $("account-back").addEventListener("click",()=>window.showSiteScreen("menu"));
  $("account-login-tab").addEventListener("click",()=>setAccountMode("login"));
  $("account-signup-tab").addEventListener("click",()=>setAccountMode("signup"));
  $("account-form").addEventListener("submit",async event=>{
    event.preventDefault();const username=$("account-username").value.trim(),password=$("account-password").value,button=$("account-submit");
    button.disabled=true;accountStatus("Please wait…");
    try{
      const data=await accountRequest(window.GROUPCAT_ACCOUNT.mode,{username,password});showUser(data.user);
      if(window.GROUPCAT_ACCOUNT.mode==="signup"){
        const saved=await fetch("/api/data",{method:"PUT",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({favorites,recent})});
        if(!saved.ok)throw new Error("Account created, but the database needs to be connected before data can be saved.");
      }else await loadAccountData();
      $("account-signed-message").textContent="Account ready. Your data is saved.";
    }catch(error){accountStatus(error.message,true);}finally{button.disabled=false;}
  });
  $("account-logout").addEventListener("click",async()=>{try{await accountRequest("logout",{});}catch{}showUser(null);accountStatus("You have been logged out.");setAccountMode("login");});
  $("menu-groupcat").addEventListener("click",()=>window.showSiteScreen("groupcat"));
  $("menu-finmalc").addEventListener("click",()=>window.showSiteScreen("finmalc"));
  $("menu-proxy").addEventListener("click",()=>window.showSiteScreen("proxy"));
  $("groupcat-back").addEventListener("click",()=>window.showSiteScreen("menu"));
  $("finmalc-back").addEventListener("click",()=>window.showSiteScreen("menu"));
  $("proxy-back").addEventListener("click",()=>window.showSiteScreen("menu"));
  $("groupcat-password-form").addEventListener("submit",event=>{
    event.preventDefault();const ok=$("groupcat-password").value==="finmilk";$("groupcat-dev-mode").hidden=!ok;$("groupcat-lock").hidden=ok;$("groupcat-secret").hidden=!ok;$("groupcat-password-error").hidden=ok;
  });
  const minecraftButton=$("minecraft-launch");
  if(minecraftButton) minecraftButton.addEventListener("click",async()=>{
    const status=$("minecraft-status");
    minecraftButton.disabled=true;
    status.textContent="Checking the Minecraft client and R2 connection…";
    try{
      const response=await fetch("/minecraft/26.3.html",{method:"HEAD",cache:"no-store"});
      if(response.status===503){
        status.textContent="R2 binding missing: connect the MINECRAFT binding to the groupcat-minecraft bucket in the production Pages project.";
      }else if(response.status===404){
        status.textContent="R2 is connected, but the object 26.3.html was not found in groupcat-minecraft.";
      }else if(!response.ok){
        status.textContent="Minecraft storage returned error "+response.status+".";
      }else{
        $("minecraft-frame").src="/minecraft/26.3.html";
        $("minecraft-frame-wrap").hidden=false;
        status.textContent="Loading Minecraft 26.3…";
        minecraftButton.hidden=true;
      }
    }catch{
      status.textContent="Could not reach Minecraft storage. Check that the latest Pages deployment is active.";
    }finally{minecraftButton.disabled=false;}
  });
  checkSession();
})();