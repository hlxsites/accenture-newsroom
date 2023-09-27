const createOptanonWrapper = () => {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.textContent = 'function OptanonWrapper() { }';
  document.head.append(script);
};

const loadGeoScript = () => {
  createOptanonWrapper();
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

    function jsonFeed(locationJson) {
      window.otUserLocation = locationJson.country;
    }

    fetch(geolink2, {
      headers: {
        Accept: 'application/json',
      },
    })
      .then((response) => response.json())
      .then((geo) =>
        jsonFeed(geo)
      );
  }
};

loadGeoScript();
