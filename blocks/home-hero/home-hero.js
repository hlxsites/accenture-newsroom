export default async function decorate(block) {
  const title = block.querySelector('h1');
  const overlayContainer = document.createElement('div');
  overlayContainer.classList.add('overlay-container');
  block.querySelectorAll('em').forEach(element => {
    const parent = element.parentNode;
    parent.innerHTML = element.innerHTML;
    overlayContainer.append(parent);
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
    block.append(linksContainer);
  }
  content.parentNode.style.backgroundImage = `url('${imgSrc}')`;
}