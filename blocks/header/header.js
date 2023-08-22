import {
  readBlockConfig,
  decorateButtons,
  decorateIcons,
  loadBlocks,
} from '../../scripts/lib-franklin.js';

const KEY_ENTER = 'Enter';

/**
 * Helper function to create DOM elements
 * @param {string} tag DOM element to be created
 * @param {object} attributes attributes to be added
 * @param html {HTMLElement | SVGAElement | string} Additional html to be appended to tag
 */

export function createTag(tag, attributes = {}, html = undefined) {
  const el = document.createElement(tag);
  if (html) {
    if (html instanceof HTMLElement || html instanceof SVGElement) {
      el.append(html);
    } else {
      el.insertAdjacentHTML('beforeend', html);
    }
  }
  if (attributes) {
    Object.entries(attributes).forEach(([key, val]) => {
      el.setAttribute(key, val);
    });
  }
  return el;
}

/**
 * collapses all open nav sections
 * @param {Element} sections The container element
 */

function collapseAllNavSections(sections) {
  if (!sections) {
    return;
  }
  sections.querySelectorAll(':scope > ul li').forEach((section) => {
    section.setAttribute('aria-expanded', 'false');
  });
}

function toggleSection(section) {
  const expanded = section.getAttribute('aria-expanded') === 'true';
  collapseAllNavSections(section.closest('ul').parentElement);
  section.setAttribute('aria-expanded', expanded ? 'false' : 'true');
}

/**
 * decorates the header, mainly the nav
 * @param {Element} block The header block element
 */

export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  block.textContent = '';

  // fetch nav content
  const navPath = cfg.nav || '/nav';
  const resp = await fetch(`${navPath}.plain.html`);
  if (!resp.ok) {
    return;
  }

  const html = await resp.text();

  // decorate nav DOM
  const nav = document.createElement('nav');
  nav.innerHTML = html;
  decorateIcons(nav);

  const navChildren = [...nav.children];
  const classes = ['brand', 'sections', 'tools'];

  navChildren.forEach((section, index) => {
    const sectionName = classes[index];
    section.classList.add(`nav-${sectionName}`);
    if (sectionName === 'brand') {
      decorateButtons(section, { decorateClasses: false });
    } else if (sectionName === 'tools') {
      decorateButtons(section);
    }
  });

  const navSections = navChildren[1];
  if (navSections) {
    navSections.querySelectorAll(':scope > ul > li').forEach((navSection) => {
      // deal with top level dropdowns first
      if (navSection.querySelector('ul')) {
        navSection.classList.add('nav-drop');
        navSection.setAttribute('tabindex', '0');
      }
      // replacing bold nav titles with divs for styling
      if (navSection.querySelector('strong')) {
        const sectionHeading = navSection.querySelector('strong');
        const headingParent = sectionHeading.parentElement;
        const sectionHeadingNew = createTag('div', { class: 'nav-heading' });
        sectionHeadingNew.innerHTML = sectionHeading.innerHTML;
        headingParent.replaceChild(sectionHeadingNew, sectionHeading);
      }

      navSection.addEventListener('click', (event) => {
        toggleSection(navSection);
      });
      navSection.addEventListener('keydown', (event) => {
        if (event.key === KEY_ENTER) {
          toggleSection(navSection);
          event.preventDefault();
        }
      });

      // Setup level 2 links
      navSection.querySelectorAll(':scope > ul > li').forEach((levelTwo) => {
        levelTwo.classList.add('level-two');
        levelTwo.parentElement.classList.add('level-two');
        // add back button to level 2
        levelTwo.querySelectorAll(':scope > ul').forEach((levelThree) => {
          const levelTwoElement = levelThree.parentElement;
          levelTwoElement.classList.add('sub-menu');
          const backButton = document.createElement('span');
          backButton.classList.add('menu-back-button');
          levelTwoElement.prepend(backButton);
        });

        levelTwo.addEventListener('click', (event) => {
          toggleSection(levelTwo);
          event.stopPropagation();
        });
        levelTwo.addEventListener('keydown', (event) => {
          if (event.key === KEY_ENTER) {
            toggleSection(levelTwo);
            event.preventDefault();
          }
        });

        // Setup level 3 links
        levelTwo.querySelectorAll(':scope > ul > li').forEach((levelThree) => {
          levelThree.classList.add('level-three');
        });
      });
    });
  }

  // add page scroll listener to know when header turns to sticky
  const header = block.parentNode;
  window.addEventListener('scroll', () => {
    const scrollAmount = window.scrollY;
    if (scrollAmount > header.offsetHeight) {
      header.classList.add('is-sticky');
    } else {
      header.classList.remove('is-sticky');
    }
  });

  // hamburger for mobile
  const hamburger = createTag('a', {
    class: 'nav-hamburger', role: 'button', tabindex: '0', 'aria-label': 'Menu',
  });
  hamburger.innerHTML = '<div class="nav-hamburger-icon"></div>';
  hamburger.addEventListener('click', () => {
    const expanded = nav.getAttribute('aria-expanded') === 'true';
    document.body.style.overflowY = expanded ? '' : 'hidden';
    nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  });
  nav.append(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  decorateIcons(nav);
  block.append(nav);
}