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
  readBlockConfig, decorateIcons, decorateSections, loadBlocks,
} from '../../scripts/lib-franklin.js';
import {
  annotateElWithAnalyticsTracking,
  getSiteFromHostName,
} from '../../scripts/scripts.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const socialTitlesMapping = {
    linkedin: 'Follow us on Linkedin',
    twitter: 'Follow us on Twitter',
    facebook: 'Follow us on Facebook',
    youtube: 'See Accenture on YouTube',
  };

  const socialTitlesGeoMapping = {
    fr: {
      linkedin: 'Suivez-nous sur LinkedIn',
      twitter: 'Suivez-nous sur Twitter',
      facebook: 'Suivez-nous sur Facebook',
      youtube: 'Découvrez nos vidéos sur YouTube',
    },
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
    preFooter.querySelectorAll('a').forEach((link) => {
      const moduleName = link.innerText === 'Contact Us' ? ANALYTICS_MODULE_CONTACT_US : ANALYTICS_MODULE_CORPORATE_INFORMATION_LINKS;
      annotateElWithAnalyticsTracking(
        link,
        link.innerText,
        moduleName,
        ANALYTICS_TEMPLATE_ZONE_BODY,
        ANALYTICS_LINK_TYPE_CALL_TO_ACTION,
      );
    });

    const footerBlack = footer.querySelector('.section.footer-black');
    footerBlack.querySelectorAll('a').forEach((link) => {
      const icon = link.querySelector('span[class*="icon-"]');
      const geo = getSiteFromHostName();
      let text = link.innerText;
      if (icon) {
        // find the class name with pattern icon- from the icon classList
        const iconClass = [...icon.classList].find((className) => className.startsWith('icon-'));
        // remove the icon class from the iconClass
        const iconName = iconClass.replace('icon-', '');
        if (socialTitlesGeoMapping[geo]) {
          text = socialTitlesGeoMapping[geo][iconName] || '';
        } else {
          text = socialTitlesMapping[iconName] || '';
        }
        link.setAttribute('title', text);

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
