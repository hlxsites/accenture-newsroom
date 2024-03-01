/* eslint-disable prefer-destructuring */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

function getLocale() {
  return (navigator.languages && navigator.languages.length)
    ? navigator.languages[0] : navigator.language;
}

function showAlert() {
  const alertBox = document.getElementById('custom-alert');
  alertBox.style.display = 'block';
  setTimeout(() => {
    alertBox.style.display = 'none';
  }, 4000); // Dismiss after 4 seconds
}

function writeToClipboard(blob) {
  const data = [new ClipboardItem({ [blob.type]: blob })];
  navigator.clipboard.write(data);
}

function getSiteFromHostName(hostname = window.location.hostname) {
  const allowedSites = ['uk', 'de', 'fr', 'it', 'es', 'sg', 'pt', 'jp', 'br'];
  if (hostname === 'localhost') {
    return 'us';
  }
  // handle franklin hostnames
  const franklinHostName = 'accenture-newsroom';
  if (hostname.includes(franklinHostName)) {
    for (let i = 0; i < allowedSites.length; i += 1) {
      if (hostname.includes(`${franklinHostName}-${allowedSites[i]}`)) {
        return allowedSites[i];
      }
    }
    return 'us';
  }
  // handle main hostnames
  const mainHostName = 'newsroom.accenture';
  if (hostname.includes(mainHostName)) {
    const remainingHostName = hostname.replace(`${mainHostName}`, '');
    for (let i = 0; i < allowedSites.length; i += 1) {
      if (remainingHostName.includes(`${allowedSites[i]}`)) {
        return allowedSites[i];
      }
    }
  }
  return 'us';
}

function getCountry() {
  const siteToCountryMapping = {
    us: 'us',
    uk: 'gb',
    de: 'de',
    fr: 'fr',
    it: 'it',
    es: 'sp',
    sg: 'sg',
    pt: 'pt',
    jp: 'jp',
    br: 'br',
  };
  const site = getSiteFromHostName();
  return siteToCountryMapping[site];
}

// Tranlationg date to locally
function getHumanReadableDate(dateString) {
  if (!dateString) return dateString;
  const date = new Date(parseInt(dateString, 10));
  const specialCountries = ['pt', 'br', 'sp'];
  // display the date in GMT timezone
  const country = getCountry();
  const localedate = date.toLocaleDateString(getDateLocales(country), {
    timeZone: 'GMT',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });
  if (specialCountries.includes(country)) {
    // de means 'of' in pt/br/sp, replacing with empty string
    return localedate.replace(/de /g, '');
  }
  return localedate;
}

async function populateTags() {
  // Replace with your JSON endpoint
  const tags = '/tags.json';
  const url = new URL(tags, window.location.origin);
  const resp = await fetch(url.toString());
  const response = await resp.json();
  if (response) {
    const { data } = response;
    const subjects = data.map((item) => [item['Subjects Text'], item['Subjects Value']]);
    const industries = data.map((item) => [item['Industries Text'], item['Industries Value']]);
    const selectSubjects = document.getElementById('dropdown-subjects');
    subjects.forEach((item) => {
      if (item) {
        const checkbox = document.createElement('input') ;
        checkbox.classList.add('checkbox')
        checkbox.type = "checkbox"
        checkbox.value = item[1];
        
        const span = document.createElement('span') ;
        span.classList.add('tag-Label')
        span.appendChild(checkbox);
        span.appendChild(document.createTextNode(item[0]));

        if (item[0] !== '') {
          selectSubjects.appendChild(span);
        }
      }
    });
    const selectIndustries = document.getElementById('dropdown-industries');
    industries.forEach((item) => {
      if (item) {
        const checkbox = document.createElement('input') ;
        checkbox.classList.add('checkbox')
        checkbox.type = "checkbox"
        checkbox.value = item[1];
        
        const span = document.createElement('span') ;
        span.classList.add('tag-Label')
        span.appendChild(checkbox);
        span.appendChild(document.createTextNode(item[0]));

        if (item[0] !== '') {
          selectIndustries.appendChild(span);
        }
      }
    });
  }
}

function processForm() {
  const publishDate = document.getElementById('publishDate').value || getHumanReadableDate(new Date().toString());
  const publishDateMetadata = publishDate.replace('T', ' ');
  const publishDateObj = new Date(publishDate);
  const formattedDateLong = new Intl.DateTimeFormat(getLocale(), {
    dateStyle: 'long',
  }).format(publishDateObj);
  const title = document.getElementById('title').value;
  const subTitle = document.getElementById('subtitle').value;
  const rawAbstract = document.querySelector('form div#abstract .ql-editor').innerHTML;
  const abstract = rawAbstract.replace(/<p>&nbsp;<\/p>/g, '');
  const rawBody = document.querySelector('form div#body .ql-editor').innerHTML;
  const body = rawBody.replace(/<p>&nbsp;<\/p>/g, '');
  const subjectsDropdown = document.getElementById('dropdown-subjects');
  const checkedSubject= subjectsDropdown.querySelectorAll('.checkbox');
  const selectedsubject = [];
  checkedSubject.forEach((checkSubject) => {
    if (checkSubject.checked) {
      selectedsubject.push(checkSubject.value);
    }
  });
  // console.log("Checked checkboxes:", checkedCheckboxes);
  // const selectedSubjects = Array
  //   .from(subjectsDropdown.selectSubjects)
    // .map((label) => option.value);
  const subjects = selectedsubject.join(', ');
  const industriesDropdown = document.getElementById('dropdown-industries');
  const checkindustries= industriesDropdown.querySelectorAll('.checkbox');
  const selectedIndustries = [];
  checkindustries.forEach((checkindustries) => {
    if (checkindustries.checked) {
      selectedIndustries.push(checkindustries.value);
    }
  });
  // console.log("Checked checkboxes:", checkedCheckboxes);
  // const selectedIndustries = Array
  //   .from(industriesDropdown.selectedOptions)
  //   .map((option) => option.value);
  const industries = selectedIndustries.join(', ');
  // create the html to paste into the word doc
  const htmlToPaste = `
    ${formattedDateLong || ''}
    <h1>${title || ''}</h1>
    <h6>${subTitle || ''}</h6>
    <br>
    ${abstract || ''}
    ---
    ${body || ''}
  
    <table border="1">
      <tr bgcolor="#f7caac">
        <td colspan="2">Metadata</td>
      </tr>
      <tr>
        <td>Template</td>
        <td>Article</td>
      </tr>
      <tr>
        <td width="20%">Published Date</td>
        <td>${publishDateMetadata || ''}</td>
      </tr>
      <tr>
        <td width="20%">Title</td>
        <td>${title || ''}</td>
      </tr>
      <tr>
        <td width="20%">Description</td>
        <td>${abstract || ''}</td>
      </tr>
      <tr>
        <td width="20%">Abstract</td>
        <td>${abstract || ''}</td>
      </tr>
      <tr>
        <td width="20%">Subjects</td>
        <td>${subjects || ''}</td>
      </tr>
      <tr>
        <td width="20%">Industries</td>
        <td>${industries || ''}</td>
      </tr>
      <tr>
        <td width="20%">Keywords</td>
        <td></td>
      </tr>
    </table>
  `;
  writeToClipboard(new Blob([htmlToPaste], { type: 'text/html' }));
  showAlert();
}

async function init() {
  await populateTags();
  const rteOptions = {
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline'],
        ['link'],
        ['clean'],
      ],
    },
    theme: 'snow',
  };
  const abstractContainer = document.querySelector('form div#abstract');
  const abstractEditor = await new Quill(abstractContainer, rteOptions);
  const bodyContainer = document.querySelector('form div#body');
  const bodyEditor = await new Quill(bodyContainer, rteOptions);
  const copyButton = document.getElementById('copy-to-clipboard');
  copyButton.addEventListener('click', () => {
    processForm();
  });
}

await init();
