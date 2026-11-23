(() => {
  const grid = document.getElementById("game-grid");
  const welcome = document.getElementById("welcome-screen");
  const menu = document.getElementById("menu-screen");
  const proxy = document.getElementById("proxy-screen");
  const groupcatScreen = document.getElementById("groupcat-screen");
  const finmalcScreen = document.getElementById("finmalc-screen");
  const appShell = document.querySelector(".app-shell");
  const showScreen = screen => { welcome.hidden = screen !== "welcome"; menu.hidden = screen !== "menu"; proxy.hidden = screen !== "proxy"; groupcatScreen.hidden = screen !== "groupcat"; finmalcScreen.hidden = screen !== "finmalc"; appShell.hidden = screen !== "games"; window.scrollTo(0,0); };
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
  const saveStore = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value.slice(0,30))); } catch {} };
  const recent = getStore("groupcat-recent");
  const favorites = getStore("groupcat-favorites");

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
  document.getElementById("menu-games").addEventListener("click",()=>showScreen("games"));
  document.getElementById("menu-proxy").addEventListener("click",()=>showScreen("proxy"));
  document.getElementById("menu-groupcat").addEventListener("click",()=>{document.getElementById("groupcat-lock").hidden=false;document.getElementById("groupcat-secret").hidden=true;document.getElementById("groupcat-password").value="";document.getElementById("groupcat-password-error").hidden=true;showScreen("groupcat");});
  document.getElementById("groupcat-back").addEventListener("click",()=>showScreen("menu"));
  document.getElementById("groupcat-password-form").addEventListener("submit",e=>{e.preventDefault();if(document.getElementById("groupcat-password").value==="finmilk"){document.getElementById("groupcat-lock").hidden=true;document.getElementById("groupcat-secret").hidden=false;}else{document.getElementById("groupcat-password-error").hidden=false;}});
  document.getElementById("menu-finmalc").addEventListener("click",()=>showScreen("finmalc"));
  document.getElementById("finmalc-back").addEventListener("click",()=>showScreen("menu"));
  document.getElementById("proxy-back").addEventListener("click",()=>showScreen("menu"));
  document.getElementById("proxy-back-bottom").addEventListener("click",()=>showScreen("menu"));
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
})();