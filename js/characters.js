// characters.js

// -------------------- Character List --------------------
function renderCharacterList(data) {
  const list = document.getElementById("characterList");
  list.innerHTML = "";

  data.forEach(char => {
    const item = document.createElement("div");
    const stateClass = (char.version && char.version[1] === "unreleased") ? "unreleased" : "released";
    item.className = `char-item ${stateClass}`;

    const badgeText = (char.version && char.version[1] === "unreleased") ? "Upcoming" : (char.version ? char.version[0] : "");

    item.innerHTML = `
      <div class="char-row">
        <div class="char-name">${char.name}</div>
        <div class="version-badge">${badgeText}</div>
      </div>`;

    item.onclick = () => loadCharacter(`characters/${char.file}`);
    list.appendChild(item);
  });
}

function filterList() {
  const query = document.getElementById("searchBar").value.toLowerCase();
  const filtered = characters.filter(c =>
    c.name.toLowerCase().includes(query)
  );

  renderCharacterList(filtered);
}

function backToList() {
  document.getElementById("content").style.display = "none";
  document.getElementById("loader").style.display = "block";
}

function loadCharacter(path) {
  fetch(path)
    .then(res => res.json())
    .then(data => {
      document.getElementById("loader").style.display = "none";
      document.getElementById("content").style.display = "block";
      displayData(data);
    })
    .catch(err => alert("Error loading file: " + err.message));
}

// -------------------- Character Details --------------------
const CHARACTER_STAT_SCALE = {
  baseHp: 0.06441,
  baseAtk: 0.038294,
  basePhyDef: 0.040182,
  baseMagDef: 0.040182
};
const MAIN_STAT_MAX_LEVEL = 90;
const SKILL_MAX_LEVEL = 15;

function formatScaledNumber(value, decimals = 2) {
  if (!Number.isFinite(value)) return String(value ?? "");
  const fixed = value.toFixed(decimals);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function clampLevel(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function getScaledCoreStat(key, value, level) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value ?? "";

  const ratio = CHARACTER_STAT_SCALE[key];
  if (ratio === undefined) return value ?? "";

  const scaled = n * (1 + ratio * (level - 1));
  return Math.round(scaled);
}

function resolveSkillDesc(desc, level, multipliers, bases) {
  if (!desc || typeof desc !== "string") return desc || "";

  const hasScaleToken = /\[\$_\d+,\s*([^\]]+)\]/.test(desc);
  if (!hasScaleToken || !Array.isArray(multipliers)) return desc;

  return desc.replace(/\[\$_(\d+),\s*([^\]]+)\](%?)/g, (match, rawIndex, rawBase, percentMark) => {
    const index = Number(rawIndex) - 1;
    const multiplier = Number(multipliers[index]);
    if (!Number.isFinite(multiplier)) return match;

    let baseValue;
    const baseToken = String(rawBase).trim();
    if (/^base$/i.test(baseToken)) {
      baseValue = Array.isArray(bases) ? Number(bases[index]) : Number.NaN;
    } else {
      baseValue = Number(baseToken);
    }

    if (!Number.isFinite(baseValue)) return match;
    const scaled = baseValue + multiplier * (level - 1);
    const isPercent = percentMark === "%";
    const displayValue = isPercent ? (scaled * 100) : scaled;
    return `${formatScaledNumber(displayValue)}${percentMark}`;
  });
}

function displayData(data) {
  document.getElementById("characterName").textContent = data.name;
  let mainStatLevel = 1;
  const skillLevels = {
    normalAttack: 1,
    chargedAttack: 1,
    normalSkill: 1,
    riftedSkill: 1
  };

  const coreStatsTable = document.getElementById("coreStats");

  const leftStats = ["baseAtk","basePwr","basePhyDef","baseMagDef","baseHp","baseCharge"];
  const rightStats = [
    "baseCritRate","baseCritDamage","riftedFaction",
    data.riftedFaction === "Rifted Technology" ? "riftedTech" : "riftedDisc",
    "faction","substat"
  ];

  const specialStats =
    data.riftedFaction === "Rifted Technology"
      ? ["baseFluxCapacity","baseSurgeCapacity"]
      : ["baseEchoMemroyCapacity","baseMaxEnergy"];

  function renderCoreStats() {
    let localRows = "";
    localRows += `
      <tr>
        <td colspan="2">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <strong>Character Main Stats Level</strong>
            <div class="forge-ui forge-ui-small" style="margin:0;">
              <button class="forge-btn forge-btn-small" id="mainStatLevelLeft">&lt;</button>
              <input type="number" min="1" max="${MAIN_STAT_MAX_LEVEL}" step="1" class="forge-indicator forge-indicator-small" id="mainStatLevelInput" value="${mainStatLevel}" style="width:64px;text-align:center;padding-right:6px;" />
              <button class="forge-btn forge-btn-small" id="mainStatLevelRight">&gt;</button>
            </div>
          </div>
        </td>
      </tr>`;

    for (let i = 0; i < Math.max(leftStats.length, rightStats.length); i++) {
      const leftKey = leftStats[i];
      const rightKey = rightStats[i];

      const scaledLeft = getScaledCoreStat(leftKey, data[leftKey], mainStatLevel);
      const leftRawValue = scaledLeft === "" ? data[leftKey] : scaledLeft;
      const leftVal = formatPercentMaybe(leftKey, leftRawValue);
      const rightVal = formatPercentMaybe(rightKey, data[rightKey]);

      localRows += `
        <tr>
          <td><strong>${formatKey(leftKey)}</strong>: ${leftVal ?? ""}</td>
          <td><strong>${formatKey(rightKey)}</strong>: ${rightVal ?? ""}</td>
        </tr>`;
    }

    specialStats.forEach(stat => {
      localRows += `
        <tr>
          <td colspan="2"><strong>${formatKey(stat)}</strong>: ${data[stat] || ""}</td>
        </tr>`;
    });

    coreStatsTable.innerHTML = localRows;

    const leftBtn = document.getElementById("mainStatLevelLeft");
    const rightBtn = document.getElementById("mainStatLevelRight");
    const levelInput = document.getElementById("mainStatLevelInput");

    levelInput.value = String(mainStatLevel);
    leftBtn.disabled = mainStatLevel === 1;
    rightBtn.disabled = mainStatLevel === MAIN_STAT_MAX_LEVEL;

    leftBtn.onclick = () => {
      if (mainStatLevel > 1) {
        mainStatLevel--;
        renderCoreStats();
      }
    };

    rightBtn.onclick = () => {
      if (mainStatLevel < MAIN_STAT_MAX_LEVEL) {
        mainStatLevel++;
        renderCoreStats();
      }
    };

    function commitMainLevelInput() {
      const next = clampLevel(levelInput.value, 1, MAIN_STAT_MAX_LEVEL);
      if (next !== mainStatLevel) {
        mainStatLevel = next;
        renderCoreStats();
        return;
      }
      levelInput.value = String(mainStatLevel);
    }

    levelInput.onchange = commitMainLevelInput;
    levelInput.onblur = commitMainLevelInput;
    levelInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        commitMainLevelInput();
      }
    };
  }

  // Passive
  let passiveHtml = `
    <h2>Talent: ${data.passiveName ?? ""}</h2>
    <p class="description">${highlightKeywords(data.passiveDesc ?? "")}</p>
  `;

  if (data.talentBox) {
    Object.values(data.talentBox).forEach(talent => {
      if (talent.name || talent.desc) {
        passiveHtml += `
          <div class="fragment-entry">
            <h5>${talent.name ?? ""}</h5>
            <p class="description">${highlightKeywords(talent.desc ?? "")}</p>
          </div>`;
      }
    });
  }

  if (data.riftedTalent || data.rTalentDesc) {
    passiveHtml += `
      <div class="fragment-entry">
        <h5>${data.riftedTalent ?? ""}</h5>
        <p class="description">${highlightKeywords(data.rTalentDesc ?? "")}</p>
      </div>`;
  }

  document.getElementById("passiveBox").innerHTML = passiveHtml;

  // Skills
  const skillBox = document.getElementById("skillBox");
  const charMultipliers = Array.isArray(data.multipliers) ? data.multipliers : null;
  const charBases = Array.isArray(data.multiplierBases) ? data.multiplierBases : null;

  function renderSkills() {
    skillBox.innerHTML = `<h2>Skills</h2>`;

    const attacks = [
      {
        key: "normalAttack",
        shortLabel: "NA",
        name: data.normalAttackName,
        desc: data.normalAttackDesc,
        multipliers: Array.isArray(data.normalAttackMultipliers) ? data.normalAttackMultipliers : charMultipliers,
        bases: Array.isArray(data.normalAttackMultiplierBases) ? data.normalAttackMultiplierBases : charBases
      },
      {
        key: "chargedAttack",
        shortLabel: "CA",
        name: data.chargedAttackName,
        desc: data.chargedAttackDesc,
        resource: `Charge Cost: ${data.chargeCost}`,
        multipliers: Array.isArray(data.chargedAttackMultipliers) ? data.chargedAttackMultipliers : charMultipliers,
        bases: Array.isArray(data.chargedAttackMultiplierBases) ? data.chargedAttackMultiplierBases : charBases
      },
      {
        key: "normalSkill",
        shortLabel: "NS",
        name: data.normalSkillName,
        desc: data.normalSkillDesc,
        resource: `Flux Cost: ${data.fluxCost}, Memory Nodes: ${(Object.values(data.memoryNodes || {})).join(", ")}`,
        multipliers: Array.isArray(data.normalSkillMultipliers) ? data.normalSkillMultipliers : charMultipliers,
        bases: Array.isArray(data.normalSkillMultiplierBases) ? data.normalSkillMultiplierBases : charBases
      },
      {
        key: "riftedSkill",
        shortLabel: "RS",
        name: data.riftedSkillName,
        desc: data.riftedSkillDesc,
        resource: `Surge Cost: ${data.surgeCost}, Energy Cost: ${data.energyCost}`,
        multipliers: Array.isArray(data.riftedSkillMultipliers) ? data.riftedSkillMultipliers : charMultipliers,
        bases: Array.isArray(data.riftedSkillMultiplierBases) ? data.riftedSkillMultiplierBases : charBases
      }
    ];

    attacks.forEach(({ key, shortLabel, name, desc, resource, multipliers, bases }) => {
      if (!name && !desc) return;
      const currentLevel = skillLevels[key] || 1;
      const resolvedDesc = resolveSkillDesc(desc || "", currentLevel, multipliers, bases);
      skillBox.innerHTML += `
        <div class="fragment-entry">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <h4>${name || ""}</h4>
            <div class="forge-ui forge-ui-small" style="margin:0;">
              <button class="forge-btn forge-btn-small" id="skillLeft-${key}">&lt;</button>
              <input type="number" min="1" max="${SKILL_MAX_LEVEL}" step="1" class="forge-indicator forge-indicator-small" id="skillInput-${key}" value="${currentLevel}" style="width:64px;text-align:center;padding-right:6px;" />
              <button class="forge-btn forge-btn-small" id="skillRight-${key}">&gt;</button>
            </div>
          </div>
          <p><strong>${shortLabel} Level: ${currentLevel}</strong></p>
          ${resource ? `<p><strong>${resource}</strong></p>` : ""}
          <p class="description">${highlightKeywords(resolvedDesc || "")}</p>
        </div>`;
    });

    attacks.forEach(({ key, name, desc }) => {
      if (!name && !desc) return;
      const leftBtn = document.getElementById(`skillLeft-${key}`);
      const rightBtn = document.getElementById(`skillRight-${key}`);
      const levelInput = document.getElementById(`skillInput-${key}`);
      if (!leftBtn || !rightBtn || !levelInput) return;

      levelInput.value = String(skillLevels[key]);
      leftBtn.disabled = skillLevels[key] === 1;
      rightBtn.disabled = skillLevels[key] === SKILL_MAX_LEVEL;

      leftBtn.onclick = () => {
        if (skillLevels[key] > 1) {
          skillLevels[key]--;
          renderSkills();
        }
      };

      rightBtn.onclick = () => {
        if (skillLevels[key] < SKILL_MAX_LEVEL) {
          skillLevels[key]++;
          renderSkills();
        }
      };

      function commitSkillLevelInput() {
        const next = clampLevel(levelInput.value, 1, SKILL_MAX_LEVEL);
        if (next !== skillLevels[key]) {
          skillLevels[key] = next;
          renderSkills();
          return;
        }
        levelInput.value = String(skillLevels[key]);
      }

      levelInput.onchange = commitSkillLevelInput;
      levelInput.onblur = commitSkillLevelInput;
      levelInput.onkeydown = (e) => {
        if (e.key === "Enter") {
          commitSkillLevelInput();
        }
      };
    });
  }

  renderCoreStats();
  renderSkills();

  // Fragments
  const fragmentBox = document.getElementById("fragmentBox");
  fragmentBox.innerHTML = `<h2>Fragments</h2>`;

  for (let i = 1; i <= 6; i++) {
    if (!data[`fragment${i}Name`] && !data[`fragment${i}Desc`]) continue;

    fragmentBox.innerHTML += `
      <div class="fragment-entry">
        <h4>${data[`fragment${i}Name`] || ""}</h4>
        <p class="description">${highlightKeywords(data[`fragment${i}Desc`] || "")}</p>
      </div>`;
  }

  // Logs
  if (data.log) {
    const logBox = document.getElementById("logBox");
    logBox.style.display = "block";
    logBox.innerHTML = `<h2>Update Log</h2>`;

    Object.entries(data.log).forEach(([_, record]) => {
      logBox.innerHTML += `
        <div class="fragment-entry">
          <strong>${record.version}</strong><br>
          <span class="description">${highlightKeywords(record.description || "")}</span>
        </div>`;
    });
  }
}
