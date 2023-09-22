import {
  getMetadata,
} from '../../scripts/lib-franklin.js';
import { createAnnotatedLinkEl } from '../../scripts/scripts.js';
import { ANALYTICS_LINK_TYPE_BREADCRUMB, ANALYTICS_MODULE_MARQUEE, ANALYTICS_TEMPLATE_ZONE_HERO } from '../../scripts/constants.js';

function isSearchPage() {
  return window.location.pathname === '/search';
}
export default async function decorate(block) {
  let template = getMetadata('template');
  block.innerHTML = '';
  template = template ? template.toLowerCase() : '';
  const newsRoomLink = document.createElement('h2');
  const annotatedLink = createAnnotatedLinkEl(
    '/',
    'Newsroom',
    ANALYTICS_MODULE_MARQUEE,
    ANALYTICS_TEMPLATE_ZONE_HERO,
    ANALYTICS_LINK_TYPE_BREADCRUMB,
  );
  newsRoomLink.innerHTML = annotatedLink.outerHTML;
  block.append(newsRoomLink);

  if (isSearchPage()) {
    const title = document.createElement('h1');
    title.innerHTML = 'Newsroom Search';
    block.append(title);
  } else if (template === 'category') {
    const title = document.createElement('h1');
    title.innerHTML = getMetadata('og:title');
    const subtitle = document.createElement('div');
    subtitle.classList.add('subtitle');
    subtitle.innerHTML = getMetadata('subtitle');
    block.append(title);
    block.append(subtitle);
  } else if (template === 'article') {
    const heroLinkContainer = document.createElement('div');
    heroLinkContainer.classList.add('hero-link-container');
    block.append(heroLinkContainer);
  } else if (template === 'error') {
    const title = document.createElement('h1');
    title.innerHTML = 'Page not found';
    block.append(title);
  } else {
    const pageTitle = getMetadata('og:title');
    if (pageTitle.includes('|')) {
      const title = document.createElement('h1');
      title.innerHTML = pageTitle.split('|')[0].trim();
      block.append(title);
    }
  }
}
