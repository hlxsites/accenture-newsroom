import {
  getMetadata,
} from '../../scripts/lib-franklin.js';

function isSearchPage() {
  return window.location.pathname === '/search';
}
export default async function decorate(block) {
  let template = getMetadata('template');
  block.innerHTML = '';
  template = template ? template.toLowerCase() : '';
  const newsRoomLink = document.createElement('h2');
  newsRoomLink.innerHTML = '<a href="/">Newsroom</a>';
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
  }
}
