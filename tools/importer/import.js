/* eslint-disable no-undef */
const isCategoryPage = (url) => (url.includes('/industries/') || url.includes('/subjects/'));

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
      industryTags.push(li.textContent.trim());
    });
    meta.Industries = industryTags.join(', ');
  }

  const subjectTagsContainer = document.querySelector('#tek-wrap-rightrail .wrap-subject ul');
  if (subjectTagsContainer) {
    const subjectTags = [];
    subjectTagsContainer.querySelectorAll('li').forEach((li) => {
      subjectTags.push(li.textContent.trim());
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
  const titleEl = main.querySelector('#sec-hero h1');
  let title = '';
  if (titleEl) {
    title = titleEl.textContent.trim();
  }
  if (url.includes('/industries/')) {
    cells.push(['Industries', title]);
  } else if (url.includes('/subjects/')) {
    cells.push(['Subjects', title]);
  }
  const table = WebImporter.DOMUtils.createTable(cells, document);
  categoryContainer.replaceWith(table);
  const secHero = main.querySelector('#sec-hero');
  if (secHero) secHero.remove();
};

const makeProxySrcs = (main, host = 'https://newsroom.accenture.com') => {
  main.querySelectorAll('img').forEach((img) => {
    if (img.src.startsWith('/')) {
      // make absolute
      const cu = new URL(host);
      img.src = `${cu.origin}${img.src}`.replace(/\/\//g, '/');
    }
    try {
      const u = new URL(img.src);
      u.searchParams.append('host', u.origin);
      img.src = `http://localhost:3001${u.pathname}${u.search}`;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Unable to make proxy src for ${img.src}: ${error.message}`);
    }
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

    // Remove other stuff that shows up in the page
    const nav = main.querySelector('#block-header');
    if (nav) nav.remove();
    const hero = main.querySelector('#art-hero');
    if (hero) hero.remove();
    const features = main.querySelector('.f-wrap-features');
    if (features) features.remove();
    const pageType = main.querySelector('#tek-wrap-centerwell .page-type');
    if (pageType) pageType.remove();
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

    // Remove Footer
    const footer = main.querySelector('#block-footer');
    if (footer) footer.remove();

    // replace weird trailing backslash and ndash
    main.innerHTML = main.innerHTML.replace(/&ndash;/g, '-').replace('<div style="text-align: center; background-image: none;"># # #</div>', '<br># # #');

    // make proxy srcs for images
    makeProxySrcs(main);

    const meta = createMetadataBlock(main, document, url);

    // remove right nav
    const rightNav = main.querySelector('#tek-wrap-rightrail');
    if (rightNav) rightNav.remove();

    if (isCategoryPage(url)) {
      createNewsListBlock(main, document, url);
      if (url.endsWith('/')) {
        // eslint-disable-next-line no-param-reassign
        url = url.slice(0, -1);
      }
    }

    if (meta.PublishedDate && url.includes('/news/')) {
      const publishedYear = new Date(meta.PublishedDate).getFullYear().toString().trim();
      const newPath = new URL(url).pathname.replace('.htm', '').replace('/news/', `/news/${publishedYear}/`);
      results.push({
        element: main,
        path: newPath,
      });
      return results;
    }
    // main page import - "element" is provided, i.e. a docx will be created
    results.push({
      element: main,
      path: new URL(url).pathname.replace('.htm', ''),
    });
    return results;
  },
};
