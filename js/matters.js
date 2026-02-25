// matters.js

let mattersInitialized = false;
let openMatterId = null;

function initMatters() {
  if (mattersInitialized) return;
  mattersInitialized = true;

  if (!Array.isArray(matters)) matters = [];
  renderMattersList(matters);
}

function filterMattersList() {
  const search = (document.getElementById("mattersSearchBar")?.value || "").toLowerCase().trim();
  const type = (document.getElementById("matterTypeFilter")?.value || "All").toLowerCase();

  const filtered = matters.filter(m => {
    const target = [
      m.name,
      m.type,
      m.set2,
      m.set4,
      m.set,
      Array.isArray(m.fusionSet) ? m.fusionSet.join(" ") : ""
    ].join(" ").toLowerCase();

    const matchType = type === "all" || (m.type || "").toLowerCase() === type;
    const matchSearch = target.includes(search);
    return matchType && matchSearch;
  });

  renderMattersList(filtered);
}

function renderMattersList(list) {
  const container = document.getElementById("mattersList");
  if (!container) return;

  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML = "<p class='text-muted'>No matters found.</p>";
    openMatterId = null;
    return;
  }

  container.innerHTML = list.map((item, index) => renderMatterCard(item, index)).join("");
  bindMatterAccordion(container);
}

function renderMatterCard(item, index) {
  const type = (item.type || "normal").toLowerCase();
  const cardClass = type === "fusion" ? "matter-card fusion" : "matter-card";
  const matterId = `matter-${index}`;

  const fusionBlock = (type === "fusion" && Array.isArray(item.fusionSet))
    ? `
      <div class="matter-chip-list">
        ${item.fusionSet.map(name => `<span class="matter-chip">${escapeHtml(name)}</span>`).join("")}
      </div>
    `
    : "";

  const normalBlocks = type !== "fusion"
    ? `
      ${renderSetBlock("2 Piece Set", item.set2)}
      ${renderSetBlock("4 Piece Set", item.set4)}
    `
    : "";

  return `
    <article class="${cardClass}" data-matter-id="${matterId}">
      <div class="matter-header">
        <h4 class="matter-title">${escapeHtml(item.name || "Unknown Matter")}</h4>
        <span class="matter-type-badge">${escapeHtml(type)}</span>
      </div>
      <div class="matter-preview">Click to expand description</div>
      <div class="matter-actions">
        <button class="matter-expand-btn" type="button" aria-expanded="false">View</button>
      </div>
      <div class="matter-body" hidden>
        ${fusionBlock}
        ${normalBlocks}
        ${renderSetBlock(type === "fusion" ? "Fusion Set" : "Full Set", item.set)}
      </div>
    </article>
  `;
}

function bindMatterAccordion(container) {
  const cards = Array.from(container.querySelectorAll(".matter-card"));
  if (!cards.length) return;

  cards.forEach(card => {
    const cardId = card.dataset.matterId;
    const expandBtn = card.querySelector(".matter-expand-btn");

    if (expandBtn) {
      expandBtn.addEventListener("click", () => toggleMatter(cardId, cards));
    }
  });

  if (openMatterId) {
    const openCard = cards.find(c => c.dataset.matterId === openMatterId);
    if (openCard) {
      setCardOpen(openCard, true);
    } else {
      openMatterId = null;
    }
  }
}

function toggleMatter(matterId, cards) {
  if (openMatterId === matterId) {
    collapseAllMatters(cards);
    return;
  }

  collapseAllMatters(cards);
  const target = cards.find(card => card.dataset.matterId === matterId);
  if (!target) return;

  setCardOpen(target, true);
  openMatterId = matterId;
}

function collapseAllMatters(cards) {
  cards.forEach(card => setCardOpen(card, false));
  openMatterId = null;
}

function setCardOpen(card, isOpen) {
  const body = card.querySelector(".matter-body");
  const expandBtn = card.querySelector(".matter-expand-btn");
  if (!body || !expandBtn) return;

  card.classList.toggle("is-open", isOpen);
  body.hidden = !isOpen;
  expandBtn.setAttribute("aria-expanded", String(isOpen));
  expandBtn.textContent = isOpen ? "Open" : "View";
}

function renderSetBlock(title, text) {
  if (!text) return "";
  return `
    <section class="matter-set-block">
      <h5>${escapeHtml(title)}</h5>
      <p>${highlightKeywords(escapeHtml(text))}</p>
    </section>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
