// eslint-disable-next-line import/no-cycle
import { sampleRUM, loadScript, getMetadata } from './lib-franklin.js';
// eslint-disable-next-line import/no-cycle
import { getCountry, getLanguage } from './scripts.js';
import { ANALYTICS_LINK_TYPE_CTA, ANALYTICS_TEMPLATE_ZONE_CONSENT_MANAGER } from './constants.js';

const ONETRUST_SDK = 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js';

function getCookie(name) {
  const value = `; ${window.document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}

export const isProd = () => {
  const { host } = window.location;
  if (host.startsWith('newsroom.accenture')) {
    return true;
  }
  return false;
};

function addOneTrustCookieButton(text) {
  const OPTANON_BUTTON_ID = 'optanon-minimize-button';
  if (!document.getElementById(OPTANON_BUTTON_ID)) {
    const optanonWrapper = document.createElement('div');
    optanonWrapper.id = 'optanon-minimize-wrapper';
    optanonWrapper.setAttribute('data-analytics-template-zone', 'consent manager');
    optanonWrapper.setAttribute('data-analytics-module-name', 'consent manager');
    optanonWrapper.classList.add('optanon-toggle-display');

    const optanonButton = document.createElement('button');
    optanonButton.id = OPTANON_BUTTON_ID;
    optanonButton.title = text;
    optanonButton.setAttribute('data-analytics-link-name', text.toLowerCase());
    optanonButton.setAttribute('data-analytics-content-type', 'cta');
    optanonButton.setAttribute('aria-label', text);
    optanonButton.textContent = text;

    optanonWrapper.appendChild(optanonButton);
    document.body.appendChild(optanonWrapper);
  }
}

function addOneTrustDataAttrs() {
  const oneTrustSDK = document.querySelector('div#onetrust-consent-sdk');
  if (oneTrustSDK) {
    const buttons = oneTrustSDK.querySelectorAll('button');
    const tabs = oneTrustSDK.querySelectorAll('ul.ot-cat-grp li');
    buttons.forEach((button) => {
      button.setAttribute('data-analytics-link-name', button.textContent || '');
      button.setAttribute('data-analytics-link-type', ANALYTICS_LINK_TYPE_CTA);
      button.setAttribute('data-analytics-module-name', ANALYTICS_TEMPLATE_ZONE_CONSENT_MANAGER);
      button.setAttribute('data-analytics-template-zone', ANALYTICS_TEMPLATE_ZONE_CONSENT_MANAGER);
    });
    tabs.forEach((tab) => {
      const linkName = tab.querySelector('h3')?.textContent || '';
      tab.setAttribute('data-analytics-link-name', linkName);
      tab.setAttribute('data-analytics-link-type', ANALYTICS_LINK_TYPE_CTA);
      tab.setAttribute('data-analytics-module-name', ANALYTICS_TEMPLATE_ZONE_CONSENT_MANAGER);
      tab.setAttribute('data-analytics-template-zone', ANALYTICS_TEMPLATE_ZONE_CONSENT_MANAGER);
    });
  }
}

function attachOneTrustCookieListeners() {
  const minimizeBanner = getCookie('OptanonAlertBoxClosed');
  let localStorageName = ONETRUST_SDK;
  const substringStart = localStorageName.lastIndexOf('/') + 1;
  const substringEnd = localStorageName.lastIndexOf('.');
  localStorageName = localStorageName.substr(substringStart, substringEnd);
  localStorageName = localStorageName.replace(/-/g, '');
  const minimizeButtonKey = localStorageName;
  // if not closed yet delegate event to the buttons
  if (!minimizeBanner) {
    document.addEventListener('click', (event) => {
      if (event.target.matches('button[class*="save-preference"], button[id*="accept"]')) {
        const minimizeButtonText = document.querySelector('button#onetrust-pc-btn-handler').textContent;
        localStorage.setItem(minimizeButtonKey, minimizeButtonText);
        document.cookie = `OptanonAlertBoxClosed=${new Date().toISOString()};path=/`;
        addOneTrustCookieButton(minimizeButtonText);
      }
    });
    document.addEventListener('click', (event) => {
      if (event.target.matches('.optanon-toggle-display')) {
        window.Optanon.ToggleInfoDisplay();
      }
    });
  } else {
    // show the minimized button if the banner is closed already
    addOneTrustCookieButton('Cookies Settings');
  }
}

async function addCookieOneTrust() {
  let otId;
  if (isProd()) {
    otId = 'b6b6947b-e233-46b5-9b4e-ccc2cd860869';
  } else {
    otId = 'b6b6947b-e233-46b5-9b4e-ccc2cd860869-test';
  }

  await loadScript(ONETRUST_SDK, {
    type: 'text/javascript',
    charset: 'UTF-8',
    'data-domain-script': `${otId}`,
  });
  attachOneTrustCookieListeners();
  window.OptanonWrapper = () => {
    addOneTrustDataAttrs();
  };
}

const loadAdobeDTM = async () => {
  if (isProd()) {
    await loadScript('https://assets.adobedtm.com/55621ea95d50/e22056dd1d90/launch-EN664f8f34ad5946f8a0f7914005f717cf.min.js');
  } else {
    await loadScript('https://assets.adobedtm.com/55621ea95d50/e22056dd1d90/launch-EN379c80f941604b408953a2df1776d1c6-staging.min.js');
  }
};

export async function addMartechStack() {
  // load jquery
  await loadScript('/scripts/jquery-3.5.1.min.js', { async: 'false' });
  // Add Demandbase tag
  loadScript('//api.demandbase.com/api/v2/ip.json?key=4RB1W8tybpJRLdkTK0TRQcWfhYutivBKD5dyciDa', { async: 'true' });

  if (typeof jQuery === 'undefined') {
    document.addEventListener('jQueryReady', async () => {
      // Add adobe analytics
      await loadAdobeDTM();
    });
    return;
  }

  await loadAdobeDTM();
}

function getPageInstanceId(template, path, countryLanguage = '') {
  const pageIdPrefix = `nws:${countryLanguage || 'newsroom'}:page:`;
  let pageId = '';
  if (template === 'Article') {
    const pageName = path.split('/').pop();
    pageId = `${pageIdPrefix}news-${pageName}`;
  } else if (template === 'Category') {
    const pageName = path.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]/gi, '-');
    pageId = `${pageIdPrefix}${pageName}`;
  } else if (path === '/') {
    pageId = `${pageIdPrefix}index`;
  } else {
    pageId = `${pageIdPrefix}${path.split('/').pop()}`;
  }
  return pageId;
}

function getPageName(path, template) {
  if (path === '/') {
    return 'accenture-newsroom-dashboard';
  }
  if (template === 'Search') {
    return 'advanced-search';
  }
  if (template === 'error') {
    return 'page-not-found';
  }
  return path.split('/').pop();
}

function getUniquePageName(template, path) {
  if (path === '/') {
    return 'index';
  }
  if (template === 'Category') {
    return path.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]/gi, '-');
  }
  return path.split('/').pop();
}

function getResponsiveLayout() {
  const vpWidth = window.innerWidth;
  let layout = '';
  if (vpWidth >= 480 && vpWidth <= 767) {
    layout = 'xs';
  } else if (vpWidth >= 768 && vpWidth <= 999) {
    layout = 'sm';
  } else if (vpWidth >= 1000 && vpWidth <= 1199) {
    layout = 'lg/md';
  } else if (vpWidth >= 1200) {
    layout = 'lg/md';
  }
  return layout;
}

function addDataLayer() {
  const template = getMetadata('template');
  const path = window.location.pathname;
  const pageInstanceId = getPageInstanceId(template, path);
  const pageName = `nws::${getPageName(path, template)}`;
  const uniquePageName = getUniquePageName(template, path);
  const country = getCountry();
  const language = getLanguage(country);
  const countryLanguage = `${country}-${language}`;
  const pageId = getPageInstanceId(template, path, countryLanguage);
  const responsiveLayout = getResponsiveLayout();
  window.dataModel = {
    pending_data: '',
    user: {
      guid: '',
      profileIndustry: '',
      profileSkill: '',
      socialIndustry: '',
      socialSkill: '',
      loginStatus: 'anon',
      candidateID: '',
      candidateType: '',
      accentureEmployeeType: '',
      visitorGroup: 'none',
    },
    page: {
      pageInfo: {
        pageInstanceId,
        version: '',
        contentAuthor: '',
        siteId: 'nws',
        siteBranch: 'newsroom',
        country,
        pageName,
        pageType: '',
        responsiveLayout,
        errorMessage: '',
        language,
        clientType: '',
      },
      category: {
        content1: '',
        content2: '',
        content3: '',
        content4: '',
        content5: '',
        theme1: '',
        theme2: '',
        capability2: '',
        capability3: '',
        industry2: '',
        industry3: '',
        intiative: '',
        skill1: '',
        skill2: '',
        contentType: '',
      },
      meta: {
        'service-meta': '',
        'industry-meta': '',
        'contentType-meta': '',
        'contentFormat-meta': '',
        'pageCategory-meta': '',
        'externalMarketingCampaigns-meta': '',
        'appliedNowTheme-meta': '',
      },
    },
    job: {
      jobID: '',
      jobTitle: '',
      jobRegion: '',
      jobLocation: '',
      areaOfBusiness: '',
    },
    forms: {
      formErrors: '',
    },
    'internal search': {
      serpType: '',
    },
  };

  window.digitalData = {
    pageInstanceId,
    version: '1.0',
    page: {
      category: {
        primaryCategory: 'nws',
      },
      pageInfo: {
        pageId,
        pageName,
        destinationUrl: '',
        referringUrl: '',
        author: '',
        issueDate: null,
        effectiveDate: null,
        expiryDate: null,
        language,
        geoRegion: '',
        countryLanguage,
        subfolder: 'page',
        uniquePageName,
        template: '',
        reportingSuiteIDs: 'accnextacnprod,accnextglobprod',
      },
      attributes: {
        metadata: [
          {
            category: {
              primaryCategory: '',
            },
            metadataInfo: {
              metadataID: '',
              metadataName: '',
            },
          },
          {
            category: {
              primaryCategory: '',
            },
            metadataInfo: {
              metadataID: '',
              metadataName: '',
            },
          },
        ],
      },
    },
    product: null,
    events: null,
    component: [
      {
        componentInfo: {
          componentID: '',
          componentName: '',
        },
      },
      {
        componentInfo: {
          componentID: '',
          componentName: '',
        },
      },
    ],
    user: null,
    privacy: {
      accessCategories: [],
    },
  };
}

const loadAnalyticsFunctions = async () => {
  await addCookieOneTrust();
  await loadScript('/scripts/one-trust-geo-script.js', { type: 'module' });
};

// add more delayed functionality here
addDataLayer();
loadAnalyticsFunctions();

// Core Web Vitals RUM collection
sampleRUM('cwv');
