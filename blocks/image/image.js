import { readBlockConfig } from '../../scripts/lib-franklin.js';

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const picture = block.querySelector('picture');
  if (!picture) {
    block.remove();
    return;
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
