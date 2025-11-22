// app.js

let characters = [];
let relics = [];

// -------------------- Tab Switching --------------------
function showTab(tab) {
  const charTab   = document.getElementById("tab-characters");
  const relicTab  = document.getElementById("tab-relics");
  const trialTab  = document.getElementById("tab-trials");

  const loader        = document.getElementById("loader");
  const content       = document.getElementById("content");
  const relicLoader   = document.getElementById("relicLoader");
  const relicContent  = document.getElementById("relicContent");
  const trialContent  = document.getElementById("trialChambers");

  // Reset all tabs
  charTab.classList.remove("active");
  relicTab.classList.remove("active");
  trialTab.classList.remove("active");

  // Hide all sections
  loader.style.display = "none";
  content.style.display = "none";
  relicLoader.style.display = "none";
  relicContent.style.display = "none";
  if (trialContent) trialContent.style.display = "none";

  // Characters
  if (tab === "characters") {
    charTab.classList.add("active");
    loader.style.display = "block";
  }

  // Relics
  else if (tab === "relics") {
    relicTab.classList.add("active");
    relicLoader.style.display = "block";

    const sel = document.getElementById("relicTypeFilter");
    const search = document.getElementById("relicSearchBar");

    if (sel) {
      sel.disabled = false;
      sel.style.pointerEvents = "auto";
    }
    if (search) search.style.pointerEvents = "auto";

    populateRelicTypeFilter();
  }

  // Trial Chambers
  else if (tab === "trials") {
    trialTab.classList.add("active");

    if (trialContent) {
      trialContent.style.display = "block";
    }

    // Initialize trials when opened
    if (typeof initTrialChambers === "function") {
      initTrialChambers();
    }
  }
}

// -------------------- JSON Loading --------------------
fetch("characters/index.json")
  .then(res => res.json())
  .then(data => {
    characters = data;
    renderCharacterList(data);
  })
  .catch(() => {
    document.getElementById("characterList").innerHTML =
      "<p class='text-danger'>Error loading character list.</p>";
  });

fetch("relics/index.json")
  .then(res => res.json())
  .then(data => {
    relics = data;
    renderRelicList(data);
    populateRelicTypeFilter();
  })
  .catch(() => {
    document.getElementById("relicList").innerHTML =
      "<p class='text-danger'>Error loading relic list.</p>";
  });

// -------------------- Shared Utilities --------------------
function formatKey(key) {
  const map = {
    baseAtk: "ATK", basePwr: "PWR",
    basePhyDef: "Physical DEF", baseMagDef: "Magic DEF",
    baseHp: "HP", baseCharge: "Charge",
    baseCritRate: "CRIT Rate", baseCritDamage: "CRIT DMG",
    riftedFaction: "Rifted Faction", riftedTech: "Rifted Technology",
    riftedDisc: "Rifted Disorder", faction: "Faction",
    baseFluxCapacity: "Flux Capacity", baseSurgeCapacity: "Surge Capacity",
    baseEchoMemroyCapacity: "Echo Memory Capacity", baseMaxEnergy: "Max Energy",
    substat: "Substat"
  };
  return map[key] || key;
}

function highlightKeywords(text) {
  const keywordMap = {
    "Physical ATK": "Physical-ATK", "Magic PWR": "Magic-PWR",
    "Physical DEF": "Physical-DEF", "Magic DEF": "Magic-DEF",
    "Physical DMG": "Physical-DMG", "Magic DMG": "Magic-DMG",
    "Quantum DMG": "Quantum-DMG", "Fusion DMG": "Fusion-DMG",
    "Destruction DMG": "Destruction-DMG", "Artificial DMG": "Artificial-DMG",
    "Sharp DMG": "Sharp-DMG", "Flame DMG": "Flame-DMG",
    "Frost DMG": "Frost-DMG", "Volte DMG": "Volte-DMG",
    "Tide DMG": "Tide-DMG", "Gale DMG": "Gale-DMG",
    "Special Active Skill": "Special-Active-Skill"
  };

  Object.entries(keywordMap).forEach(([word, className]) => {
    const regex = new RegExp(`(?<!class=["'])(${word})(?!["'])`, "g");
    text = text.replace(regex, `<span class="${className}">$1</span>`);
  });

  text = text.replace(/(\d+(\.\d+)?%?)/g, '<span class="highlight-number">$1</span>');
  return text.replace(/\n/g, "<br>");
}

const PERCENT_KEYS = new Set(['baseCritRate', 'baseCritDamage']);

function formatPercentMaybe(key, value) {
  if (!PERCENT_KEYS.has(key)) return value ?? "";

  if (value === undefined || value === null || value === "") return "";
  let n = (typeof value === "string") ? parseFloat(value) : Number(value);
  if (Number.isNaN(n)) return value;

  if (n > 0 && n <= 1) n *= 100;

  return n.toFixed(1) + "%";
}