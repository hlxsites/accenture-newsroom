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
    const isYoutubeEmbed = config.url && config.url.includes('youtube');
    if (!isYoutubeEmbed) {
      await loadScript(VIDYARD_SCRIPT_URL, { async: 'false' });
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        if (isYoutubeEmbed) {
          const html = `
            <div class="video-container">
              <div>
                <iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen="" frameborder="0" height="385" src="${config.url}" title="YouTube video player"></iframe></p>
              </div>
            </div>
            `;
          block.innerHTML = html;
          return;
        }
        if (window.vidyardEmbed) {
          window.vidyardEmbed.api.renderDOMPlayers();
        }
        observer.disconnect();
      }
    });
    observer.observe(block);
    block.textContent = '';
    if (!isYoutubeEmbed) {
      const uuid = config.uuid || getUUID(config.url);
      const img = document.createElement('img');
      img.classList.add('vidyard-player-embed');
      img.src = `${VIDYARD_URL}${uuid}.jpg`;
      img.setAttribute('data-uuid', uuid);
      img.setAttribute('data-v', 4);
      img.setAttribute('data-type', 'inline');
      block.appendChild(img);
    }
  } else {
    block.remove();
  }
}
