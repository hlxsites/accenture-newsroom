import {
  ANALYTICS_LINK_TYPE_NAV_PAGINATE,
  ANALYTICS_MODULE_MARQUEE,
  ANALYTICS_MODULE_MULTIPAGE_NAV,
  ANALYTICS_TEMPLATE_ZONE_HERO,
  ANALYTICS_TEMPLATE_ZONE_BODY,
  ANALYTICS_LINK_TYPE_HERO_CONTENT,
} from '../../scripts/constants.js';
import { annotateElWithAnalyticsTracking } from '../../scripts/scripts.js';

function getBackgroundImage(picture) {
  const sources = picture.querySelectorAll('source[type="image/webp"');
  // eslint-disable-next-line no-restricted-syntax
  for (let i = 0; i < sources.length; i += 1) {
    const mediaQuery = sources[i].getAttribute('media');
    if (mediaQuery && window.matchMedia(mediaQuery).matches) {
      return sources[i].srcset;
    }
  }
  return picture.querySelector('source[type="image/webp"]:not([media]').srcset || picture.querySelector('img').src;
}

export default async function decorate(block) {
  const title = block.querySelector('h1');
  const overlayContainer = document.createElement('div');
  overlayContainer.classList.add('overlay-container');
  block.querySelectorAll('em').forEach((element) => {
    const parent = element.parentNode;
    parent.innerHTML = element.innerHTML;
    overlayContainer.append(parent);
  });
  overlayContainer.querySelectorAll('a').forEach((link, index) => {
    const linkText = (link.textContent && link.textContent.toLowerCase()) || '';
    const ctaAriaLabel = `${linkText}: ${link.href.split('/').pop()}`;

    if (index === 1) {
      link.setAttribute('aria-label', ctaAriaLabel);
    }
    annotateElWithAnalyticsTracking(
      link,
      index === 1 ? `${ctaAriaLabel}` : link.textContent,
      ANALYTICS_MODULE_MARQUEE,
      ANALYTICS_TEMPLATE_ZONE_HERO,
      ANALYTICS_LINK_TYPE_HERO_CONTENT,
    );
  });

  if (title) {
    title.insertAdjacentElement('afterend', overlayContainer);
    const stripe = document.createElement('div');
    stripe.classList.add('home-hero-stripe');
    title.insertAdjacentElement('afterend', stripe);
    const picture = block.querySelector('picture');
    const imgSrc = getBackgroundImage(picture);
    picture.remove();
    const content = block.querySelector('h1').parentNode;
    content.classList.add('home-hero-content-container');
    content.parentNode.style.backgroundImage = `url('${imgSrc}')`;
  }
  const links = block.querySelector('ul');
  if (links) {
    const linksContainer = document.createElement('div');
    linksContainer.classList.add('home-hero-links-container');
    linksContainer.append(links);
    links.querySelectorAll('a').forEach((link) => {
      annotateElWithAnalyticsTracking(
        link,
        link.textContent,
        ANALYTICS_MODULE_MULTIPAGE_NAV,
        ANALYTICS_TEMPLATE_ZONE_BODY,
        ANALYTICS_LINK_TYPE_NAV_PAGINATE,
      );
    });
    block.append(linksContainer);
  }
}
