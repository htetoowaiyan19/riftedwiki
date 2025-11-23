// trialChamber.js
// Handles Trial Chambers UI and session loading + small Quarks fetch template.
// ---------- Trial Chambers logic ----------
let trialSessions = []; // array of {session, file} or index entries
let currentTrialSession = null; // loaded JSON for session
let selectedLevelKey = null; // "l1", "l2", etc

// Initialize: fetch index.json
function initTrialChambers() {
  // ensure the trials loader is visible when tab opened
  // Fetch index of sessions
  fetch("trialchambers/index.json")
    .then(r => {
      if (!r.ok) throw new Error("trialchambers index not found");
      return r.json();
    })
    .then(index => {
      // index assumed to be array of session filenames or objects
      // Accept either: ["s1.json","s2.json"] or [{session:1,file:"s1.json"},...]
      const select = document.getElementById("trialSessionSelect");
      if (!select) return;

      select.innerHTML = ""; // clear
      trialSessions = [];

      if (Array.isArray(index)) {
        index.forEach(item => {
          if (typeof item === "string") {
            // extract session number from filename (best effort)
            const match = item.match(/s(\d+)/i);
            const sess = match ? Number(match[1]) : (trialSessions.length + 1);
            trialSessions.push({ session: sess, file: item });
          } else if (item && item.file) {
            trialSessions.push({ session: item.session ?? (trialSessions.length+1), file: item.file });
          }
        });
      } else if (typeof index === "object") {
        // maybe index is object mapping session->file. Convert.
        Object.entries(index).forEach(([k, v]) => {
          trialSessions.push({ session: Number(k.replace(/^s/i, "")) || trialSessions.length+1, file: v });
        });
      }

      // Populate select
      trialSessions.sort((a,b)=>a.session - b.session);
      if (trialSessions.length === 0) {
        select.innerHTML = "<option value=''>No Sessions</option>";
      } else {
        select.innerHTML = "<option value=''>Select session...</option>";
        trialSessions.forEach(s => {
          const opt = document.createElement("option");
          opt.value = s.file;
          opt.textContent = "Session " + s.session;
          select.appendChild(opt);
        });
        // auto-select first
        select.selectedIndex = 1;
        onTrialSessionChange();
      }
    })
    .catch(err => {
      const select = document.getElementById("trialSessionSelect");
      if (select) select.innerHTML = "<option value=''>No sessions</option>";
      console.warn("Failed to load trial sessions index:", err);
    });
}

// When user changes session dropdown
function onTrialSessionChange() {
  const select = document.getElementById("trialSessionSelect");
  if (!select) return;
  const file = select.value;
  if (!file) return;
  fetchSessionFile(file);
}

// Fetch session file (e.g. trialchambers/s1.json)
function fetchSessionFile(file) {
  fetch("trialchambers/" + file)
    .then(r => {
      if (!r.ok) throw new Error("session file not found");
      return r.json();
    })
    .then(sessionData => {
      currentTrialSession = sessionData;
      renderSession(sessionData);
    })
    .catch(err => {
      console.error("Failed to load session file:", err);
      const buffs = document.getElementById("trialBuffsDisplay");
      if (buffs) buffs.textContent = "Failed to load session file.";
    });
}

// Render whole session
function renderSession(data) {
  // --- Trial Buffs ---
  const buffs = document.getElementById("trialBuffsDisplay");
  if (buffs) {
    const name = data.trialBuffName ?? data.trialbuffName ?? "";
    const text = data.trialbuffs ?? data.trialBuffs ?? "No global buffs.";
    if (name) {
      buffs.innerHTML = `
        <div style="font-weight:700; font-size:1.1rem; margin-bottom:4px;">${name}</div>
        <div style="margin-top:2px;">${text}</div>
      `;
    } else {
      buffs.textContent = text;
    }
    buffs.classList.remove("alert-info");
    buffs.classList.add("alert-success");
  }

  // --- Build level list ---
  const levelList = document.getElementById("levelList");
  if (!levelList) return;
  levelList.innerHTML = "";

  const levels = data.levels || {};
  for (let i = 1; i <= 15; i++) {
    const key = "l" + i;
    const levelData = levels[key] || {};
    const levelType = levelData.levelType || (i <= 10 ? "basic" : "advanced");

    const btn = document.createElement("div");
    const isSeasonal = i >= 11 && i <= 15;
    btn.className = `level-btn ${isSeasonal ? "seasonal" : ""} ${i === 1 ? "active" : ""}`;
    btn.dataset.levelKey = key;
    btn.dataset.levelNum = i;
    btn.innerHTML = `
      <div>Level ${i}</div>
      <div style="font-size:0.85rem;opacity:0.9;">${levelType}</div>
    `;
    btn.onclick = () => {
      Array.from(levelList.children).forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      selectedLevelKey = key;
      renderLevel(key, levelData, i);
    };
    levelList.appendChild(btn);

    if (i === 1) {
      selectedLevelKey = key;
      renderLevel(key, levelData, 1);
    }
  }
}

// --- Render a single level ---
function renderLevel(levelKey, levelData = {}, levelNum = 1) {
  const levelTitle = document.getElementById("levelTitle");
  const badge = document.getElementById("levelTypeBadge");
  const container = document.getElementById("levelChambersContainer");

  if (levelTitle) levelTitle.textContent = `Level ${levelNum}`;
  const type = levelData.levelType || (levelNum <= 10 ? "basic" : "advanced");
  if (badge) badge.innerHTML = `<span class="level-badge">${type.toUpperCase()}</span>`;

  container.innerHTML = "";

  // --- Level Buff ---
  const levelBuffText = levelData.levelBuff ?? levelData.levelbuff;
  if (levelBuffText) {
    const buffDiv = document.createElement("div");
    buffDiv.className = "level-buff-box";
    buffDiv.textContent = levelBuffText;
    container.appendChild(buffDiv);
  }

  const chamberCount = 3;
  const sectorCount = type === "advanced" ? 2 : 1;

  for (let c = 1; c <= chamberCount; c++) {
    const chamberKey = "chamber" + c;
    const chamberData = levelData[chamberKey] || {};
    const totalCycles = Number(chamberData.cycles || 0);

    // Compute total HP for the chamber
    let totalHp = 0;
    for (let s = 1; s <= sectorCount; s++) {
      const sectorData = chamberData["sector" + s] || {};
      Object.entries(sectorData).forEach(([waveKey, waveValue]) => {
        if (!/^wave/i.test(waveKey) || typeof waveValue !== "object") return;
        Object.entries(waveValue).forEach(([oppKey, oppData]) => {
          if (!/^opponent/i.test(oppKey) || typeof oppData !== "object") return;
          const baseHp = Number(oppData.baseHp || 0);
          const mult = Number(oppData.hpMultiplier || 1);
          const lv = Number(oppData.level || oppData.lvl || 1);
          const hpModPct = Number(oppData.hpModifier || 100);
          const qty = Number(oppData.qty || 1);
          const computedHp = Math.round(baseHp * mult * lv * (hpModPct / 100));
          totalHp += computedHp * qty;
        });
      });
    }

    // --- Chamber container ---
    const chamberDiv = document.createElement("div");
    chamberDiv.className = "trial-chamber";
    chamberDiv.innerHTML = `
      <h4 style="display:flex; justify-content:space-between; align-items:center;">
        <span>Chamber ${c}</span>
        <span style="font-weight:600;">Total HP: ${totalHp} | Cycles: ${totalCycles}</span>
      </h4>
    `;

    // --- Build sectors ---
    for (let s = 1; s <= sectorCount; s++) {
      const sectorData = chamberData["sector" + s] || {};
      const sectorCard = document.createElement("div");
      sectorCard.className = "sector-card";
      sectorCard.innerHTML = `<h5>Sector ${s}</h5>`;

      // Waves
      Object.entries(sectorData).forEach(([waveKey, waveValue]) => {
        if (!/^wave/i.test(waveKey) || typeof waveValue !== "object") return;
        const waveContainer = document.createElement("div");
        waveContainer.className = "wave-container";

        const waveHeader = document.createElement("div");
        waveHeader.className = "wave-header";
        waveHeader.textContent = waveKey.toUpperCase();
        waveContainer.appendChild(waveHeader);

        const opponentsGrid = document.createElement("div");
        opponentsGrid.className = "opponent-grid";

        Object.entries(waveValue).forEach(([oppKey, oppData]) => {
          if (!/^opponent/i.test(oppKey) || typeof oppData !== "object") return;

          const baseHp = Number(oppData.baseHp || 0);
          const mult = Number(oppData.hpMultiplier || 1);
          const lv = Number(oppData.level || oppData.lvl || 1);
          const hpModPct = Number(oppData.hpModifier || 100);
          const computedHp = Math.round(baseHp * mult * lv * (hpModPct / 100));

          const maxLevel = 80;
          const effectiveLevel = Math.min(lv, maxLevel);
          const atkBaseMult = 1.05;
          const defBaseMult = 1.04;
          const computedAtk = Math.round((oppData.baseAtk || 0) * Math.pow(atkBaseMult, effectiveLevel));
          const computedDef = Math.round((oppData.baseDef || 0) * Math.pow(defBaseMult, effectiveLevel));

          const card = document.createElement("div");
          card.className = "opponent-card";
          card.innerHTML = `
            <div class="summary">
              <span class="opponent-name">${oppData.name}</span>
              <span class="opponent-level">${lv}</span>
            </div>
            <div class="details">
              <div>HP: ${computedHp}</div>
              <div>ATK: ${computedAtk} • DEF: ${computedDef}</div>
              <div>Quantity: ${oppData.qty || 1}</div>
              <div class="opponent-desc">${oppData.description || "No description."}</div>
            </div>
          `;
          opponentsGrid.appendChild(card);
        });

        if (opponentsGrid.children.length) waveContainer.appendChild(opponentsGrid);
        sectorCard.appendChild(waveContainer);
      });

      chamberDiv.appendChild(sectorCard);
    }

    // --- Challenges & Rewards (move here from sector) ---
    if (chamberData.challenge) {
      const challengeDiv = document.createElement("div");
      challengeDiv.className = "challenge-list";
      challengeDiv.innerHTML = `<h6>Objectives</h6>`;
      Object.values(chamberData.challenge).forEach(ch => {
        const div = document.createElement("div");
        div.textContent = `★ ${ch}`;
        challengeDiv.appendChild(div);
      });
      chamberDiv.appendChild(challengeDiv);
    }

    if (chamberData.rewards) {
      const rewardGrid = document.createElement("div");
      rewardGrid.className = "reward-grid";
      Object.values(chamberData.rewards).forEach(rv => {
        const rCard = document.createElement("div");
        rCard.className = "reward-card";
        rCard.innerHTML = `
          <span class="reward-name">${rv.name}</span>
          <span class="reward-qty">${rv.qty ?? 1}</span>
        `;
        rewardGrid.appendChild(rCard);
      });
      chamberDiv.appendChild(rewardGrid);
    }

    container.appendChild(chamberDiv);
  }
}

// Helper: call when user clicks "Back to sessions"
function backToTrialsLoader() {
  document.getElementById("trialsContent").style.display = "none";
  document.getElementById("trialsLoader").style.display = "block";
}

// If user wants to open Trials tab — call this when showTab('trials') is called
function openTrialsTab() {
  // Show the loader container; this function depends on your showTab logic to show trialsLoader
  // Ensure initialization runs only once
  if (!window._trialInitialized) {
    window._trialInitialized = true;
    initTrialChambers();
  }
}

// Also export or call fetchQuarksTemplate when Quarks tab is opened (placeholder)
function openQuarksTab() {
  if (!window._quarksInitialized) {
    window._quarksInitialized = true;
    fetchQuarksTemplate();
  }
}