import { readBlockConfig } from '../../scripts/lib-franklin.js';

/**
 * Traverse the whole json structure in data and replace '0' with empty string
 * @param {*} data
 * @returns updated data
 */
function replaceEmptyValues(data) {
  Object.keys(data).forEach((key) => {
    if (typeof data[key] === 'object') {
      replaceEmptyValues(data[key]);
    } else if (data[key] === '0') {
      data[key] = '';
    }
  });
  return data;
}

function skipInternalPaths(jsonData) {
  const internalPaths = ['/search', '/'];
  const regexp = [/drafts\/.*/, /sponsor\/.*/, /content\/.*/];
  return jsonData.filter((row) => {
    if (internalPaths.includes(row.path)) {
      return false;
    }
    if (regexp.some((r) => r.test(row.path))) {
      return false;
    }
    return true;
  });
}

async function fetchIndex(indexURL = '/query-index.json') {
  if (window.queryIndex && window.queryIndex[indexURL]) {
    return window.queryIndex[indexURL];
  }
  try {
    const resp = await fetch(indexURL);
    const json = await resp.json();
    replaceEmptyValues(json.data);
    const queryIndex = skipInternalPaths(json.data);
    window.queryIndex = window.queryIndex || {};
    window.queryIndex[indexURL] = queryIndex;
    return queryIndex;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(`error while fetching ${indexURL}`, e);
    return [];
  }
}

function getHumanReadableDate(dateString) {
  if (!dateString) return dateString;
  const date = new Date(parseInt(dateString));
  // display the date with two digits.

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });
}

function convertToKebabCase(str) {
  return str.toLowerCase().replace(/\s+/g, '-');
}

function filterByQuery(index, query) {
  if (!query) return index;
  const queryTokens = query.split(' ');
  return index.filter((e) => {
    const title = e.title.toLowerCase();
    const subtitle = e.subtitle.toLowerCase();
    const description = e.description.toLowerCase();
    return queryTokens.every((token) => {
      if (subtitle.includes(token)) {
        e.matchedToken = `... ${subtitle} ...`;
        return true;
      }
      if (description.includes(token)) {
        e.matchedToken = `... ${description} ...`;
        return true;
      }
      if (title.includes(token)) {
        e.matchedToken = `... ${title} ...`;
        return true;
      }
      return false;
    });
  });
}

/**
 * appends the given param to the existing params of the url
 */
function addParam(name, value) {
  const usp = new URLSearchParams(window.location.search);
  usp.set(name, value);
  return `${window.location.pathname}?${usp.toString()}`;
}

export default async function decorate(block) {
  const limit = 10;
  // get request parameter page as limit
  const usp = new URLSearchParams(window.location.search);
  const pageOffset = parseInt(usp.get('page'), 10) || 0;
  const offset = pageOffset * 10;
  const l = offset + limit;
  const cfg = readBlockConfig(block);
  const key = Object.keys(cfg)[0];
  let value = Object.values(cfg)[0];
  const isSearch = key === 'query';
  const index = await fetchIndex();
  let shortIndex = index;
  const newsListContainer = document.createElement('div');
  newsListContainer.classList.add('newslist-container');

  if (isSearch) {
    const query = usp.get('q') || '';
    shortIndex = filterByQuery(index, query);
    const searchHeader = document.createElement('div');
    searchHeader.classList.add('search-header-container');
    searchHeader.innerHTML = `
      <h2>Search Results</h2>
      <form action="/search" method="get" id="search-form">
        <div class="search-container" >
          <label for="edit-keys">Enter your keywords </label>
          <input type="text" id="search-input" name="q" value="${query}" size="40" maxlength="255">
        </div>
        <input type="submit" value="Search">
      </form>
    `;
    newsListContainer.append(searchHeader);
  } else if (key) {
    if (!value && usp.get('id')) {
      value = usp.get('id').toLowerCase();
    } else if (!value && !usp.get('id')) {
      block.remove();
      return;
    }
    if (key === 'featured-tech') {
      shortIndex = index.filter((e) => (e[key.trim()].toLowerCase()
        .includes(value.trim().toLowerCase())));
    } else {
      shortIndex = index.filter((e) => (e[key.trim()].toLowerCase()
        === value.trim().toLowerCase()));
    }

    const header = document.createElement('h2');
    header.innerText = value;
    newsListContainer.append(header);
  }

  const range = document.createRange();
  for (let i = offset; i < l && i < shortIndex.length; i += 1) {
    const e = shortIndex[i];
    let itemHtml;
    if (isSearch) {
      itemHtml = `
      <div class="search-resultslist-item">
        <div class="search-resultslist-item-header">
          <a href="${e.path}">${e.title}</a>
        </div>
        <div class="search-resultslist-item-content">${e.matchedToken || e.subtitle}</div>
        <div class="search-resultslist-item-details">
          <a href="/users/${convertToKebabCase(e.author)}">${e.author}</a> - ${getHumanReadableDate(e.publisheddate)}
        </div>
      </div>

      `;
    } else if (key && value) {
      itemHtml = `
      <div class="resultslist-item">
        <div class="resultslist-item-header">
          <a href="${e.path}">${e.title}</a>
        </div>
        <div class="resultslist-item-content">${e.subtitle}</div>
        <div class="resultslist-item-details">
          ${e.publisheddate} &nbsp;&nbsp;
        </div>
      </div>
    `;
    } else {
      itemHtml = `
        <div class="newslist-item">
          <div class="newslist-item-title">
            <h4> 
              <a href="${e.path}">${e.title}</a>
            </h4>
          </div>
          <div class="newslist-item-description">
            <p>${e.description}</p>
          </div>
          <div class="newslist-item-footer">
            <a href="${e.path}">Read More <span class="read-more-arrow"></span></a>
            <div class="newslist-item-publisheddate">
              ${getHumanReadableDate(e.publisheddatems)}
            </div>
          </div>
        </div>
      `;
    }
    const item = range.createContextualFragment(itemHtml);
    newsListContainer.append(item);
  }

  // add pagination information
  if (shortIndex.length > l || pageOffset > 0) {
    const prevUrl = addParam('page', parseInt(pageOffset, 10) - 1);
    const nextUrl = addParam('page', parseInt(pageOffset, 10) + 1);
    const prev = pageOffset > 0 ? `<a href="${prevUrl}">‹ previous</a>` : '';
    const next = shortIndex.length > l ? `<a href="${nextUrl}">next ›</a>` : '';
    const paginationHtml = `
      <div class="pagination">
        ${prev}  <b>${parseInt(pageOffset, 10) + 1} of ${Math.ceil(shortIndex.length / 10)}</b> ${next}
      </div>
    `;
    newsListContainer.append(range.createContextualFragment(paginationHtml));
  }

  block.innerHTML = newsListContainer.outerHTML;
}
