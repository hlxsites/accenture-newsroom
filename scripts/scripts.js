import {
  sampleRUM,
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
  getMetadata,
} from './lib-franklin.js';

const LCP_BLOCKS = []; // add your LCP blocks to the list

// regex to find abstract paragraph
export const ABSTRACT_REGEX = /(.*?);.*?(\d{4})|(.*?)(\d{4})\s+–\s+\b|(.*?)(\d{4})\s+-\s+\b/;

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

export async function fetchIndex(indexURL = '/query-index.json', limit = 1000) {
  if (window.queryIndex && window.queryIndex[indexURL]) {
    return window.queryIndex[indexURL];
  }
  try {
    const resp = await fetch(`${indexURL}?limit=${limit}}`);
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

// DOM helper
export function createEl(name, attributes = {}, content = '', parentEl = null) {
  const el = document.createElement(name);

  Object.keys(attributes).forEach((key) => {
    el.setAttribute(key, attributes[key]);
  });
  if (content) {
    if (typeof content === 'string') {
      el.innerHTML = content;
    } else if (content instanceof NodeList) {
      content.forEach((itemEl) => {
        el.append(itemEl);
      });
    } else if (content instanceof HTMLCollection) {
      Array.from(content).forEach((itemEl) => {
        el.append(itemEl);
      });
    } else {
      el.append(content);
    }
  }
  if (parentEl) {
    parentEl.append(el);
  }
  return el;
}

async function addPrevNextLinksToArticles() {
  const template = getMetadata('template');
  const heroBlock = document.querySelector('.hero.block');
  if (template !== 'Article' || !heroBlock) {
    return;
  }
  const indexURL = '/query-index.json';
  const limit = 10000;
  const queryIndex = await fetchIndex(indexURL, limit);
  // iterate queryIndex to find current article and add prev/next links
  const currentArticlePath = window.location.pathname;
  const currentArticleIndex = queryIndex.findIndex((row) => row.path === currentArticlePath);
  if (currentArticleIndex === -1) {
    return;
  }
  const prevArticle = queryIndex[currentArticleIndex + 1];
  const nextArticle = queryIndex[currentArticleIndex - 1];
  const heroLinkContainer = heroBlock.querySelector('.hero-link-container');
  let prevLink = '';
  let nextLink = '';
  if (prevArticle) {
    prevLink = createEl('a', { href: prevArticle.path, class: 'prev' }, 'Previous');
  } else {
    prevLink = createEl('a', { href: '#', class: 'prev disabled' }, 'Previous');
  }
  if (nextArticle) {
    nextLink = createEl('a', { href: nextArticle.path, class: 'next' }, 'Next');
  } else {
    nextLink = createEl('a', { href: '#', class: 'next disabled' }, 'Next');
  }
  heroLinkContainer.append(prevLink);
  heroLinkContainer.append(nextLink);
}

function annotateArticleSections() {
  const template = getMetadata('template');
  if (template !== 'Article') {
    return;
  }
  const articleSections = document.querySelectorAll('main > .section');
  articleSections.forEach((section) => {
    const sectionText = section.innerText;
    const isAbstract = ABSTRACT_REGEX.test(sectionText);
    if (isAbstract) {
      section.classList.add('abstract');
      const h1 = section.querySelector('h1');
      if (h1) {
        const date = h1.previousSibling;
        if (date) {
          date.classList.add('date');
        }
      }
    }
  });
}

/**
 * Builds aside block and attaches it to main in a new section.
 * @param {Element} main The container element
 */
function buildAsideBlock(main) {
  const template = getMetadata('template');
  if (template === 'Article') {
    const section = document.createElement('div');
    section.append(buildBlock('aside', { elems: [] }));
    main.append(section);
  }
}

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const template = getMetadata('template');
  if (template === 'home' || window.location.pathname === '/') {
    return;
  }
  const section = document.createElement('div');
  section.append(buildBlock('hero', { elems: [] }));
  main.prepend(section);
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildAsideBlock(main);
    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    // article processing
    annotateArticleSections();
    document.body.classList.add('appear');
    await waitForLCP(LCP_BLOCKS);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
  // article processing
  addPrevNextLinksToArticles();

  sampleRUM('lazy');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  sampleRUM.observe(main.querySelectorAll('picture > img'));
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
