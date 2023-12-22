import { readBlockConfig, createOptimizedPicture } from '../../scripts/lib-franklin.js';

export default async function decorate(block) {
  const config = readBlockConfig(block);
  let picture = block.querySelector('picture');
  if (!picture && !config.url) {
    block.remove();
    return;
  }
  if (config.url) {
    const alt = config.url.split('/').pop().split('.')[0];
    picture = createOptimizedPicture(config.url, alt, true, [{ media: '(min-width: 600px)', width: config.width || '2000' }, { width: '750' }]);
  }
  const img = picture.querySelector('img');
  if (config.width) {
    img.style.width = config.width;
  }
  block.innerHTML = picture.outerHTML;
  if (config.caption) {
    const caption = document.createElement('p');
    caption.classList.add('caption');
    caption.textContent = config.caption;
    block.appendChild(caption);
  }
}
