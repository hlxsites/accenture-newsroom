export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });

  // convert mailto links to email
  block.querySelectorAll('a[href^="mailto"]').forEach((link) => {
    const img = document.createElement('img');
    img.src = '/icons/email.png';
    img.alt = 'email icon';
    link.innerHTML = '';
    link.prepend(img);
  });
}
