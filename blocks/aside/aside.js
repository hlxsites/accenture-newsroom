import { createEl } from '../../scripts/scripts.js';
import { decorateIcons, getMetadata, loadScript } from '../../scripts/lib-franklin.js';

async function generatePDF(pageTitle) {
  // Source HTMLElement or a string containing HTML.
  const main = document.querySelector('main');
  const pageName = pageTitle.replace(/[^a-z0-9]/gi, '-');
  const { jsPDF } = window.jspdf;
  // eslint-disable-next-line new-cap
  const doc = new jsPDF();
  await doc.html(main, {
    // eslint-disable-next-line no-shadow
    callback(doc) {
      // Save the PDF
      doc.save(`${pageName}`);
    },
    margin: [10, 10, 10, 10],
    autoPaging: 'text',
    x: 0,
    y: 0,
    width: 190, // target width in the PDF document
    windowWidth: 900, // window width in CSS pixels
  });
}

export default async function decorate(block) {
  block.innerText = '';
  const pageUrl = window.location.href;
  const pageTitle = getMetadata('title');
  // Create social share icons
  const social = createEl('div', { class: 'social' });

  // Linkedin
  const linkedinShareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${pageUrl}&title=${pageTitle}`;
  const linkedinShare = `
    <a href="${linkedinShareUrl}"
        onclick="return !window.open(this.href, 'Linkedin', 'width=640,height=580')">
        <span class="icon icon-social-linkedin" />
    </a>`;
  createEl('div', { class: 'linkedin-share' }, linkedinShare, social);

  // Twitter
  const twitterUrl = `https://twitter.com/share?text=${pageTitle}&url=${pageUrl}`;
  const twitterShare = `
    <a href="${twitterUrl}"
        onclick="return !window.open(this.href, 'Twitter', 'width=640,height=580')">
        <span class="icon icon-social-twitter" />
    </a>`;
  createEl('div', { class: 'twitter-share' }, twitterShare, social);

  // Facebook
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}&display=popup&ref=plugin&src=share_button`;
  const facebookShare = `
    <a href="${facebookUrl}"
        onclick="return !window.open(this.href, 'Facebook', 'width=640,height=580')">
        <span class="icon icon-social-facebook" />
    </a>`;
  createEl('div', { class: 'facebook-share' }, facebookShare, social);

  // Email
  const emailUrl = `mailto:?subject=${pageTitle}&body=Read this from Accenture Newsroom: ${pageUrl}`;
  const emailShare = `
    <a href="${emailUrl}"
        target="_blank">
        <span class="icon icon-social-email" />
    </a>`;
  createEl('div', { class: 'email-share' }, emailShare, social);

  // Print
  const printShare = `
    <a href="javascript:void(0)"
      onclick="window.print()">
      <span class="icon icon-social-print" />
    </a>`;
  createEl('div', { class: 'print-share' }, printShare, social);

  await decorateIcons(social);
  const share = createEl('div', { class: 'share' }, social);
  const shareTitle = createEl('h4', {}, 'Share');
  share.prepend(shareTitle);
  block.append(share);

  // PDF Download button
  const addPDF = getMetadata('pdf');
  if (addPDF && (addPDF === 'true')) {
    const pdfButton = createEl('a', { class: 'pdf-button button' }, 'DOWNLOAD PRESS RELEASE', share);
    // Add the js2pdf script
    await loadScript('/scripts/jspdf.umd.min.js');
    await loadScript('/scripts/html2canvas.min.js');
    pdfButton.addEventListener('click', async () => {
      if (window.jspdf) {
        await generatePDF(pageTitle);
      }
    });
  }
}
