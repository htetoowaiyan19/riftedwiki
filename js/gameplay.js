// gameplay.js

let gameplayData = null;

function initGameplay() {
  if (gameplayData) return;

  const listEl = document.getElementById('gameplayList');
  if (!listEl) return;

  fetch('gameplay/index.json')
    .then(res => res.json())
    .then(data => {
      gameplayData = data;
      renderGameplayList(data);
    })
    .catch(() => {
      listEl.innerHTML = "<p class='text-danger'>Error loading gameplay data.</p>";
    });
}

function renderGameplayList(data) {
  const listEl = document.getElementById('gameplayList');
  if (!listEl) return;
  listEl.innerHTML = '';

  Object.entries(data).forEach(([key, item]) => {
    const container = document.createElement('div');
    container.className = 'gameplay-item mb-2';

    const header = document.createElement('div');
    header.className = 'gameplay-header';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'false');
    header.innerHTML = `<div class="gameplay-title fw-bold">${item.title || key}</div>`;

    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    header.appendChild(arrow);

    const desc = document.createElement('div');
    desc.className = 'gameplay-desc';
    desc.innerHTML = highlightKeywords(item.desc || '');

    function toggleOpen() {
      const isOpen = container.classList.toggle('open');
      header.setAttribute('aria-expanded', String(!!isOpen));
    }

    header.addEventListener('click', toggleOpen);
    header.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleOpen(); } });

    container.appendChild(header);
    container.appendChild(desc);
    listEl.appendChild(container);
  });
}

function filterGameplayList() {
  const q = (document.getElementById('gameplaySearchBar')?.value || '').toLowerCase();
  const listEl = document.getElementById('gameplayList');
  if (!listEl) return;

  const items = Array.from(listEl.children);
  items.forEach(itemEl => {
    const title = (itemEl.querySelector('.gameplay-header .fw-bold')?.textContent || '').toLowerCase();
    const desc = (itemEl.querySelector('.gameplay-desc')?.textContent || '').toLowerCase();
    const match = title.includes(q) || desc.includes(q);
    itemEl.style.display = match ? '' : 'none';
  });
}
