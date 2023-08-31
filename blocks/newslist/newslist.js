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
  const regexp = [/drafts\/.*/];
  const templates = ['category'];
  return jsonData.filter((row) => {
    if (internalPaths.includes(row.path)) {
      return false;
    }
    if (regexp.some((r) => r.test(row.path))) {
      return false;
    }
    if (templates.includes(row.template)) {
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
  const date = new Date(parseInt(dateString, 10));
  // display the date with two digits.

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });
}

/**
 * In the longdescrptionextracted field, iterate over all the child nodes and
 * check if the content matches with the regex, then return it as description.
 * Oterwise return the description field.
 * @param {*} queryIndexEntry
 * @returns
 */
function getDescription(queryIndexEntry) {
  const descriptionRegex = /(.*?);.*?(\d{4})/;
  const { longdescriptionextracted } = queryIndexEntry;
  const div = document.createElement('div');
  div.innerHTML = longdescriptionextracted;
  const longdescriptionElements = Array.from(div.querySelectorAll('p'));
  const matchingParagraph = longdescriptionElements.find((p) => descriptionRegex.test(p.innerText));
  const longdescription = matchingParagraph ? matchingParagraph.innerText : '';
  if (queryIndexEntry.description.length > longdescription.length) {
    return queryIndexEntry.description;
  }
  return longdescription;
}

function filterByQuery(index, query) {
  if (!query) return [];
  const queryTokens = query.split(' ');
  return index.filter((e) => {
    const title = e.title.toLowerCase();
    const longdescription = getDescription(e).toLowerCase();
    return queryTokens.every((token) => {
      if (title.includes(token) || longdescription.includes(token)) {
        return true;
      }
      return false;
    });
  });
}

function filterByDate(index, fromDate, toDate) {
  if (!fromDate || !toDate) return index;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (from > to) return [];
  return index.filter((e) => {
    const date = new Date(parseInt(e.publisheddateinseconds * 1000, 10));
    return date >= from && date <= to;
  });
}

/**
 * appends the given param to the existing params of the url
 */
function addParam(name, value) {
  const usp = new URLSearchParams(window.location.search);
  if (name && value) {
    usp.set(name, value);
  }
  if (!value) {
    usp.delete(name);
  }
  return `${window.location.pathname}?${usp.toString()}`;
}

/**
 * Creates start, mid and end groups of page numbers for pagination
 * @param {*} totalPages
 * @param {*} currentPage
 * @returns
 */
function getPaginationGroups(totalPages, currentPage) {
  const MAX_ENTRIES = 7;
  if (totalPages <= MAX_ENTRIES) {
    const r = [];
    for (let i = 1; i <= totalPages; i += 1) {
      r.push(i);
    }
    return r;
  }

  const start = [];
  const mid = [];
  const end = [];

  // Include initial pages
  if (currentPage < 5) {
    for (let i = 1; i < Math.min(totalPages, 5); i += 1) {
      start.push(i);
    }
  } else {
    start.push(1);
    start.push(2);
  }

  // Include middle page numbers with current, previous, and next page numbers
  if (currentPage >= 5 && currentPage < totalPages) {
    for (let i = currentPage - 1; i <= Math.min(currentPage + 1, totalPages); i += 1) {
      mid.push(i);
    }
  }

  // Include last two page numbers
  if (currentPage < totalPages - 2) {
    end.push(totalPages - 1);
    end.push(totalPages);
  }
  const result = [start, mid, end];
  if (result.length < MAX_ENTRIES) {
    let diff = MAX_ENTRIES - (start.length + mid.length + end.length);
    // add a few more numbers from the previous of zero set
    if (end.length === 0) {
      let midSetFirstElement = mid[0];
      if (!midSetFirstElement) {
        mid.push(currentPage);
        midSetFirstElement = currentPage;
        diff -= 1;
      }
      for (let i = 1; i <= diff; i += 1) {
        // add to the start of mid array
        mid.unshift(midSetFirstElement - i);
      }
    } else if (mid.length === 0) {
      const startSetSize = start.length;
      for (let i = 1; i <= diff; i += 1) {
        start.push(startSetSize + i);
      }
    }
  }

  return result;
}

function getYears(index) {
  const years = [];
  index.forEach((e) => {
    const date = new Date(parseInt(e.publisheddateinseconds * 1000, 10));
    const year = date.getFullYear();
    if (!years.includes(year)) {
      years.push(year);
    }
  });
  return years;
}

function filterByYear(index, year) {
  if (!year) return index;
  return index.filter((e) => {
    const date = new Date(parseInt(e.publisheddateinseconds * 1000, 10));
    return date.getFullYear() === parseInt(year, 10);
  });
}

function collapseWhenOutofFocus(event) {
  if (!event.target.closest('#newslist-filter-year')) {
    const yearPicker = document.querySelector('#newslist-filter-year');
    const yearDropdown = yearPicker.querySelector('.newslist-filter-year-dropdown');
    const isExpanded = yearDropdown.getAttribute('aria-expanded');
    if (isExpanded) {
      yearDropdown.setAttribute('aria-expanded', 'false');
    }
  }
}

function addEventListenerToYearPicker(newsListContainer) {
  const yearPicker = newsListContainer.querySelector('#newslist-filter-year');
  yearPicker.addEventListener('click', () => {
    const yearDropdown = yearPicker.querySelector('.newslist-filter-year-dropdown');
    const isExpanded = yearDropdown.getAttribute('aria-expanded');
    if (isExpanded === 'true') {
      yearDropdown.setAttribute('aria-expanded', 'false');
      window.removeEventListener('click', collapseWhenOutofFocus);
    } else {
      yearDropdown.setAttribute('aria-expanded', 'true');
      window.addEventListener('click', collapseWhenOutofFocus);
    }
  });
  const yearItems = newsListContainer.querySelectorAll('.newslist-filter-year-item');
  yearItems.forEach((item) => {
    item.addEventListener('click', () => {
      const year = item.getAttribute('value');
      const yearUrl = addParam('year', year);
      window.location.href = yearUrl;
    });
  });
}

function addEventListenerToFilterForm(block) {
  const filterForm = block.querySelector('#filter-form');
  const filterFormLabel = filterForm.querySelector('label');
  const filterArrow = filterForm.querySelector('.newslist-filter-arrow');
  const filterInput = filterForm.querySelector('#newslist-filter-input');
  const filterFormSubmit = filterForm.querySelector('input[type="submit"]');
  const filterYear = filterForm.querySelector('#newslist-filter-year');
  filterFormLabel.addEventListener('click', () => {
    const isActive = filterArrow.classList.contains('active');
    if (isActive) {
      filterArrow.classList.remove('active');
      filterInput.style.display = 'none';
      filterFormSubmit.style.display = 'none';
      if (filterYear) {
        filterYear.style.display = 'none';
      }
    } else {
      filterArrow.classList.add('active');
      filterInput.style.display = 'inline';
      filterFormSubmit.style.display = 'inline';
      if (filterYear) {
        filterYear.style.display = 'inline-block';
      }
    }
  });
}

export default async function decorate(block) {
  const limit = 10;
  // get request parameter page as limit
  const usp = new URLSearchParams(window.location.search);
  const fromDate = usp.get('from_date');
  const toDate = usp.get('to_date');
  const year = usp.get('year');
  const pageOffset = parseInt(usp.get('page'), 10) || 1;
  const offset = (Math.max(pageOffset, 1) - 1) * 10;
  const l = offset + limit;
  const cfg = readBlockConfig(block);
  const key = Object.keys(cfg)[0];
  const value = Object.values(cfg)[0];
  const isSearch = key === 'query';
  const index = await fetchIndex();
  let shortIndex = index;
  const newsListContainer = document.createElement('div');
  newsListContainer.classList.add('newslist-container');

  if (isSearch) {
    newsListContainer.classList.add('search-results-container');
    const query = usp.get('q') || '';
    shortIndex = filterByQuery(index, query);
    const searchHeader = document.createElement('div');
    searchHeader.classList.add('search-header-container');
    const form = `
      <form action="/search" method="get" id="search-form">
        <input type="text" id="search-input" title="Keywords" placeholder="Keywords" name="q" value="${query}" size="40" maxlength="60">
        <input type="submit" value="Search">
      </form>
    `;
    if (query) {
      searchHeader.innerHTML = `
      ${form}
      <h2>Results for "${query}"</h2>
      <div class="search-sub-header">
        <h3> ${shortIndex.length > 0 ? 'ALL RESULTS' : '0 RESULTS WERE FOUND'} </h3>
        <div class="search-sub-header-right">
          ${shortIndex.length > 0 ? `Showing ${offset + 1} - ${Math.min(l, shortIndex.length)} of ${shortIndex.length} results` : ''}
        </div>
      </div>
      `;
    } else {
      searchHeader.innerHTML = form;
    }
    newsListContainer.append(searchHeader);
  } else if (key && value) {
    shortIndex = index.filter((e) => {
      const values = e[key.trim()].toLowerCase().split(',').map((v) => v.trim());
      if (values.includes(value.trim().toLowerCase())) {
        return true;
      }
      return false;
    });
    const years = getYears(shortIndex);
    let options = years.map((y) => (`<div class="newslist-filter-year-item" value="${y}" >${y}</div>`)).join('');
    options = `<div class="newslist-filter-year-item" value="" >YEAR</div> ${options}`;
    // prepend filter form and year picker
    const newsListHeader = document.createElement('div');
    newsListHeader.classList.add('newslist-header-container');
    newsListHeader.innerHTML = `
      <form action="${window.location.pathname}" method="get" id="filter-form">
        <label for="newslist-filter-input">Filter News</label>
        <span class="newslist-filter-arrow"></span>
        <input type="text" id="newslist-filter-input" title="Date Range" name="date" value="DATE RANGE" size="40" maxlength="60" disabled>
        <input type="submit" value="" disabled>
        <div id="newslist-filter-year" name="year">
          ${year || 'YEAR'}
          <div class="newslist-filter-year-dropdown">
            ${options}
          </div>
        </div>
      </form>
    `;
    newsListContainer.append(newsListHeader);
    if (fromDate && toDate) {
      shortIndex = filterByDate(shortIndex, fromDate, toDate);
    } else if (year) {
      shortIndex = filterByYear(shortIndex, year);
    }
  } else {
    // prepend search form and date picker
    const newsListHeader = document.createElement('div');
    newsListHeader.classList.add('newslist-header-container');
    newsListHeader.innerHTML = `
      <form action="/search" method="get" id="newslist-search-form">
        <label for="newslist-search-input">Search</label>
        <input type="text" id="newslist-search-input" title="Keywords" name="q" value="" size="40" maxlength="60">
        <input type="submit" value="Search">
      </form>
      
      <form action="${window.location.pathname}" method="get" id="filter-form">
        <label for="newslist-filter-input">Filter News</label>
        <span class="newslist-filter-arrow"></span>
        <input type="text" id="newslist-filter-input" title="Date Range" name="date" value="DATE RANGE" size="40" maxlength="60" disabled>
        <input type="submit" value="" disabled>
      </form>
    `;
    newsListContainer.append(newsListHeader);
    if (fromDate && toDate) {
      shortIndex = filterByDate(index, fromDate, toDate);
    }
  }

  const range = document.createRange();
  for (let i = offset; i < l && i < shortIndex.length; i += 1) {
    const e = shortIndex[i];
    let itemHtml;
    if (isSearch) {
      itemHtml = `
      <div class="search-results-item">
        <div class="search-results-item-published-date">
          ${getHumanReadableDate(e.publisheddateinseconds * 1000)}
        </div>
        <div class="search-results-item-title">
          <a href="${e.path}">${e.title}</a>
        </div>
        <div class="search-results-item-content">${getDescription(e)}</div>
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
            <p>${getDescription(e)}</p>
          </div>
          <div class="newslist-item-footer">
            <a href="${e.path}">Read More <span class="read-more-arrow"></span></a>
            <div class="newslist-item-publisheddate">
              ${getHumanReadableDate(e.publisheddateinseconds * 1000)}
            </div>
          </div>
        </div>
      `;
    }
    const item = range.createContextualFragment(itemHtml);
    newsListContainer.append(item);
  }
  block.innerHTML = newsListContainer.outerHTML;

  if (key && value) {
    addEventListenerToYearPicker(block);
  }
  if (!isSearch) {
    addEventListenerToFilterForm(block);
  }

  // add pagination information
  if (shortIndex.length > 10) {
    const totalPages = Math.ceil(shortIndex.length / 10);
    const paginationGroups = getPaginationGroups(totalPages, pageOffset);
    const paginationContainer = document.createElement('div');
    paginationContainer.classList.add('newslist-pagination-container');
    for (let i = 0; i < paginationGroups.length; i += 1) {
      const pageGroup = paginationGroups[i];
      pageGroup.forEach((pageNumber) => {
        const pageUrl = addParam('page', pageNumber);
        const pageLink = document.createElement('a');
        pageLink.classList.add('pagination-link');
        pageLink.setAttribute('href', pageUrl);
        pageLink.innerText = pageNumber;
        if (pageNumber === pageOffset) {
          pageLink.classList.add('current-page');
        }
        paginationContainer.append(pageLink);
      });
      if (i < paginationGroups.length - 1 && paginationGroups[i + 1].length > 0) {
        const ellipsis = document.createElement('a');
        ellipsis.setAttribute('href', '#');
        ellipsis.classList.add('pagination-ellipsis');
        ellipsis.innerText = '...';
        paginationContainer.append(ellipsis);
      }
    }
    const prev = document.createElement('a');
    if (pageOffset === 1) {
      prev.setAttribute('aria-disabled', 'true');
    } else {
      prev.setAttribute('href', addParam('page', pageOffset - 1));
    }
    prev.classList.add('pagination-prev');
    prev.innerHTML = '<span class="pagination-prev-arrow"/>';
    paginationContainer.prepend(prev);
    const next = document.createElement('a');
    if (pageOffset === totalPages) {
      next.setAttribute('aria-disabled', 'true');
    } else {
      next.setAttribute('href', addParam('page', pageOffset + 1));
    }
    next.innerHTML = '<span class="pagination-next-arrow"/>';
    next.classList.add('pagination-next');
    paginationContainer.append(next);
    block.append(paginationContainer);
  }
}
