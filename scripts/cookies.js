const TWENTY_FOUR = 24;
const SIXTY = 60;
const THOUSAND = 1000;

export const setCookie = (sName, sValue, iDays) => {
  let sExpires = '';
  if (iDays) {
    const oDate = new Date();
    oDate.setTime(oDate.getTime() + (iDays * TWENTY_FOUR * SIXTY * SIXTY * THOUSAND));
    sExpires = `; expires=${oDate.toUTCString()}`;
  }
  document.cookie = `${sName}=${sValue || ''}${sExpires}; path=/; Secure;`;
};

export const getCookie = (sName) => {
  const sCookieName = `${sName}=`;
  const sDecodedCookie = document.cookie;
  const aCookieArr = sDecodedCookie.split('; ');
  let sRes = '';
  aCookieArr.forEach((val) => {
    if (val.indexOf(sCookieName) === 0) {
      sRes = val.substring(sCookieName.length);
    }
  });
  return sRes;
};
