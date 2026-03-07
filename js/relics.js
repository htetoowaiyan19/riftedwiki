// relics.js
const RELIC_MAX_LEVEL = 90;
const RELIC_DEFAULT_CLASS = 5;
const RELIC_MAIN_STAT_MULTIPLIER = 0.181824;
const RELIC_SUB_STAT_MULTIPLIER = 0.228290;
const RELIC_SUB_STAT_STEP_LEVEL = 5;

function normalizeRelicClass(value) {
  const relicClass = Number(value);
  if (!Number.isFinite(relicClass)) return RELIC_DEFAULT_CLASS;
  return Math.min(5, Math.max(1, Math.round(relicClass)));
}

function getRelicMaxLevelByClass(relicClass) {
  const c = normalizeRelicClass(relicClass);
  if (c <= 2) return 60;
  if (c === 3) return 80;
  return 90;
}

function isAtkOrPwrStat(statType) {
  const label = String(statType ?? "").toLowerCase();
  return label.includes("atk") || label.includes("pwr");
}

function clampRelicLevel(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function parseRelicStatValue(value) {
  if (Number.isFinite(Number(value))) {
    return { number: Number(value), isPercent: false };
  }

  if (typeof value !== "string") {
    return { number: Number.NaN, isPercent: false };
  }

  const trimmed = value.trim();
  const match = trimmed.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return { number: Number.NaN, isPercent: trimmed.includes("%") };
  }

  return {
    number: Number(match[0]),
    isPercent: trimmed.includes("%")
  };
}

function formatRelicScaledNumber(value, decimals = 2) {
  if (!Number.isFinite(value)) return String(value ?? "");
  const fixed = value.toFixed(decimals);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function getScaledRelicMainStat(mainStat, level) {
  const baseValue = Number(mainStat);
  if (!Number.isFinite(baseValue)) return mainStat ?? "";
  const scaled = baseValue * (1 + RELIC_MAIN_STAT_MULTIPLIER * (level - 1));
  return Math.round(scaled);
}

function getScaledRelicSubStat(subStat, level, maxLevel = RELIC_MAX_LEVEL) {
  const parsed = parseRelicStatValue(subStat);
  if (!Number.isFinite(parsed.number)) return subStat ?? "";

  const cappedLevel = Math.min(level, maxLevel);
  const stepCount = Math.floor(cappedLevel / RELIC_SUB_STAT_STEP_LEVEL);
  const scaled = parsed.number * (1 + RELIC_SUB_STAT_MULTIPLIER * stepCount);

  if (parsed.isPercent) {
    return `${formatRelicScaledNumber(scaled, 1)}%`;
  }

  return String(Math.round(scaled));
}

// -------------------- Relic List --------------------
function renderRelicList(data) {
  const list = document.getElementById("relicList");
  list.innerHTML = "";

  data.forEach(relic => {
    const item = document.createElement("div");
    const stateClass = (relic.version && relic.version[1] === "unreleased") ? "unreleased" : "released";
    item.className = `char-item ${stateClass}`;
    const badgeText = (relic.version && relic.version[1] === "unreleased") ? "Upcoming" : (relic.version ? relic.version[0] : "");

    item.innerHTML = `
      <div class="char-row">
        <div class="char-name">${relic.relicName}</div>
        <div class="version-badge">${badgeText}</div>
      </div>`;

    item.onclick = () => loadRelic(`relics/${relic.file}`);
    list.appendChild(item);
  });
}

function filterRelicList() {
  const query = document.getElementById("relicSearchBar").value.toLowerCase();
  const type = (document.getElementById("relicTypeFilter")?.value || "All").toLowerCase();

  const filtered = relics.filter(r => {
    const nameMatch = (r.relicName || "").toLowerCase().includes(query);
    const typeMatch = (type === "all") ||
      ((r.faction || "").toLowerCase() === type);

    return nameMatch && typeMatch;
  });

  renderRelicList(filtered);
}

// -------------------- Relic Filter UI --------------------
function populateRelicTypeFilter() {
  const select = document.getElementById("relicTypeFilter");
  if (!select || !Array.isArray(relics)) return;

  const available = new Set(
    relics.map(r => (r.faction || "").toLowerCase()).filter(Boolean)
  );

  Array.from(select.options).forEach(opt => {
    if (opt.value === "All") {
      opt.disabled = false;
      return;
    }
    opt.disabled = !available.has(opt.value.toLowerCase());
  });

  select.value = "All";
}

function backToRelicList() {
  document.getElementById("relicContent").style.display = "none";
  document.getElementById("relicLoader").style.display = "block";
}

function loadRelic(path) {
  fetch(path)
    .then(res => res.json())
    .then(data => {
      const normalizedPath = path.replace(/^relics\//, "");
      const relicMeta = Array.isArray(relics)
        ? relics.find(r => r.file === normalizedPath || `relics/${r.file}` === path)
        : null;
      const mergedData = {
        ...data,
        class: relicMeta?.class ?? data.class ?? RELIC_DEFAULT_CLASS
      };

      document.getElementById("relicLoader").style.display = "none";
      document.getElementById("relicContent").style.display = "block";
      displayRelicData(mergedData);
    })
    .catch(err => alert("Error loading relic file: " + err.message));
}

// -------------------- Relic Details --------------------
function displayRelicData(data) {
  document.getElementById("relicName").textContent = data.relicName;
  const relicClass = normalizeRelicClass(data.class);
  const relicMaxLevel = getRelicMaxLevelByClass(relicClass);
  const hasSubStat = relicClass >= 2;
  const hasPassiveEffect = relicClass >= 3;
  let relicLevel = 1;

  // Stats
  const relicStatsTable = document.getElementById("relicStats");

  const statRow = (label, value) => `
    <tr>
      <td style="width:20%; text-align:left; padding-right:4px;"><strong>${label}</strong></td>
      <td style="width:80%; text-align:left; padding-left:4px;">${value ?? ""}</td>
    </tr>`;

  function renderRelicStats() {
    let rows = "";
    rows += `
      <tr>
        <td colspan="2">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <strong>Relic Level</strong>
            <div class="forge-ui forge-ui-small" style="margin:0;">
              <button class="forge-btn forge-btn-small" id="relicLevelLeft">&lt;</button>
              <input type="number" min="1" max="${relicMaxLevel}" step="1" class="forge-indicator forge-indicator-small" id="relicLevelInput" value="${relicLevel}" style="width:64px;text-align:center;padding-right:6px;" />
              <button class="forge-btn forge-btn-small" id="relicLevelRight">&gt;</button>
            </div>
          </div>
        </td>
      </tr>`;

    if (relicClass === 1) {
      if (isAtkOrPwrStat(data.mainStatType)) {
        rows += statRow(data.mainStatType ?? "", getScaledRelicMainStat(data.mainStat, relicLevel));
      }
      if (hasSubStat && isAtkOrPwrStat(data.subStatType)) {
        rows += statRow(data.subStatType ?? "", getScaledRelicSubStat(data.subStat, relicLevel, relicMaxLevel));
      }
    } else {
      rows += statRow(data.mainStatType ?? "", getScaledRelicMainStat(data.mainStat, relicLevel));
      if (hasSubStat) {
        rows += statRow(data.subStatType ?? "", getScaledRelicSubStat(data.subStat, relicLevel, relicMaxLevel));
      }
    }
    rows += statRow("Class", `${relicClass} Star`);
    rows += statRow("Faction", data.faction);
    if (data.relicGroup) {
      rows += statRow("Relic Group", data.relicGroup);
    }

    relicStatsTable.innerHTML = rows;

    const leftBtn = document.getElementById("relicLevelLeft");
    const rightBtn = document.getElementById("relicLevelRight");
    const levelInput = document.getElementById("relicLevelInput");

    levelInput.value = String(relicLevel);
    leftBtn.disabled = relicLevel === 1;
    rightBtn.disabled = relicLevel === relicMaxLevel;

    leftBtn.onclick = () => {
      if (relicLevel > 1) {
        relicLevel--;
        renderRelicStats();
      }
    };

    rightBtn.onclick = () => {
      if (relicLevel < relicMaxLevel) {
        relicLevel++;
        renderRelicStats();
      }
    };

    function commitRelicLevelInput() {
      const next = clampRelicLevel(levelInput.value, 1, relicMaxLevel);
      if (next !== relicLevel) {
        relicLevel = next;
        renderRelicStats();
        return;
      }
      levelInput.value = String(relicLevel);
    }

    levelInput.onchange = commitRelicLevelInput;
    levelInput.onblur = commitRelicLevelInput;
    levelInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        commitRelicLevelInput();
      }
    };
  }
  renderRelicStats();

  // Forge UI
  const abilityBox = document.getElementById("relicAbilityBox");
  const logBox = document.getElementById("relicLogBox");
  let forgeValue = 1;
  let maxForge = 1;
  let forgeData = null;

  if (!hasPassiveEffect) {
    abilityBox.innerHTML = `
      <h2>No Passive Effect</h2>
      <p class="description">Class 1-2 relics do not grant passive effects.</p>
    `;
    logBox.style.display = "none";
    return;
  }

  if (data.forge && typeof data.forge === "object") {
    forgeData = data.forge;
    maxForge = Math.max(
      ...Object.values(forgeData).map(arr => Array.isArray(arr) ? arr.length : 1)
    );
  }

  function getForgeDesc(forgeLevel) {
    let desc = data.abilityDesc || "";
    if (forgeData) {
      desc = desc.replace(/\[\$_(\d+)\]/g, (match, n) => {
        const arr = forgeData["value" + n];
        if (arr && arr[forgeLevel - 1]) return arr[forgeLevel - 1];
        return match;
      });
    }
    return desc;
  }

  abilityBox.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <h2>${data.relicAbility ?? ""}</h2>
      <div class="forge-ui forge-ui-small">
        <button class="forge-btn forge-btn-small" id="forgeLeft">&lt;</button>
        <span class="forge-indicator forge-indicator-small" id="forgeIndicator">${forgeValue}</span>
        <button class="forge-btn forge-btn-small" id="forgeRight">&gt;</button>
      </div>
    </div>
    <p class="description" id="forgeDesc">${highlightKeywords(getForgeDesc(forgeValue))}</p>
  `;

  const forgeLeft = document.getElementById("forgeLeft");
  const forgeRight = document.getElementById("forgeRight");
  const forgeIndicator = document.getElementById("forgeIndicator");
  const forgeDesc = document.getElementById("forgeDesc");

  function updateForgeUI() {
    forgeIndicator.textContent = forgeValue;
    forgeDesc.innerHTML = highlightKeywords(getForgeDesc(forgeValue));
    forgeLeft.disabled = forgeValue === 1;
    forgeRight.disabled = forgeValue === maxForge;
  }

  forgeLeft.onclick = () => {
    if (forgeValue > 1) {
      forgeValue--;
      updateForgeUI();
    }
  };

  forgeRight.onclick = () => {
    if (forgeValue < maxForge) {
      forgeValue++;
      updateForgeUI();
    }
  };

  updateForgeUI();

  // Logs

  if (data.log && typeof data.log === "object") {
    const logRecords = Object.values(data.log).filter(
      rec => rec.version || rec.description
    );

    if (logRecords.length > 0) {
      logBox.style.display = "block";
      logBox.innerHTML = `<h2>Update Log</h2>`;

      logRecords.forEach(record => {
        logBox.innerHTML += `
          <div class="fragment-entry">
            <strong>${record.version ?? ""}</strong><br>
            <span class="description">${highlightKeywords(record.description ?? "")}</span>
          </div>`;
      });
    } else {
      logBox.style.display = "none";
    }
  } else {
    logBox.style.display = "none";
  }
}
