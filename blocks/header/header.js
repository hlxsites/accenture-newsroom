import {
  ANALYTICS_LINK_TYPE_LOGO,
  ANALYTICS_LINK_TYPE_NAV_PAGINATE,
  ANALYTICS_LINK_TYPE_SEARCH_ACTIVITY,
  ANALYTICS_MODULE_PRIMARY_NAV,
  ANALYTICS_MODULE_SECONDARY_NAV,
  ANALYTICS_MODULE_TOP_NAV,
  ANALYTICS_TEMPLATE_ZONE_GLOBAL_HEADER,
} from '../../scripts/constants.js';
import {
  readBlockConfig,
  decorateButtons,
  decorateIcons,
} from '../../scripts/lib-franklin.js';
import { annotateElWithAnalyticsTracking, createAnnotatedLinkEl } from '../../scripts/scripts.js';

const KEY_ENTER = 'Enter';

const isDesktop = window.matchMedia('(min-width: 1000px)');

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
    section.classList.remove('active');
  });
}

function closeNav(e) {
  const escapePressed = e.code === 'Escape';
  const nav = document.querySelector('header nav');
  const navSections = nav.querySelector('.nav-sections');
  const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
  const outSideNavClicked = !e.target.closest('header nav');
  if (navSectionExpanded && (escapePressed || outSideNavClicked)) {
    // eslint-disable-next-line no-use-before-define
    collapseAllNavSections(navSections);
    navSectionExpanded.focus();
  }
}

function toggleSection(section) {
  const expanded = section.getAttribute('aria-expanded') === 'true';
  collapseAllNavSections(section.closest('ul').parentElement);
  section.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  section.classList.add('active');

  if (!expanded && isDesktop.matches) {
    document.addEventListener('click', closeNav);
  } else {
    document.removeEventListener('click', closeNav);
  }
}

function getLiTextContent(li) {
  let liText = '';
  for (let i = 0; i < li.childNodes.length; i += 1) {
    const node = li.childNodes[i];
    if (node.nodeType === Node.TEXT_NODE) {
      liText = node.textContent.trim();
      break;
    }
  }
  return liText;
}

const toggleLevelTwoSectionLabel = (section) => {
  const expanded = section.getAttribute('aria-expanded') === 'true';
  const menuBackButton = section.querySelector('span');

  if (expanded) {
    menuBackButton.nextSibling.nodeValue = section.parentNode.parentNode.firstChild.nodeValue;
    return;
  }
  menuBackButton.nextSibling.nodeValue = section.getAttribute('data-label');
};

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
  nav.setAttribute('id', 'header-topnav');
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
      const searchLink = createAnnotatedLinkEl(
        '/search',
        'Search',
        ANALYTICS_MODULE_TOP_NAV,
        ANALYTICS_TEMPLATE_ZONE_GLOBAL_HEADER,
        ANALYTICS_LINK_TYPE_SEARCH_ACTIVITY,
      );
      searchLink.innerHTML = '<div class="search-icon"></div>';
      section.innerHTML = searchLink.outerHTML;
    }
  });

  // link the home page to brand logo
  const navBrand = nav.querySelector('.nav-brand');
  const navBrandLink = createAnnotatedLinkEl(
    'https://www.accenture.com/us-en',
    'accenture',
    ANALYTICS_MODULE_TOP_NAV,
    ANALYTICS_TEMPLATE_ZONE_GLOBAL_HEADER,
    ANALYTICS_LINK_TYPE_LOGO,
  );
  navBrandLink.setAttribute('aria-label', 'Home');
  navBrandLink.innerHTML = navBrand.innerHTML;
  navBrand.innerHTML = '';
  navBrand.appendChild(navBrandLink);

  const navSections = navChildren[1];
  if (navSections) {
    navSections.querySelectorAll(':scope > ul > li').forEach((navSection) => {
      // deal with top level dropdowns first
      if (navSection.querySelector('ul')) {
        navSection.classList.add('nav-drop');
        navSection.setAttribute('tabindex', '0');
        annotateElWithAnalyticsTracking(
          navSection,
          getLiTextContent(navSection),
          ANALYTICS_MODULE_PRIMARY_NAV,
          ANALYTICS_TEMPLATE_ZONE_GLOBAL_HEADER,
          ANALYTICS_LINK_TYPE_NAV_PAGINATE,
        );
      }
      // replacing bold nav titles with divs for styling
      if (navSection.querySelector('strong')) {
        const sectionHeading = navSection.querySelector('strong');
        const headingParent = sectionHeading.parentElement;
        // const sectionHeadingNew = document.createElement('div');
        // sectionHeadingNew.classList.add('nav-heading');
        headingParent.innerHTML = sectionHeading.innerHTML;
        // headingParent.replaceChild(sectionHeadingNew, sectionHeading);
        headingParent.classList.add('nav-heading-container');
      }

      navSection.addEventListener('click', () => {
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
        // annotate levelTwo links
        const levelTwoLink = levelTwo.querySelector(':scope > a');
        if (levelTwoLink) {
          annotateElWithAnalyticsTracking(
            levelTwoLink,
            levelTwoLink.textContent,
            ANALYTICS_MODULE_SECONDARY_NAV,
            ANALYTICS_TEMPLATE_ZONE_GLOBAL_HEADER,
            ANALYTICS_LINK_TYPE_NAV_PAGINATE,
          );
        }
        levelTwo.parentElement.classList.add('level-two');
        // add back button to level 2
        levelTwo.querySelectorAll(':scope > ul').forEach((levelThree) => {
          const levelTwoElement = levelThree.parentElement;
          const levelTwoUl = levelTwoElement.parentElement;
          levelTwoElement.classList.add('sub-menu');
          levelTwoUl.classList.add('sub-menu-container');
          const backButton = document.createElement('span');
          backButton.classList.add('menu-back-button');
          levelTwoElement.prepend(backButton);
          levelTwoElement.setAttribute('data-label', backButton.nextSibling.nodeValue.trim());
        });

        levelTwo.addEventListener('click', (event) => {
          if (!isDesktop.matches) {
            toggleSection(levelTwo);
            toggleLevelTwoSectionLabel(levelTwo);
          }
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
          // annotate levelTwo links
          const levelThreeLink = levelThree.querySelector(':scope > a');
          if (levelThreeLink) {
            annotateElWithAnalyticsTracking(
              levelThreeLink,
              levelThreeLink.textContent,
              ANALYTICS_MODULE_SECONDARY_NAV,
              ANALYTICS_TEMPLATE_ZONE_GLOBAL_HEADER,
              ANALYTICS_LINK_TYPE_NAV_PAGINATE,
            );
          }
        });
      });
    });
  }

  if (isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeNav);
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation"
      data-analytics-link-name="menu" data-analytics-module-name=${ANALYTICS_MODULE_TOP_NAV}
      data-analytics-template-zone="${ANALYTICS_TEMPLATE_ZONE_GLOBAL_HEADER}"
      data-analytics-link-type="${ANALYTICS_LINK_TYPE_NAV_PAGINATE}">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => {
    const expanded = nav.getAttribute('aria-expanded') === 'true';
    document.body.style.overflowY = expanded ? '' : 'hidden';
    nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    document.querySelector('nav .nav-hamburger button').setAttribute('data-analytics-link-name', expanded ? 'menu' : 'menuclose');
  });
  nav.append(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  decorateIcons(nav);
  block.append(nav);
}
