// eslint-disable-next-line import/no-cycle
import { sampleRUM, loadScript } from './lib-franklin.js';

const ONETRUST_SDK = 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js';

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
  loadScript('https://assets.adobedtm.com/launch-EN664f8f34ad5946f8a0f7914005f717cf.min.js?v=20190409', { async: '' });
}

addMartechStack();

// add more delayed functionality here
addCookieOneTrust();
// Core Web Vitals RUM collection
sampleRUM('cwv');
