import { readBlockConfig } from '../../scripts/lib-franklin.js';

export default function decorate(block) {
  const config = readBlockConfig(block);
  if (config.url) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        const html = `
          <div class="video-container">
            <div>
                <iframe loading="lazy" allow="encrypted-media" allowfullscreen="" src="${config.url}"></iframe>
            </div>
          </div>
        `;
        block.innerHTML = html;
        observer.disconnect();
      }
    });
    observer.observe(block);
    block.textContent = '';
    const previewImage = config.preview;
    if (previewImage) {
      const img = document.createElement('img');
      img.src = previewImage;
      img.alt = config.title || '';
      block.appendChild(img);
    }
  } else {
    block.remove();
  }
}
