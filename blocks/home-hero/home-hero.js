import {
  ANALYTICS_LINK_TYPE_ENGAGEMENT,
  ANALYTICS_LINK_TYPE_NAV_PAGINATE,
  ANALYTICS_MODULE_MARQUEE,
  ANALYTICS_MODULE_MULTIPAGE_NAV,
  ANALYTICS_TEMPLATE_ZONE_HERO,
  ANALYTICS_TEMPLATE_ZONE_BODY,
} from '../../scripts/constants.js';
import { annotateLinkEl } from '../../scripts/scripts.js';

export default async function decorate(block) {
  const title = block.querySelector('h1');
  const overlayContainer = document.createElement('div');
  overlayContainer.classList.add('overlay-container');
  block.querySelectorAll('em').forEach((element) => {
    const parent = element.parentNode;
    parent.innerHTML = element.innerHTML;
    overlayContainer.append(parent);
  });
  overlayContainer.querySelectorAll('a').forEach((link) => {
    annotateLinkEl(
      link,
      link.textContent,
      ANALYTICS_MODULE_MARQUEE,
      ANALYTICS_TEMPLATE_ZONE_HERO,
      ANALYTICS_LINK_TYPE_ENGAGEMENT,
    );
  });
  title.insertAdjacentElement('afterend', overlayContainer);
  const stripe = document.createElement('div');
  stripe.classList.add('home-hero-stripe');
  title.insertAdjacentElement('afterend', stripe);
  const picture = block.querySelector('picture');
  const imgSrc = picture.querySelector('img').src;
  picture.remove();
  const content = block.querySelector('h1').parentNode;
  content.classList.add('home-hero-content-container');
  const links = block.querySelector('ul');
  if (links) {
    const linksContainer = document.createElement('div');
    linksContainer.classList.add('home-hero-links-container');
    linksContainer.append(links);
    links.querySelectorAll('a').forEach((link) => {
      annotateLinkEl(
        link,
        link.textContent,
        ANALYTICS_MODULE_MULTIPAGE_NAV,
        ANALYTICS_TEMPLATE_ZONE_BODY,
        ANALYTICS_LINK_TYPE_NAV_PAGINATE,
      );
    });
    block.append(linksContainer);
  }
  content.parentNode.style.backgroundImage = `url('${imgSrc}')`;
}
