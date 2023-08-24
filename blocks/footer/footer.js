import {
  readBlockConfig, decorateIcons, decorateSections, loadBlocks,
} from '../../scripts/lib-franklin.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
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

    block.append(footer);
  }
}
