import { addMartechStack } from './delayed.js';

const createOptanonWrapper = () => {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.textContent = 'function OptanonWrapper() { }';
  document.head.append(script);
};

const createSatTrack = () => {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.innerHTML = `const getCookie = (sName) => {
    const sValue = "; " + document.cookie;
    const aParts = sValue.split("; " + sName + "=");
    if (aParts.length === 2) return aParts.pop().split(";").shift();
  };

  const satTrackHandler = () => {
    const sSatTrackCookie = getCookie('sat_track');

    if (typeof sSatTrackCookie !== 'undefined') {
      return;
    }

    // list of geos where only strictly necessary cookies are allowed
    const aSNGeos = ["GB", "BE", "IE", "FR", "RU", "ES", "IT", "DE", "AT", "CH"];
    if (aSNGeos.indexOf(window.otUserLocation) !== -1) {
      document.cookie = "sat_track=false;path=/;secure;max-age=31536000";
    }
    else {
      document.cookie = "sat_track=true;path=/;secure;max-age=31536000";
    }
    console.log("creating sat_track");
  };
  satTrackHandler();`;

  document.head.append(script);
};

const loadGeoScript = () => {
  createOptanonWrapper();
  createSatTrack();

  const jsonFeed = (locationJson) => {
    window.otUserLocation = locationJson.country;
    addMartechStack();
  };

  const origin = window.location.origin.toLowerCase();
  if (origin.indexOf('.cn') > 1 || origin.indexOf('.cdnsvc') > 1) {
    window.otUserLocation = 'CN';
  } else {
    const geolink = '//geolocation.onetrust.com/';
    const link1 = document.createElement('link');
    link1.setAttribute('rel', 'preconnect');
    link1.setAttribute('href', geolink);
    link1.setAttribute('crossorigin', '');
    document.head.appendChild(link1);

    const link2 = document.createElement('link');
    link2.setAttribute('rel', 'dns-prefetch');
    link2.setAttribute('href', geolink);
    document.head.appendChild(link2);

    const geolink2 = 'https://geolocation.onetrust.com/cookieconsentpub/v1/geo/location';
    const link4 = document.createElement('script');
    link4.setAttribute('href', geolink2);
    document.head.appendChild(link4);

    fetch(geolink2, {
      headers: {
        Accept: 'application/json',
      },
    })
      .then((response) => response.json())
      .then((geo) => jsonFeed(geo));
  }
};

loadGeoScript();
