import {
  ANALYTICS_LINK_TYPE_CALL_TO_ACTION,
  ANALYTICS_LINK_TYPE_FOOTER,
  ANALYTICS_MODULE_CONTACT_US,
  ANALYTICS_MODULE_CORPORATE_INFORMATION_LINKS,
  ANALYTICS_MODULE_FOOTER,
  ANALYTICS_TEMPLATE_ZONE_BODY,
  ANALYTICS_TEMPLATE_ZONE_FOOTER,
} from '../../scripts/constants.js';
import {
  readBlockConfig, decorateIcons, decorateSections, loadBlocks, fetchPlaceholders,
} from '../../scripts/lib-franklin.js';
import {
  annotateElWithAnalyticsTracking,
  getPlaceholder,
} from '../../scripts/scripts.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const placeholders = await fetchPlaceholders();
  const socialTitlesMapping = {
    linkedin: 'Follow us on Linkedin',
    twitter: 'Follow us on Twitter',
    facebook: 'Follow us on Facebook',
    youtube: 'See Accenture on YouTube',
  };

  const getSocialIconTitle = async (iconName) => {
    const placeHolderValue = await getPlaceholder(`${iconName}IconTitle`, placeholders);
    const checkPlaceHolderValue = placeHolderValue === `${iconName}IconTitle` ? '' : placeHolderValue;
    return checkPlaceHolderValue || socialTitlesMapping[iconName] || '';
  };

  const cfg = readBlockConfig(block);
  block.textContent = '';

  // fetch footer content
  const footerPath = cfg.footer || '/footer';
  const resp = await fetch(`${footerPath}.plain.html`, window.location.pathname.endsWith('/footer') ? { cache: 'reload' } : {});

  if (resp.ok) {
    const html = await resp.text();

    // decorate footer DOM
    const footer = document.createElement('div');
    footer.innerHTML = html;

    decorateSections(footer);
    loadBlocks(footer);
    decorateIcons(footer);

    // Footer logo
    const col = footer.querySelector('.section.footer-black .columns > div > div');
    if (col.textContent === 'Logo') {
      col.textContent = '';
      col.classList.add('acn-logo');
    }

    const preFooter = footer.querySelector('.section.pre-footer');
    const contactHrefText = getPlaceholder('contact', placeholders);
    preFooter.querySelectorAll('a').forEach((link) => {
      const moduleName = link.href.includes(contactHrefText) || link.href.includes('@')
        ? ANALYTICS_MODULE_CONTACT_US : ANALYTICS_MODULE_CORPORATE_INFORMATION_LINKS;
      annotateElWithAnalyticsTracking(
        link,
        link.innerText,
        moduleName,
        ANALYTICS_TEMPLATE_ZONE_BODY,
        ANALYTICS_LINK_TYPE_CALL_TO_ACTION,
      );
    });

    const footerBlack = footer.querySelector('.section.footer-black');
    footerBlack.querySelectorAll('a').forEach(async (link) => {
      const icon = link.querySelector('span[class*="icon-"]');
      let text = link.innerText;
      if (icon) {
        // find the class name with pattern icon- from the icon classList
        const iconClass = [...icon.classList].find((className) => className.startsWith('icon-'));
        // remove the icon class from the iconClass
        const iconName = iconClass.replace('icon-', '');
        const iconTitle = await getSocialIconTitle(iconName);
        text = iconTitle;
        link.setAttribute('title', iconTitle);

        const socialLink = icon.closest('a');
        socialLink.setAttribute('target', '_blank');
      }
      annotateElWithAnalyticsTracking(
        link,
        text,
        ANALYTICS_MODULE_FOOTER,
        ANALYTICS_TEMPLATE_ZONE_FOOTER,
        ANALYTICS_LINK_TYPE_FOOTER,
      );
    });

    block.append(footer);
  }
}
