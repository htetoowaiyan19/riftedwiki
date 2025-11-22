// relics.js

// -------------------- Relic List --------------------
function renderRelicList(data) {
  const list = document.getElementById("relicList");
  list.innerHTML = "";

  data.forEach(relic => {
    const versionBadge = relic.version
      ? `<span>${relic.version[1] === "unreleased" ? "Upcoming" : relic.version[0]}</span>`
      : "";

    const item = document.createElement("div");
    item.className = `char-item ${relic.version ? relic.version[1] : "released"}`;
    item.innerHTML = `<span>${relic.relicName}</span>${versionBadge}`;
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
      document.getElementById("relicLoader").style.display = "none";
      document.getElementById("relicContent").style.display = "block";
      displayRelicData(data);
    })
    .catch(err => alert("Error loading relic file: " + err.message));
}

// -------------------- Relic Details --------------------
function displayRelicData(data) {
  document.getElementById("relicName").textContent = data.relicName;

  // Stats
  const relicStatsTable = document.getElementById("relicStats");
  let rows = "";

  const statRow = (label, value) => `
    <tr>
      <td style="width:20%; text-align:left; padding-right:4px;"><strong>${label}</strong></td>
      <td style="width:80%; text-align:left; padding-left:4px;">${value ?? ""}</td>
    </tr>`;

  rows += statRow(data.mainStatType ?? "", data.mainStat);
  rows += statRow(data.subStatType ?? "", data.subStat);
  rows += statRow("Faction", data.faction);
  if (data.relicGroup) {
    rows += statRow("Relic Group", data.relicGroup);
  }

  relicStatsTable.innerHTML = rows;

  // Forge UI
  const abilityBox = document.getElementById("relicAbilityBox");
  let forgeValue = 1;
  let maxForge = 1;
  let forgeData = null;

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
  const logBox = document.getElementById("relicLogBox");

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
