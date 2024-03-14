import { html, signal, useEffect } from '../htm-preact.js';

const DEF_ICON = 'purple';
const DEF_DESC = 'Checking...';
const pass = 'green';
const fail = 'red';
const limbo = 'orange';

const h1Result = signal({ icon: DEF_ICON, title: 'H1 count', description: DEF_DESC });
const titleResult = signal({ icon: DEF_ICON, title: 'Title size', description: DEF_DESC });
const canonResult = signal({ icon: DEF_ICON, title: 'Canonical', description: DEF_DESC });
const descResult = signal({ icon: DEF_ICON, title: 'Meta description', description: DEF_DESC });
const pubDateResult = signal({ icon: DEF_ICON, title: 'Published Date', description: DEF_DESC });
const bodyResult = signal({ icon: DEF_ICON, title: 'Body size', description: DEF_DESC });
const loremResult = signal({ icon: DEF_ICON, title: 'Lorem Ipsum', description: DEF_DESC });
const linksResult = signal({ icon: DEF_ICON, title: 'Links', description: DEF_DESC });

function checkH1s() {
  const h1s = document.querySelectorAll('h1');
  const result = { ...h1Result.value };
  if (h1s.length === 1) {
    result.icon = pass;
    result.description = 'Only one H1 on the page.';
  } else {
    result.icon = fail;
    if (h1s.length > 1) {
      result.description = 'Reason: More than one H1 on the page.';
    } else {
      result.description = 'Reason: No H1 on the page.';
    }
  }
  h1Result.value = result;
  return result.icon;
}

async function checkTitle() {
  const titleSize = document.title.replace(/\s/g, '').length;
  const result = { ...titleResult.value };
  if (titleSize < 15) {
    result.icon = fail;
    result.description = 'Reason: Title size is too short.';
  } else if (titleSize > 70) {
    result.icon = fail;
    result.description = 'Reason: Title size is too long.';
  } else {
    result.icon = pass;
    result.description = 'Title size is good.';
  }
  titleResult.value = result;
  return result.icon;
}

// eslint-disable-next-line no-unused-vars
async function checkCanon() {
  const canon = document.querySelector("link[rel='canonical']");
  const result = { ...canonResult.value };
  const { href } = canon;

  try {
    const resp = await fetch(href, { method: 'HEAD' });
    if (!resp.ok) {
      result.icon = fail;
      result.description = 'Reason: Error with canonical reference.';
    }
    if (resp.ok) {
      if (resp.status >= 300 && resp.status <= 308) {
        result.icon = fail;
        result.description = 'Reason: Canonical reference redirects.';
      } else {
        result.icon = pass;
        result.description = 'Canonical referenced is valid.';
      }
    }
  } catch (e) {
    result.icon = limbo;
    result.description = 'Canonical cannot be crawled.';
  }
  canonResult.value = result;
  return result.icon;
}

async function checkDescription() {
  const metaDesc = document.querySelector('meta[name="description"]');
  const result = { ...descResult.value };
  if (!metaDesc) {
    result.icon = fail;
    result.description = 'Reason: No meta description found.';
  } else {
    const descSize = metaDesc.content.replace(/\s/g, '').length;
    if (descSize < 50) {
      result.icon = fail;
      result.description = 'Reason: Meta description too short.';
    } else if (descSize > 150) {
      result.icon = fail;
      result.description = 'Reason: Meta description too long.';
    } else {
      result.icon = pass;
      result.description = 'Meta description is good.';
    }
  }
  descResult.value = result;
  return result.icon;
}

async function checkPublishedDate() {
  const pubDate = document.querySelector('meta[name="publisheddate"]');
  const result = { ...pubDateResult.value };
  if (!pubDate) {
    result.icon = fail;
    result.description = 'Reason: No published date metadata found.';
  } else {
    const publishedDate = new Date(pubDate.content);
    if (!publishedDate) {
      result.icon = fail;
      result.description = 'Reason: Published date is not a valid date.';
    } else {
      result.icon = pass;
      result.description = 'Published date is good.';
    }
  }
  pubDateResult.value = result;
  return result.icon;
}

async function checkBody() {
  const result = { ...bodyResult.value };
  const { length } = document.documentElement.innerText;

  if (length > 100) {
    result.icon = pass;
    result.description = 'Body content has a good length.';
  } else {
    result.icon = fail;
    result.description = 'Reson: Not enough content.';
  }
  bodyResult.value = result;
  return result.icon;
}

async function checkLorem() {
  const result = { ...loremResult.value };
  const { innerHTML } = document.documentElement;
  if (innerHTML.includes('Lorem ipsum')) {
    result.icon = fail;
    result.description = 'Reason: Lorem ipsum is used on the page.';
  } else {
    result.icon = pass;
    result.description = 'No Lorem ipsum is used on the page.';
  }
  loremResult.value = result;
  return result.icon;
}
// API link generator
function getAdminUrl(url, action) {
  const testBranch = 'preflight-gen-tab--accenture-newsroom--hlxsites';
  const project = window.location.hostname === 'localhost' ? testBranch : window.location.hostname.split('.')[0];
  const [branch, repo, owner] = project.split('--');
  const base = `https://admin.hlx.page/${action}/${owner}/${repo}/${branch}${url}`;
  return action === 'status' ? `${base}?editUrl=auto` : base;
}

// Publishing Asset
async function handleLiveAction(linkPath) {
  fetch(getAdminUrl(linkPath, 'live'), { method: 'GET' })
    .then((response) => response.json())
    .then((response) => {
      console.log('status-live', response.live.status);
      if (response.live.status === 404) {
        window.alert('Pdf is been publish');
      }
    });
}
// Previewing Asset
async function handlePreviewAction(linkPath) {
  fetch(getAdminUrl(linkPath, 'preview'), { method: 'GET' })
    .then((response) => response.json())
    .then((response) => {
      console.log('status-preview', response.preview.status);
      if (response.preview.status === 404) {
        console.log('test---');
        handleLiveAction(linkPath);
      }
    });
}
// Asset Condition
function pdfCondition(linkPath, response) {
  switch (response.preview.status) {
    case 404: // Asset not been preview
      handlePreviewAction(linkPath);
      break;
    case 200: // Asset is been preview
      handleLiveAction(linkPath);
      break;
    default:
      break;
  }
}

// Getting Asset Status
function getStatus() {
  const link = document.querySelectorAll('a[href$=".pdf"]');
  link.forEach((pdflink) => {
    const linkPath = pdflink.getAttribute('href');
    fetch(getAdminUrl(linkPath, 'status'))
      .then((response) => response.json())
      .then((response) => {
        console.log(`preview: ${response.preview.status}:${linkPath}`);
        console.log(`live: ${response.live.status}:${linkPath}`);
        pdfCondition(linkPath, response);
      });
  });
}

async function checkLinks() {
  const result = { ...linksResult.value };
  const links = document.querySelectorAll('a[href^="/"]');

  let badLink;
  const resStatus = await getStatus();
  console.log(resStatus);
  links.forEach(async (link) => {
    const resp = await fetch(link.href, { method: 'HEAD' });
    if (!resp.ok) badLink = true;
  });

  if (badLink) {
    result.icon = fail;
    result.description = 'Reason: There are one or more broken links.';
  } else {
    result.icon = pass;
    result.description = 'Links are valid.';
  }
  linksResult.value = result;
  return result.icon;
}

function SeoItem({ icon, title, description }) {
  return html`
    <div class=seo-item>
      <div class="result-icon ${icon}"></div>
      <div class=seo-item-text>
        <p class=seo-item-title>${title}</p>
        <p class=seo-item-description>${description}</p>
      </div>
    </div>`;
}

async function getResults() {
  checkH1s();
  checkTitle();
  // await checkCanon();
  checkDescription();
  checkBody();
  checkLorem();
  await checkLinks();
  await checkPublishedDate();
}

export default function Panel() {
  useEffect(() => { getResults(); }, []);

  return html`
      <div class=seo-columns>
      <div class=seo-column>
        <${SeoItem} icon=${h1Result.value.icon} title=${h1Result.value.title} description=${h1Result.value.description} />
        <${SeoItem} icon=${titleResult.value.icon} title=${titleResult.value.title} description=${titleResult.value.description} />
        <${SeoItem} icon=${pubDateResult.value.icon} title=${pubDateResult.value.title} description=${pubDateResult.value.description} />        
        <${SeoItem} icon=${descResult.value.icon} title=${descResult.value.title} description=${descResult.value.description} />
        <${SeoItem} icon=${linksResult.value.icon} title=${linksResult.value.title} description=${linksResult.value.description} />
      </div>
      <div class=seo-column>
        <${SeoItem} icon=${bodyResult.value.icon} title=${bodyResult.value.title} description=${bodyResult.value.description} />
        <${SeoItem} icon=${loremResult.value.icon} title=${loremResult.value.title} description=${loremResult.value.description} />
        <${SeoItem} icon=${canonResult.value.icon} title=${canonResult.value.title} description=${canonResult.value.description} />
      </div>
    </div>`;
}
