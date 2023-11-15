import {
  fetchPlaceholders,
} from '../../scripts/lib-franklin.js';

function sanitizeName(name) {
  if (!name) {
    return '';
  }

  const decodedText = decodeURIComponent(name.trim()).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const sanitizedText = decodedText.split(',').map((text) => text.trim().replace(/(?<=[^\s/])\s*\/\s*(?=[^\s/])/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).join(', ');
  return sanitizedText.trim();
}

function getPlaceholder(key, placeholders) {
  if (placeholders && placeholders[key]) {
    return placeholders[key];
  }
  return key;
}

function toCamelCaseTag(tag) {
  return tag.replace(/[^a-zA-Z0-9]/g, ' ').split(' ')
      .map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
}

function renderItems(cat, catId, taxonomy, placeholders) {
  let html = '';
  const items = taxonomy.map((item) => item[cat]);
  items.forEach((tag) => {
    const replaceAndTag =  tag === "Strategy & Consulting" ?  tag.replace('&','and') : tag;
    const sToCamelCaseTag = toCamelCaseTag(replaceAndTag.replace(/(?<=\w)\/(?=\w)/g, '')); // 'Win/News' --> 'WinNews' ....... "Win / News" --> "Win / News"
    const tagNamePlaceHolder = getPlaceholder(sToCamelCaseTag, placeholders);
    if (tag.trim() !== '') {
      html += `
      <span class="path">
        <span data-title="${replaceAndTag}" class="tag cat-${catId % 8}">${tagNamePlaceHolder}</span>
      </span>
    `;
    }
  });
  return html;
}

function initTaxonomy(taxonomy, placeholders) {
  let html = '';
  Object.keys(taxonomy[0]).forEach((cat, idx) => {
    html += '<div class="category">';
    html += `<h2>${cat}</h2>`;
    html += renderItems(cat, idx, taxonomy, placeholders);
    html += '</div>';
  });
  const results = document.getElementById('results');
  results.innerHTML = html;
}

async function getTaxonomy() {
  const resp = await fetch('/tags.json');
  const tagsJson = await resp.json();
  return tagsJson.data;
}

function filter() {
  const searchTerm = document.getElementById('search').value.toLowerCase();
  document.querySelectorAll('#results .tag').forEach((tag) => {
    const { title } = tag.dataset;
    const offset = title.toLowerCase().indexOf(searchTerm);
    if (offset >= 0) {
      const before = title.substring(0, offset);
      const term = title.substring(offset, offset + searchTerm.length);
      const after = title.substring(offset + searchTerm.length);
      tag.innerHTML = `${before}<span class="highlight">${term}</span>${after}`;
      tag.closest('.path').classList.remove('filtered');
    } else {
      tag.closest('.path').classList.add('filtered');
    }
  });
}

function toggleTag(target) {
  target.classList.toggle('selected');
  // eslint-disable-next-line no-use-before-define
  displaySelected();
  const selEl = document.getElementById('selected');
  const copyButton = selEl.querySelector('button.copy');
  copyButton.disabled = false;
}

function displaySelected() {
  const selEl = document.getElementById('selected');
  const selTagsEl = selEl.querySelector('.selected-tags');
  const toCopyBuffer = [];

  selTagsEl.innerHTML = '';
  const selectedTags = document.querySelectorAll('#results .path.selected');
  if (selectedTags.length > 0) {
    selectedTags.forEach((path) => {
      const clone = path.cloneNode(true);
      clone.classList.remove('filtered', 'selected');
      const tag = clone.querySelector('.tag');
      tag.innerHTML = tag.dataset.title;
      clone.addEventListener('click', () => {
        toggleTag(path);
      });
      toCopyBuffer.push(tag.dataset.title);
      selTagsEl.append(clone);
    });

    selEl.classList.remove('hidden');
  } else {
    selEl.classList.add('hidden');
  }

  const copybuffer = document.getElementById('copybuffer');
  copybuffer.value = toCopyBuffer.join(', ');
}

async function init() {
  const tax = await getTaxonomy();
  const placeholders = await fetchPlaceholders();

  initTaxonomy(tax, placeholders);

  const selEl = document.getElementById('selected');
  const copyButton = selEl.querySelector('button.copy');
  copyButton.addEventListener('click', () => {
    const copyText = document.getElementById('copybuffer');
    const sanitizedText = sanitizeName(copyText.value);
    navigator.clipboard.writeText(sanitizedText);

    copyButton.disabled = true;
  });

  selEl.querySelector('button.clear').addEventListener('click', () => {
    const selectedTags = document.querySelectorAll('#results .path.selected');
    selectedTags.forEach((tag) => {
      toggleTag(tag);
    });
  });

  document.querySelector('#search').addEventListener('keyup', filter);

  document.addEventListener('click', (e) => {
    const target = e.target.closest('.category .path');
    if (target) {
      toggleTag(target);
    }
  });
}

init();
