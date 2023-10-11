/* eslint-disable no-console */
/* eslint-disable no-undef */
const isCategoryPage = (url) => {
  const { pathname } = new URL(url);
  if (pathname.endsWith('.htm')) {
    return false;
  }
  const validCategoryPages = ['/industries/', '/secteurs-dactivit/', '/subjects/', '/sujet/', '/argomento/'];
  return validCategoryPages.some((category) => pathname.includes(category));
};

function createVideoBlock(main, document) {
  const vidyardImgs = main.querySelectorAll('img[src*="play.vidyard.com"]');
  vidyardImgs.forEach((vidyardImg) => {
    const previewUrl = vidyardImg.src;
    const videoUrl = previewUrl.replace('.jpg', '');
    const videoCells = [
      ['Video'],
      ['url', videoUrl],
      ['preview', previewUrl],
    ];
    const videoBlock = WebImporter.DOMUtils.createTable(videoCells, document);
    vidyardImg.replaceWith(videoBlock);
  });
  // youtube videos
  const youtubeEmbeds = main.querySelectorAll('iframe[src*="youtube"]');
  youtubeEmbeds.forEach((youtubeEmbed) => {
    const youtubeUrl = youtubeEmbed.src;
    const videoCells = [
      ['Video'],
      ['url', youtubeUrl],
    ];
    const videoBlock = WebImporter.DOMUtils.createTable(videoCells, document);
    youtubeEmbed.replaceWith(videoBlock);
  });
}

const createMetadataBlock = (main, document, url) => {
  const meta = {};
  // add the template
  if (url.includes('/news/')) {
    meta.Template = 'Article';
  } else if (isCategoryPage(url)) {
    meta.Template = 'Category';
  }

  const title = document.head.querySelector('meta[property="og:title"]');
  if (title) {
    meta.Title = title.content;
  } else {
    const titleFromContent = document.head.querySelector('title');
    if (titleFromContent) meta.Title = titleFromContent.textContent;
  }
  if (isCategoryPage(url)) {
    const t = document.querySelector('#sec-hero h1');
    if (t) {
      meta.Title = t.textContent.trim();
    }
    const subtitle = document.querySelector('#sec-hero h1+.row');
    if (subtitle) {
      meta.Subtitle = subtitle.textContent.trim();
    }
  }

  const desc = document.head.querySelector('meta[property="og:description"]');
  if (desc) {
    meta.Description = desc.content.replace(/&ndash;/g, '-');
  } else {
    const description = document.head.querySelector('meta[name="description"]');
    if (description) meta.Description = description.content.replace(/&ndash;/g, '-');
  }

  const keywords = document.head.querySelector('meta[name="keywords"]');
  if (keywords) meta.Keywords = keywords.content;

  // Published date
  const publishedDate = document.head.querySelector('meta[name="datepublic"]');
  if (publishedDate) meta.PublishedDate = publishedDate.content;

  // Tags metadata
  const industryTagsContainer = document.querySelector('#tek-wrap-rightrail .wrap-industry ul');
  if (industryTagsContainer) {
    const industryTags = [];
    industryTagsContainer.querySelectorAll('li').forEach((li) => {
      let industryHref = li.querySelector('a').getAttribute('href');
      if (industryHref.endsWith('/')) {
        industryHref = industryHref.slice(0, -1);
      }
      const industryName = industryHref.split('/').pop();
      industryTags.push(industryName);
    });
    meta.Industries = industryTags.join(', ');
  }

  const subjectTagsContainer = document.querySelector('#tek-wrap-rightrail .wrap-subject ul');
  if (subjectTagsContainer) {
    const subjectTags = [];
    subjectTagsContainer.querySelectorAll('li').forEach((li) => {
      let subjectHref = li.querySelector('a').getAttribute('href');
      if (subjectHref.endsWith('/')) {
        subjectHref = subjectHref.slice(0, -1);
      }
      const subjectName = subjectHref.split('/').pop();
      subjectTags.push(subjectName);
    });
    meta.Subjects = subjectTags.join(', ');
  }
  // helper to create the metadata block
  const block = WebImporter.Blocks.getMetadataBlock(document, meta);

  // append the block to the main element
  main.append(block);

  // returning the meta object might be usefull to other rules
  return meta;
};

const createNewsListBlock = (main, document, url) => {
  const categoryContainer = main.querySelector('section.container-block');
  const cells = [
    ['Newslist'],
  ];
  let { pathname } = new URL(url);
  if (pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  const tagName = pathname.split('/').pop();
  if (url.includes('/industries/') || url.includes('/secteurs-dactivit/')) {
    cells.push(['Industries', tagName]);
  } else if (url.includes('/subjects/') || url.includes('/sujet/') || url.includes('/argomento/')) {
    cells.push(['Subjects', tagName]);
  }
  const table = WebImporter.DOMUtils.createTable(cells, document);
  categoryContainer.replaceWith(table);
  const secHero = main.querySelector('#sec-hero');
  if (secHero) secHero.remove();
};

const makeProxySrcs = (main, url) => {
  const newUrl = new URL(url);
  const host = newUrl.searchParams.get('host');
  main.querySelectorAll('img').forEach((img) => {
    if (img.src.startsWith('/')) {
      // make absolute
      const cu = new URL(host);
      img.src = `${cu.origin}${img.src}`.replace(/\/\//g, '/');
    }
    try {
      const u = new URL(img.src);
      u.searchParams.append('host', u.origin);
      img.src = `http://localhost:3001${u.pathname.replace(/\/\//g, '/')}${u.search}`;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Unable to make proxy src for ${img.src}: ${error.message}`);
    }
  });
};

const collectTextNodes = (node, list) => {
  if (node && node.nodeType && node.nodeType === Node.TEXT_NODE) {
    list.push(node);
  } else if (node && node.childNodes) {
    // eslint-disable-next-line no-restricted-syntax
    for (const childNode of node.childNodes) {
      collectTextNodes(childNode, list);
    }
  }
};

const findNextBrOrpNode = (node) => {
  let currentNode = node.parentElement.nextSibling;
  if (node.parentElement.nodeName === 'DIV') currentNode = node.nextSibling;
  if (node.parentElement.nodeName === 'H1') currentNode = node.parentElement.parentElement;
  if (node.parentElement.nodeName === 'H1' && node.parentElement.parentElement.nodeName === 'DIV') currentNode = node.parentElement.nextSibling;
  if (node.parentElement.nodeName === 'H1' && node.parentElement.parentElement.nodeName === 'SPAN' && node.parentElement.parentElement.parentElement.nodeName === 'P') currentNode = node.parentElement.parentElement.parentElement;
  if (node.parentElement.nodeName === 'SPAN' && node.parentElement.parentElement.nodeName === 'STRONG') currentNode = node.parentElement.parentElement.parentElement;
  if (node.parentElement.nodeName === 'SPAN' && node.parentElement.parentElement.nodeName === 'STRONG' && node.parentElement.parentElement.parentElement.nodeName === 'SPAN' && node.parentElement.parentElement.parentElement.parentElement.nodeName === 'P') currentNode = node.parentElement.parentElement.parentElement.parentElement;
  if (node.parentElement.nodeName === 'SPAN' && node.parentElement.parentElement.nodeName === 'B' && node.parentElement.parentElement.parentElement.nodeName === 'P') currentNode = node.parentElement.parentElement.parentElement.nextSibling;
  if (node.parentElement.nodeName === 'STRONG' && node.parentElement.parentElement.nodeName === 'SPAN') currentNode = node.parentElement.parentElement.parentElement;
  if (node.parentElement.nodeName === 'I' && node.parentElement.parentElement.nodeName === 'DIV') currentNode = node.parentElement.parentElement.nextSibling;

  // Check siblings first
  while (currentNode !== null) {
    if (currentNode.nodeName === 'BR' || currentNode.nodeName === 'P') {
      return currentNode;
    }
    currentNode = currentNode.nextSibling;
  }
  return null; // No next <br> node found
};

const replaceSupSubElements = (main) => {
  const sups = main.querySelectorAll('sup');
  sups.forEach((sup) => {
    sup.outerHTML = sup.textContent;
  });
  const subs = main.querySelectorAll('sub');
  subs.forEach((sub) => {
    sub.outerHTML = sub.textContent;
  });
};

export default {
  transform: ({
    // eslint-disable-next-line no-unused-vars
    document,
    url,
  }) => {
    // Remove unnecessary parts of the content
    const main = document.body;
    const results = [];
    let abstractNotFound = '';
    // Remove other stuff that shows up in the page
    const nav = main.querySelector('#block-header');
    if (nav) nav.remove();
    const hero = main.querySelector('#art-hero');
    if (hero) hero.remove();
    const features = main.querySelector('.f-wrap-features');
    if (features) features.remove();
    const pageType = main.querySelector('#tek-wrap-centerwell .page-type');
    if (pageType) pageType.remove();
    // remove filter form
    const filterForm = main.querySelector('form.filterForm');
    if (filterForm) filterForm.remove();
    // remove search modal
    const searchModal = main.querySelector('#myModal');
    if (searchModal) searchModal.remove();
    const loginWarning = main.querySelector('#loginwarning');
    if (loginWarning) loginWarning.remove();
    const nonMediaWarning = main.querySelector('#nonmediawarning');
    if (nonMediaWarning) nonMediaWarning.remove();
    const noscripts = main.querySelectorAll('noscript');
    if (noscripts && noscripts.length > 0) {
      noscripts.forEach((noscript) => {
        noscript.remove();
      });
    }
    const oneTrust = main.querySelector('#onetrust-consent-sdk');
    if (oneTrust) oneTrust.remove();
    const coachMarks = main.querySelector('#coach-marks-screen');
    if (coachMarks) coachMarks.remove();

    // Remove Footer
    const footer = main.querySelector('#block-footer');
    if (footer) footer.remove();

    // Get right nav
    const rightNav = main.querySelector('#tek-wrap-rightrail');

    // replace weird trailing backslash and ndash
    main.innerHTML = main.innerHTML.replace(/&ndash;/g, '-')
      .replaceAll('<br style="background-image: none;">', '<br>')
      .replace('<div style="text-align: center; background-image: none;"># # #</div>', '<br># # #')
      .replace('</strong> <br>', '</strong>')
      .replaceAll(/&nbsp;<br>/g, '<br>');

    // create video block
    createVideoBlock(main, document);

    // make proxy srcs for images
    makeProxySrcs(main, url);

    // convert title to h1 tag
    const title = main.querySelector('#tek-wrap-centerwell article strong');
    if (title) {
      title.outerHTML = `<h1>${title.innerHTML}</h1>`;
    }

    // add section after abstract for news articles only
    if (url.includes('/news/') && rightNav) {
      const contentDetails = main.querySelector('#tek-wrap-centerwell article #content-details');
      const primaryAbstractRegex = /(.*?);(.*?)(\d{4})/;
      const secondaryAbstractRegex = /(.*?)(\d{4})\s+–\s+\b|(.*?)(\d{4})\s+-\s+\b|\b(\d+)\b(.*?)(\d{4})\b|(.*?),(.*?)(\d{4})\b/;
      const contentDetailsTextNodes = [];
      collectTextNodes(contentDetails, contentDetailsTextNodes);
      const primaryMatchingParagraph = contentDetailsTextNodes.find(
        (p) => primaryAbstractRegex.test(p.textContent),
      );
      if (primaryMatchingParagraph) {
        console.log('found primary match!');
        const nextBrNode = findNextBrOrpNode(primaryMatchingParagraph);
        if (nextBrNode) {
          const br1 = document.createElement('br');
          const br2 = document.createElement('br');
          nextBrNode.after(br1);
          nextBrNode.after('---');
          nextBrNode.after(br2);
        } else {
          console.log(`${new URL(url).pathname} - abstract not found`);
          abstractNotFound = 'true';
        }
      } else {
        const secondaryMatchingParagraph = contentDetailsTextNodes.find(
          (p) => secondaryAbstractRegex.test(p.textContent),
        );
        if (secondaryMatchingParagraph) {
          console.log('found secondary match!');
          const nextBrNode = findNextBrOrpNode(secondaryMatchingParagraph);
          if (nextBrNode) {
            const br1 = document.createElement('br');
            const br2 = document.createElement('br');
            nextBrNode.after(br1);
            nextBrNode.after('---');
            nextBrNode.after(br2);
          } else {
            console.log(`${new URL(url).pathname} - abstract not found`);
            abstractNotFound = 'true';
          }
        } else {
          console.log(`${new URL(url).pathname} - abstract not found`);
          abstractNotFound = 'true';
        }
      }
    }

    // If contact info in right rail, move it to the bottom of the content
    const authors = main.querySelectorAll('#tek-wrap-rightrail .wrap-feature.author .pad-bottom20');
    if (authors && authors.length > 0) {
      authors.forEach((author) => {
        main.append(author);
      });
    }

    // Handle Tables from the source content
    const tables = main.querySelectorAll('table');
    if (tables && tables.length > 0) {
      tables.forEach((table) => {
        const videoRegex = /.*https:\/\/play.vidyard.com.*|.*youtube.*/;
        const isVideo = videoRegex.test(table.outerHTML);
        if (isVideo) return;
        const cells = [
          ['Table'],
          [table.outerHTML],
        ];
        const newTable = WebImporter.DOMUtils.createTable(cells, document);
        table.after(newTable);
        table.remove();
      });
    }

    const meta = createMetadataBlock(main, document, url);

    // remove tek-pager arrows
    const pagerArrows = main.querySelectorAll('.tek-pager.p-l-arrow, .tek-pager.p-r-arrow');
    if (pagerArrows && pagerArrows.length > 0) {
      pagerArrows.forEach((arrow) => {
        arrow.remove();
      });
    }

    // remove right nav
    const rightNavStillExists = main.querySelector('#tek-wrap-rightrail');
    if (rightNavStillExists) rightNavStillExists.remove();

    if (isCategoryPage(url)) {
      createNewsListBlock(main, document, url);
      if (url.endsWith('/')) {
        // eslint-disable-next-line no-param-reassign
        url = url.slice(0, -1);
      }
    }
    replaceSupSubElements(main);

    if (meta.PublishedDate && url.includes('/news/')) {
      const publishedYear = new Date(meta.PublishedDate).getFullYear().toString().trim();
      const newPath = decodeURIComponent(new URL(url).pathname).replace('.htm', '').replace('/news/', `/news/${publishedYear}/`);
      const destinationUrl = WebImporter.FileUtils.sanitizePath(newPath);
      results.push({
        element: main,
        path: newPath,
        report: {
          'Destination Url': destinationUrl,
          'Missing abstract': abstractNotFound,
        },
      });
    } else {
      // main page import - "element" is provided, i.e. a docx will be created
      const newPath = decodeURIComponent(new URL(url).pathname).replace('.htm', '');
      const destinationUrl = WebImporter.FileUtils.sanitizePath(newPath);
      results.push({
        element: main,
        path: newPath,
        report: {
          'Destination Url': destinationUrl,
          'Missing abstract': abstractNotFound,
        },
      });
    }

    // find internal pdf links
    main.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href');
      if (href && href.endsWith('.pdf') && (href.includes('newsroom.accenture') || href.startsWith('/'))) {
        const newUrl = new URL(url);
        const host = newUrl.searchParams.get('host');
        if (href.startsWith('/')) {
          // make absolute
          const cu = new URL(host);
          a.setAttribute('href', `${cu.origin}${a.href}`.replace(/\/\//g, '/'));
        }
        try {
          const u = new URL(a.getAttribute('href'));
          u.searchParams.append('host', u.origin);
          // no "element", the "from" property is provided instead
          // importer will download the "from" resource as "path"
          const newPath = WebImporter.FileUtils.sanitizePath(u.pathname.replace(/\/\//g, '/'));
          results.push({
            path: newPath,
            from: `http://localhost:3001${u.pathname.replace(/\/\//g, '/')}${u.search}`,
          });

          // update the link to new path on the target host
          // this is required to be able to follow the links in Word
          // you will need to replace "main--repo--owner" by your project setup
          const newHref = new URL(newPath, 'https://main--accenture-newsroom--hlxsites.hlx.page').toString();
          a.setAttribute('href', newHref);
        } catch (error) {
          console.warn(`Unable to create PDF link for ${href}: ${error.message}`);
        }
      }
    });

    // remove section hero
    const sectionHero = main.querySelector('#sec-hero');
    if (sectionHero) sectionHero.remove();
    // remove any elements that are display:none
    main.querySelectorAll('[style]').forEach((el) => {
      if (el.style.display === 'none') {
        el.remove();
      }
    });

    return results;
  },
};
