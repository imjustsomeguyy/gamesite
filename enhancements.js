
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const menu = $("menu-screen");
  const grid = menu && menu.querySelector(".gc-game-options");
  if (!menu || !grid) return;

  const safeRead = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value === null || value === undefined ? fallback : value;
    } catch { return fallback; }
  };
  const safeWrite = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  };
  const readFlag = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value === "on";
    } catch { return fallback; }
  };
  const writeFlag = (key, value) => {
    try { localStorage.setItem(key, value ? "on" : "off"); } catch {}
  };

  const favs = new Set((safeRead("groupcat-favorites", []) || []).filter((v) => typeof v === "string"));
  let recent = (safeRead("groupcat-recent", []) || []).filter((v) => typeof v === "string");
  const originalCards = Array.from(grid.querySelectorAll(":scope > a.menu-option"));
  const records = [];

  const cardNames = new Map();
  originalCards.forEach((anchor) => {
    const id = (anchor.id || "").replace(/^menu-/, "") || anchor.getAttribute("href");
    const name = anchor.querySelector(".option-copy strong")?.textContent.trim() || "Game";
    const icon = anchor.querySelector(".option-icon");
    const emoji = icon?.querySelector("img") ? "▣" : (icon?.textContent.trim() || "🎮");
    const wrap = document.createElement("div");
    wrap.className = "gc-game-card";
    wrap.dataset.gameId = id;
    wrap.dataset.search = (anchor.textContent + " " + name).toLowerCase();
    anchor.parentNode.insertBefore(wrap, anchor);
    wrap.appendChild(anchor);

    const fav = document.createElement("button");
    fav.type = "button";
    fav.className = "gc-favorite-toggle";
    fav.setAttribute("aria-label", "Add " + name + " to favourites");
    fav.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (favs.has(id)) favs.delete(id); else favs.add(id);
      persistData();
      updateFavourites();
      render();
      showToast(favs.has(id) ? "Added to favourites" : "Removed from favourites");
      playUiSound();
    });
    wrap.appendChild(fav);

    const record = { id, name, emoji, anchor, wrap };
    records.push(record);
    cardNames.set(id, name);
    anchor.addEventListener("click", () => {
      recent = [id].concat(recent.filter((item) => item !== id)).slice(0, 12);
      persistData();
    });
  });

  function persistData() {
    const favList = Array.from(favs);
    safeWrite("groupcat-favorites", favList);
    safeWrite("groupcat-recent", recent);
    const user = window.GROUPCAT_ACCOUNT && window.GROUPCAT_ACCOUNT.user;
    if (user) {
      fetch("/api/data", {
        method: "PUT",
        credentials: "same-origin",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorites: favList, recent })
      }).catch(() => {});
    }
    updateAccountStats();
  }

  function updateAccountStats() {
    const favCount = $("account-fav-count");
    const recentCount = $("account-recent-count");
    if (favCount) favCount.textContent = favs.size;
    if (recentCount) recentCount.textContent = recent.length;
  }

  const searchControls = document.createElement("div");
  searchControls.className = "gc-library-tools";
  searchControls.innerHTML = [
    '<div class="gc-library-search-row">',
      '<div class="gc-library-search-wrap">',
        '<span class="gc-library-search-icon" aria-hidden="true">⌕</span>',
        '<input class="gc-library-search" id="gc-game-search" type="search" autocomplete="off" spellcheck="false" placeholder="Search your library…" aria-label="Search games">',
        '<span class="gc-library-shortcut">/</span>',
      '</div>',
      '<button class="gc-shuffle-button" id="gc-shuffle-game" type="button">↝ Surprise me</button>',
    '</div>',
    '<div class="gc-library-subrow">',
      '<div class="gc-library-filters" role="group" aria-label="Filter games">',
        '<button class="gc-filter-button" type="button" data-filter="all" aria-pressed="true">All games</button>',
        '<button class="gc-filter-button" type="button" data-filter="favourites" aria-pressed="false">★ Favourites</button>',
        '<button class="gc-filter-button" type="button" data-filter="recent" aria-pressed="false">Recently played</button>',
      '</div>',
      '<div class="gc-library-tools-right">',
        '<span class="gc-library-count" id="gc-library-count">0 GAMES</span>',
        '<select class="gc-library-sort" id="gc-library-sort" aria-label="Sort games">',
          '<option value="default">Default order</option>',
          '<option value="az">Name: A–Z</option>',
          '<option value="recent">Recently played</option>',
        '</select>',
      '</div>',
    '</div>',
    '<div class="gc-recent-strip" id="gc-recent-strip" aria-label="Recently played"></div>'
  ].join("");
  grid.parentNode.insertBefore(searchControls, grid);

  const empty = document.createElement("div");
  empty.className = "gc-empty-state";
  empty.hidden = true;
  empty.innerHTML = "<strong>Nothing found.</strong><span>Try another search or switch the filter.</span>";
  grid.appendChild(empty);

  const footer = document.createElement("div");
  footer.className = "gc-menu-footer";
  footer.innerHTML = '<span><i class="gc-footer-dot"></i> GROUPCAT ARCADE READY</span><span id="gc-footer-count">5 TITLES</span><span>Press / to search</span>';
  grid.parentNode.insertBefore(footer, grid.nextSibling);

  const search = $("gc-game-search");
  const sort = $("gc-library-sort");
  const count = $("gc-library-count");
  const recentStrip = $("gc-recent-strip");
  let activeFilter = "all";

  function updateFavourites() {
    records.forEach((record) => {
      const active = favs.has(record.id);
      record.wrap.classList.toggle("is-favourite", active);
      record.wrap.querySelector(".gc-favorite-toggle").textContent = active ? "★" : "☆";
      record.wrap.querySelector(".gc-favorite-toggle").setAttribute("aria-pressed", String(active));
      record.wrap.querySelector(".gc-favorite-toggle").setAttribute("aria-label", (active ? "Remove " : "Add ") + record.name + " " + (active ? "from" : "to") + " favourites");
    });
  }

  function renderRecentStrip() {
    recentStrip.replaceChildren();
    const title = document.createElement("span");
    title.className = "gc-recent-title";
    title.textContent = "LAST PLAYED";
    recentStrip.appendChild(title);
    const entries = recent.slice(0, 4).map((id) => records.find((record) => record.id === id)).filter(Boolean);
    if (!entries.length) {
      const none = document.createElement("span");
      none.className = "gc-recent-empty";
      none.textContent = "Your recently played games will appear here";
      recentStrip.appendChild(none);
      return;
    }
    entries.forEach((record) => {
      const link = document.createElement("a");
      link.className = "gc-recent-chip";
      link.href = record.anchor.href;
      link.innerHTML = '<span aria-hidden="true"></span><span></span>';
      link.firstElementChild.textContent = record.emoji;
      link.lastElementChild.textContent = record.name;
      link.addEventListener("click", () => {
        recent = [record.id].concat(recent.filter((id) => id !== record.id)).slice(0, 12);
        persistData();
      });
      recentStrip.appendChild(link);
    });
  }

  function render() {
    const query = search.value.trim().toLowerCase();
    let visible = records.filter((record) => {
      const matchesQuery = !query || record.wrap.dataset.search.includes(query);
      const matchesFilter = activeFilter === "all"
        || (activeFilter === "favourites" && favs.has(record.id))
        || (activeFilter === "recent" && recent.includes(record.id));
      return matchesQuery && matchesFilter;
    });
    const ordering = sort.value;
    if (ordering === "az") visible.sort((a, b) => a.name.localeCompare(b.name));
    if (ordering === "recent") visible.sort((a, b) => {
      const ai = recent.indexOf(a.id), bi = recent.indexOf(b.id);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
    records.forEach((record) => {
      record.wrap.hidden = !visible.includes(record);
      record.wrap.classList.toggle("is-recent", recent.includes(record.id));
    });
    visible.forEach((record) => grid.insertBefore(record.wrap, empty));
    empty.hidden = visible.length !== 0;
    count.textContent = visible.length + (visible.length === 1 ? " GAME" : " GAMES");
    const footerCount = $("gc-footer-count");
    if (footerCount) footerCount.textContent = records.length + " TITLES";
    renderRecentStrip();
    updateFavourites();
  }

  search.addEventListener("input", render);
  sort.addEventListener("change", render);
  searchControls.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      searchControls.querySelectorAll("[data-filter]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      render();
    });
  });
  $("gc-shuffle-game").addEventListener("click", () => {
    const choices = records.filter((record) => !record.wrap.hidden);
    if (!choices.length) { showToast("No games match that filter"); return; }
    const pick = choices[Math.floor(Math.random() * choices.length)];
    pick.anchor.click();
  });

  const settingsPanel = $("gc-settings-panel");
  if (settingsPanel) {
    const cosmetics = document.createElement("div");
    cosmetics.className = "gc-settings-section";
    cosmetics.innerHTML = [
      '<div class="gc-cosmetic-heading">THEME STUDIO</div>',
      '<div class="gc-theme-grid" role="group" aria-label="Choose a colour theme">',
        '<button class="gc-theme-choice" type="button" data-gc-theme="mono"><i class="gc-theme-swatch" style="background:linear-gradient(135deg,#fff,#777)"></i>Photon</button>',
        '<button class="gc-theme-choice" type="button" data-gc-theme="gta"><i class="gc-theme-swatch" style="background:linear-gradient(135deg,#ff65ae,#ffb05f)"></i>Vice City</button>',
        '<button class="gc-theme-choice" type="button" data-gc-theme="matrix"><i class="gc-theme-swatch" style="background:linear-gradient(135deg,#d2ff57,#43e88e)"></i>Afterdark</button>',
        '<button class="gc-theme-choice" type="button" data-gc-theme="aurora"><i class="gc-theme-swatch" style="background:linear-gradient(135deg,#a78bfa,#39c8db)"></i>Aurora</button>',
        '<button class="gc-theme-choice" type="button" data-gc-theme="ice"><i class="gc-theme-swatch" style="background:linear-gradient(135deg,#a8efff,#58a8e7)"></i>Arctic</button>',
        '<button class="gc-theme-choice" type="button" data-gc-theme="ember"><i class="gc-theme-swatch" style="background:linear-gradient(135deg,#ffc078,#ed6547)"></i>Ember</button>',
        '<button class="gc-theme-choice" type="button" data-gc-theme="ultraviolet"><i class="gc-theme-swatch" style="background:linear-gradient(135deg,#ce9aff,#8a63ff)"></i>Ultraviolet</button>',
      '</div>',
      '<div class="gc-accent-row"><span>Custom accent</span><span class="gc-accent-controls"><input class="gc-accent-picker" id="gc-accent-picker" type="color" value="#d8dbe2" aria-label="Choose custom accent"><button class="gc-reset-accent" id="gc-reset-accent" type="button">Reset</button></span></div>',
      '<div class="gc-cosmetic-heading">DISPLAY OPTIONS</div>',
      '<button class="gc-setting-row gc-cosmetic-row" type="button" data-gc-toggle="compact"><span><strong>Compact tiles</strong><small>Fit more games on screen</small></span><span class="gc-setting-state">Off</span></button>',
      '<button class="gc-setting-row gc-cosmetic-row" type="button" data-gc-toggle="descriptions"><span><strong>Hide game descriptions</strong><small>Keep the library extra clean</small></span><span class="gc-setting-state">Off</span></button>',
      '<button class="gc-setting-row gc-cosmetic-row" type="button" data-gc-toggle="ambient"><span><strong>Ambient background</strong><small>Animated background glow and grid</small></span><span class="gc-setting-state">On</span></button>',
      '<button class="gc-setting-row gc-cosmetic-row" type="button" data-gc-toggle="glow"><span><strong>Card glow</strong><small>Soft light around game tiles</small></span><span class="gc-setting-state">On</span></button>',
      '<button class="gc-setting-row gc-cosmetic-row" type="button" data-gc-toggle="sounds"><span><strong>Interface sounds</strong><small>Subtle clicks and selection tones</small></span><span class="gc-setting-state">Off</span></button>'
    ].join("");
    settingsPanel.appendChild(cosmetics);
  }

  const themeChoices = Array.from(document.querySelectorAll("[data-gc-theme]"));
  function setTheme(theme) {
    const allowed = ["mono", "gta", "matrix", "aurora", "ice", "ember", "ultraviolet"];
    if (!allowed.includes(theme)) theme = "mono";
    root.dataset.theme = theme;
    try { localStorage.setItem("gc_theme", theme); } catch {}
    themeChoices.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.gcTheme === theme)));
  }
  themeChoices.forEach((button) => button.addEventListener("click", () => {
    setTheme(button.dataset.gcTheme);
    showToast(button.textContent.trim() + " theme applied");
    playUiSound();
  }));

  function setAccent(value) {
    if (!/^#[0-9a-f]{6}$/i.test(value)) return;
    root.style.setProperty("--gc-accent", value);
    root.style.setProperty("--gc-accent-soft", value + "28");
    root.style.setProperty("--gc-accent-line", value + "77");
    try { localStorage.setItem("gc_custom_accent", value); } catch {}
  }
  const accentPicker = $("gc-accent-picker");
  if (accentPicker) {
    accentPicker.addEventListener("input", () => setAccent(accentPicker.value));
    $("gc-reset-accent").addEventListener("click", () => {
      accentPicker.value = "#d8dbe2";
      try { localStorage.removeItem("gc_custom_accent"); } catch {}
      setAccent("#d8dbe2");
      showToast("Accent reset");
    });
  }

  const toggleConfig = {
    compact: { key: "gc_compact_tiles", fallback: false, className: "gc-compact-tiles" },
    descriptions: { key: "gc_hide_descriptions", fallback: false, className: "gc-hide-descriptions" },
    ambient: { key: "gc_ambient_background", fallback: true, className: "gc-background-off", invert: true },
    glow: { key: "gc_card_glow", fallback: true, className: "gc-card-glow-off", invert: true },
    sounds: { key: "gc_interface_sounds", fallback: false, className: "gc-click-sounds", invert: false }
  };
  function applyToggle(name, value) {
    const config = toggleConfig[name];
    if (!config) return;
    root.classList.toggle(config.className, config.invert ? !value : value);
    writeFlag(config.key, value);
    const button = document.querySelector('[data-gc-toggle="' + name + '"]');
    if (button) {
      button.setAttribute("aria-pressed", String(value));
      button.querySelector(".gc-setting-state").textContent = value ? "On" : "Off";
    }
  }
  Object.keys(toggleConfig).forEach((name) => {
    const config = toggleConfig[name];
    applyToggle(name, readFlag(config.key, config.fallback));
    const button = document.querySelector('[data-gc-toggle="' + name + '"]');
    if (button) button.addEventListener("click", () => {
      const current = button.getAttribute("aria-pressed") === "true";
      applyToggle(name, !current);
      if (name === "sounds") playUiSound();
    });
  });

  function playUiSound() {
    if (!root.classList.contains("gc-click-sounds")) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(660, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(440, context.currentTime + 0.045);
      gain.gain.setValueAtTime(0.025, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.06);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.065);
      oscillator.onended = () => context.close();
    } catch {}
  }

  const toast = document.createElement("div");
  toast.className = "gc-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.appendChild(toast);
  let toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1700);
  }

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing = target && (target.matches("input,textarea,select") || target.isContentEditable);
    if ((event.key === "/" || (event.ctrlKey && event.key.toLowerCase() === "k")) && !typing) {
      event.preventDefault();
      if (!$("menu-screen").hidden) search.focus();
    }
    if (event.key === "Escape" && target === search && search.value) {
      search.value = "";
      render();
    }
  });

  const accountButton = $("menu-account");
  if (accountButton) accountButton.addEventListener("click", () => {
    setTimeout(() => {
      const liveFavs = safeRead("groupcat-favorites", []);
      const liveRecent = safeRead("groupcat-recent", []);
      if ($("account-fav-count")) $("account-fav-count").textContent = Array.isArray(liveFavs) ? liveFavs.length : 0;
      if ($("account-recent-count")) $("account-recent-count").textContent = Array.isArray(liveRecent) ? liveRecent.length : 0;
    }, 350);
  });

  setTheme(safeRead("gc_theme", "mono") || "mono");
  let savedAccent = "";
  try { savedAccent = localStorage.getItem("gc_custom_accent") || ""; } catch {}
  if (savedAccent) {
    if (accentPicker) accentPicker.value = savedAccent;
    setAccent(savedAccent);
  }
  updateFavourites();
  render();
})();
