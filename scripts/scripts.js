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

/**
 * Adds long description to the meta tags
 * @param {Element} main The container element
 */
function addLongDescription(main) {
  const template = getMetadata('template');
  if (template === 'Article') {
    const longDesc = main.querySelector('p').innerText;
    const newMeta = document.createElement('meta');
    newMeta.setAttribute('name', 'longDescription');
    newMeta.setAttribute('content', longDesc);
    document.head.appendChild(newMeta);
  }
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
    addLongDescription(main);
    buildAsideBlock(main);
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
