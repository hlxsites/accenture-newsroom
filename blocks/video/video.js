import { loadScript, readBlockConfig } from '../../scripts/lib-franklin.js';

const VIDYARD_URL = 'https://play.vidyard.com/';
const VIDYARD_SCRIPT_URL = 'https://play.vidyard.com/embed/v4.js';

function getUUID(url) {
  const { pathname } = new URL(url);
  return pathname.substring(1);
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  if (config.url || config.uuid) {
    await loadScript(VIDYARD_SCRIPT_URL, { async: 'true' });
    block.textContent = '';
    const uuid = config.uuid || getUUID(config.url);
    const img = document.createElement('img');
    img.src = `${VIDYARD_URL}${uuid}.jpg`;
    img.alt = config.title || '';
    img.setAttribute('data-uuid', uuid);
    img.setAttribute('data-v', 4);
    img.setAttribute('data-type', 'inline');
    img.classList.add('vidyard-player-embed');
    block.appendChild(img);
  } else {
    block.remove();
  }
}
