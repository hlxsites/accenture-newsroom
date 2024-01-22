/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { decorateBlocks, decorateSections, loadBlocks } from '../../scripts/lib-franklin.js';
import {
  acknowledge,
  confirm,
  notify,
  wait,
} from './ui.js';
import { preview } from './admin.js';

// The Sharepoint configuration
const SHAREPOINT_CONFIG = {
  authority: 'https://login.microsoftonline.com/fa7b1b5a-7b34-4387-94ae-d2c178decee1',
  clientId: 'a5047ece-6169-4aa9-91ed-7f3324c632d0',
  domain: 'adobe.sharepoint.com',
  domainId: 'fac8f079-f817-4127-be6b-700b19217904',
  siteId: 'b1df5119-9614-4126-8064-ab9bd8cef865',
  rootPath: '/sites/accenture/newsroom/en',
};

// The path to the crontab file in the content
const CRONTAB_PATH = '/.helix/crontab.xlsx';

// Later.js full month names for proper parsing
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'Oktober', 'November', 'December'];

// Minimum delay for a publish later job (10 mins)
const DELAY = 10 * 60 * 1000;

// The SDK singleton instance
// eslint-disable-next-line no-underscore-dangle
let _sdk;

/**
 * Gets the list of cron jobs from the crontab file.
 * @param {Onject} sdk An instance of the sharepoint SDK
 * @param {string} tableName The name of the table to query
 * @returns an array of arrays containing the table values
 */
async function getCronJobs(sdk, tableName) {
  const crontab = await sdk.getTableCells('/.helix/crontab.xlsx', tableName);
  return crontab.values;
}

/**
 * Formats the given data into a cronjob entry.
 * @param {Object} data The data to format
 * @param {Date} data.datetime The date and time to run this job on
 * @param {String} data.url The URL of the page to publish
 * @returns an array of arrays containing job data in the crontab format
 */
function formatCronJobData({ datetime, url }) {
  const pad = (n) => n.toString().padStart(2, '0');
  return [[
    `at ${pad(datetime.getUTCHours())}:${pad(datetime.getUTCMinutes())} on the ${datetime.getUTCDate()} day of ${MONTHS[datetime.getUTCMonth()]} in ${datetime.getUTCFullYear()}`,
    `publish ${new URL(url).pathname}`,
  ]];
}

/**
 * Parses a cronjob entry into a usable object.
 * @param {Array} data The cronjob entry to parse
 * @returns an object containing the parsed data and having `datetime` and `url` properties
 */
function parseCronJobData([datetime, action]) {
  const [, hh, mm, dd, mmm, yyyy] = datetime.match(/at (\d+):(\d+) on the (\d+) day of (\w+) in (\d+)/);
  const localDate = new Date(
    Date.UTC(yyyy, MONTHS.indexOf(mmm), dd, hh, mm) - new Date().getTimezoneOffset() * 60000,
  );
  return {
    datetime: localDate,
    url: `${window.location.origin}${action.split(' ').pop()}`,
  };
}

/**
 * Adds a new publish entry to the crontab file.
 * @param {Onject} sdk An instance of the sharepoint SDK
 * @param {string} tableName The name of the table to query
 * @param {Object} data The data to format
 * @param {Date} data.datetime The date and time to run this job on
 * @param {String} data.url The URL of the page to publish
 */
async function addPublishJob(sdk, tableName, data) {
  const rows = formatCronJobData(data);
  await sdk.appendRowsToTable(CRONTAB_PATH, tableName, rows);
}

/**
 * Updates an existing entry in the crontab file.
 * @param {Onject} sdk An instance of the sharepoint SDK
 * @param {string} tableName The name of the table to query
 * @param {Object} data The data to format
 * @param {Date} data.datetime The date and time to run this job on
 * @param {String} data.url The URL of the page to publish
 * @param {Number} index The index in the table to be updated
 */
async function updatePublishJob(sdk, tableName, data, index) {
  const rows = formatCronJobData(data);
  await sdk.updateRowInTable(CRONTAB_PATH, tableName, index, rows);
}

/**
 * Gets an authenticate SDK instance.
 * @returns an authenticated SDk instance
 */
async function getSdk() {
  if (_sdk) {
    return _sdk;
  }

  const spConfig = {
    domain: SHAREPOINT_CONFIG.domain,
    domainId: SHAREPOINT_CONFIG.domainId,
    siteId: SHAREPOINT_CONFIG.siteId,
    rootPath: SHAREPOINT_CONFIG.rootPath,
  };

  const { default: SharepointSDK } = await import(`${window.location.origin}/tools/sidekick/sharepoint/index.js`);
  _sdk = new SharepointSDK(spConfig);

  await _sdk.signIn(SHAREPOINT_CONFIG.clientId, SHAREPOINT_CONFIG.authority);
  return _sdk;
}

/**
 * Loads and formats the publish later modal.
 * @param {Object} [existingEntry] The existing publish later entry, if any
 * @returns The formatted modal dialog
 */
async function getPublishLaterModal(existingEntry) {
  const response = await fetch('/tools/sidekick/publish-later.plain.html');
  const html = await response.text();

  const fragment = document.createElement('div');
  fragment.innerHTML = html;
  const link = fragment.querySelector('a[href*=".json"]');
  if (link && existingEntry) {
    link.href = `${link.href}?sheet=edit`;
    link.textContent = link.href;
  }
  const header = fragment.querySelector('h1,h2,h3');
  header.remove();

  decorateSections(fragment);
  decorateBlocks(fragment);
  await loadBlocks(fragment);

  const footer = [...fragment.querySelectorAll('button')].map((btn) => {
    btn.parentElement.remove();
    btn.classList.add(btn.type === 'submit' ? 'cta' : 'secondary');
    return btn.outerHTML;
  }).join('') || null;

  let date;
  if (existingEntry) {
    try {
      date = parseCronJobData(existingEntry).datetime;
    } catch (err) {
      console.error('Failed to parse existing schedule', err);
    }
  }

  const tzOffset = new Date().getTimezoneOffset();
  const minDate = new Date(Date.now() - tzOffset * 60000 + DELAY);
  const input = fragment.querySelector('input[type="datetime-local"]');
  if (input) {
    input.setAttribute('min', minDate.toISOString().slice(0, -8));
    if (date) {
      input.setAttribute('value', date.toISOString().slice(0, -8));
    }
    if (date < minDate) {
      input.setAttribute('disabled', true);
    }
  }

  const tzLabel = document.createElement('small');
  tzLabel.textContent = `Times are in ${Intl.DateTimeFormat().resolvedOptions().timeZone} timezone (GMT${tzOffset < 0 ? `+${-tzOffset / 60}` : `-${tzOffset / 60}`}).`;
  input.after(tzLabel);

  const content = fragment.querySelector('form').innerHTML;

  const { default: createDialog } = await import('./modal/modal.js');
  const dialog = await createDialog('dialog-modal', header, content, footer);
  dialog.classList.add('publishlater');
  return dialog;
}

/**
 * Handles the publish later workflow and UI.
 * @param {Object} skConfig The Sidekick configuration
 */
export async function publishLater(skConfig) {
  let modal = await wait('Please wait…');

  let sdk;
  try {
    sdk = await getSdk();
    console.log('Connected to sharepoint');
  } catch (err) {
    modal.close();
    modal.remove();
    console.error('Could not log into Sharepoint', err);
    await acknowledge('Error', 'Could not log into Sharepoint.', 'error');
    return;
  }

  const { url } = skConfig.status.preview;

  let cronjobs;
  let existing;
  try {
    cronjobs = await getCronJobs(sdk, 'jobs');
    existing = cronjobs.find((job) => String(job[1]).endsWith(new URL(url).pathname));
  } catch (err) {
    modal.close();
    modal.remove();
    await acknowledge('Error', 'Could not retrieve cron jobs.', 'error');
    return;
  }

  modal.close();
  modal.remove();

  let index;
  if (existing) {
    index = cronjobs.indexOf(existing);
  }

  modal = await getPublishLaterModal(existing);
  modal.addEventListener('close', async (ev) => {
    modal.remove();

    if (modal.returnValue === 'submit') {
      modal = await wait('Publishing schedule…');
      const formData = new FormData(ev.target.querySelector('form'));
      const datetime = new Date(formData.get('datetime'));

      try {
        if (existing) {
          await updatePublishJob(sdk, 'jobs', { datetime, url }, index - 1);
        } else {
          await addPublishJob(sdk, 'jobs', { datetime, url });
        }

        await preview(skConfig, CRONTAB_PATH.replace('.xlsx', '.json'));
        modal.close();
        modal.remove();
        await notify('Publishing scheduled successfully.', 'success', 3000);
      } catch (err) {
        modal.close();
        modal.remove();
        if (existing) {
          await acknowledge('Publish Later', 'Failed to update existing publishing schedule.', 'error');
          console.error('Failed to update publishing job', err);
        } else {
          await acknowledge('Publish Later', 'Failed to create publishing schedule.', 'error');
          console.error('Failed to prepare publishing job', err);
        }
      }
      return;
    }

    if (modal.returnValue === 'delete') {
      const confirmed = await confirm(
        'Delete schedule',
        'Are you sure you want to delete this publishing schedule?',
        'error',
      );
      if (confirmed !== 'true') {
        return;
      }
      try {
        modal = await wait('Deleting schedule…');
        await sdk.deleteRowInTable(CRONTAB_PATH, 'jobs', index - 1);
        await preview(skConfig, CRONTAB_PATH.replace('.xlsx', '.json'));
        modal.close();
        modal.remove();
        await notify('Publishing job deleted successfully.', 'success', 3000);
      } catch (err) {
        modal.close();
        modal.remove();
        console.error('Failed to delete publishing job', err);
        await acknowledge('Publish Later', 'Failed to delete existing publishing schedule.', 'error');
      }
    }
  });

  modal.showModal();
}

/**
 * Enhances the page info dropdown with additional information about the publishing schedule.
 */
export async function enhancePageInfo() {
  // const res = await fetch('https://admin.hlx.page/job/ramboz/accenture-newsroom/publish-later-ui/preview');
  // const json = await res.json();
  // console.log(json);
  const sk = document.querySelector('helix-sidekick');
  const info = sk.shadowRoot.querySelector('.plugin.page-info');
  let container = info.querySelector('.crontab-date-container');
  let date = container?.querySelector('time');
  if (!container) {
    container = document.createElement('div');
    container.classList.add('crontab-date-container');

    const label = document.createElement('span');
    label.textContent = 'Scheduled: ';
    container.append(label);

    date = document.createElement('time');
    date.textContent = '…';
    container.append(date);

    info.append(container);
  }

  let sdk;
  try {
    sdk = await getSdk();
  } catch (err) {
    console.error('Could not log into Sharepoint', err);
    return;
  }

  let cronjobs;
  let existing;
  try {
    const url = window.location.href;
    cronjobs = await getCronJobs(sdk, 'jobs');
    existing = cronjobs.find((job) => String(job[1]).endsWith(new URL(url).pathname));
  } catch (err) {
    await acknowledge('Error', 'Could not retrieve cron jobs.', 'error');
    return;
  }

  if (!existing) {
    date.textContent = 'Never';
    return;
  }

  const { datetime } = parseCronJobData(existing);
  date.setAttribute('datetime', datetime.toISOString());
  date.textContent = new Intl.DateTimeFormat('default', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(datetime);
}
