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
function displayData(data) {
  document.getElementById("characterName").textContent = data.name;

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

  let rows = "";

  for (let i = 0; i < Math.max(leftStats.length, rightStats.length); i++) {
    const leftKey = leftStats[i];
    const rightKey = rightStats[i];

    const leftVal  = formatPercentMaybe(leftKey,  data[leftKey]);
    const rightVal = formatPercentMaybe(rightKey, data[rightKey]);

    rows += `
      <tr>
        <td><strong>${formatKey(leftKey)}</strong>: ${leftVal ?? ""}</td>
        <td><strong>${formatKey(rightKey)}</strong>: ${rightVal ?? ""}</td>
      </tr>`;
  }

  specialStats.forEach(stat => {
    rows += `
      <tr>
        <td colspan="2"><strong>${formatKey(stat)}</strong>: ${data[stat]||""}</td>
      </tr>`;
  });

  coreStatsTable.innerHTML = rows;

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
  skillBox.innerHTML = `<h2>Skills</h2>`;

  const attacks = [
    { name: data.normalAttackName, desc: data.normalAttackDesc },
    { name: data.chargedAttackName, desc: data.chargedAttackDesc, resource: `Charge Cost: ${data.chargeCost}` },
    { name: data.normalSkillName, desc: data.normalSkillDesc,
      resource: `Flux Cost: ${data.fluxCost}, Memory Nodes: ${(Object.values(data.memoryNodes||{})).join(", ")}` },
    { name: data.riftedSkillName, desc: data.riftedSkillDesc,
      resource: `Surge Cost: ${data.surgeCost}, Energy Cost: ${data.energyCost}` }
  ];

  attacks.forEach(({name, desc, resource}) => {
    if (!name && !desc) return;

    skillBox.innerHTML += `
      <div class="fragment-entry">
        <h4>${name || ""}</h4>
        ${resource ? `<p><strong>${resource}</strong></p>` : ""}
        <p class="description">${highlightKeywords(desc||"")}</p>
      </div>`;
  });

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
