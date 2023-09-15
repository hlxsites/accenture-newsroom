// eslint-disable-next-line import/no-cycle
import { sampleRUM, loadScript, getMetadata } from './lib-franklin.js';
// eslint-disable-next-line import/no-cycle
import { getLocale, getCountryLanguage } from './scripts.js';

const ONETRUST_SDK = 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js';
// eslint-disable-next-line no-unused-vars
const ADOBE_LAUNCH_STAGING_SCRIPT = 'https://assets.adobedtm.com/55621ea95d50/e22056dd1d90/launch-EN379c80f941604b408953a2df1776d1c6-staging.min.js';
// eslint-disable-next-line no-unused-vars
const ADOBE_LAUNCH_PRODUCTION_SCRIPT = 'https://assets.adobedtm.com/55621ea95d50/d9fb86f013c5/launch-82a409031058.min.js';

function getCookie(name) {
  const value = `; ${window.document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}

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

function addCookieOneTrust() {
  const cookieScript = document.createElement('script');
  cookieScript.src = ONETRUST_SDK;
  cookieScript.type = 'text/javascript';
  cookieScript.charset = 'UTF-8';
  cookieScript.setAttribute('data-domain-script', 'b6b6947b-e233-46b5-9b4e-ccc2cd860869');
  document.head.appendChild(cookieScript);
  attachOneTrustCookieListeners();
}

function addMartechStack() {
  // load jquery
  loadScript('/scripts/jquery-3.5.1.min.js', { async: '' });
  // Add Adobe Analytics
  loadScript(ADOBE_LAUNCH_STAGING_SCRIPT, { async: '' });
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

function getPageName(path) {
  if (path === '/') {
    return 'accenture-newsroom-dashboard';
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

function addDataLayer() {
  const template = getMetadata('template');
  const path = window.location.pathname;
  const pageInstanceId = getPageInstanceId(template, path);
  const pageName = getPageName(path);
  const uniquePageName = getUniquePageName(template, path);
  const countryLanguage = getCountryLanguage(getLocale(path));
  const pageId = getPageInstanceId(template, path, countryLanguage);
  const language = countryLanguage.split('-').length === 2 ? countryLanguage.split('-')[1] : 'en';
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

addDataLayer();
addMartechStack();

// add more delayed functionality here
addCookieOneTrust();
// Core Web Vitals RUM collection
sampleRUM('cwv');
