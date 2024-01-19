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

const CRONTAB_PATH = '/.helix/crontab.xlsx';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'Oktober', 'November', 'December'];
const DELAY = 10 * 60 * 1000; // minimum delay for a publish later job (10 mins)

async function getCronJobs(sdk, tableName) {
  const crontab = await sdk.getTableCells('/.helix/crontab.xlsx', tableName);
  return crontab.values;
}

function formatCronJobData({ datetime, url }) {
  const pad = (n) => n.toString().padStart(2, '0');
  return [[
    `at ${pad(datetime.getUTCHours())}:${pad(datetime.getUTCMinutes())} on the ${datetime.getUTCDate()} day of ${MONTHS[datetime.getUTCMonth()]} in ${datetime.getUTCFullYear()}`,
    `publish ${new URL(url).pathname}`,
  ]];
}

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

async function addPublishJob(sdk, tableName, data) {
  const rows = formatCronJobData(data);
  await sdk.appendRowsToTable(CRONTAB_PATH, tableName, rows);
}

async function updatePublishJob(sdk, tableName, data, index) {
  const rows = formatCronJobData(data);
  await sdk.updateRowInTable(CRONTAB_PATH, tableName, index, rows);
}

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
    if (btn.type !== 'submit') {
      btn.classList.add('secondary');
    }
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

  const minDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000 + DELAY);
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

  const content = fragment.querySelector('form').innerHTML;

  const { default: createDialog } = await import('./modal/modal.js');
  const dialog = await createDialog('dialog-modal', header, content, footer);
  return dialog;
}

let sdk;

// eslint-disable-next-line import/prefer-default-export
export async function publishLater(skConfig, spConfig) {
  let modal = await wait('Please wait…');
  if (!sdk) {
    const { default: SharepointSDK } = await import(`${window.location.origin}/tools/sidekick/sharepoint/index.js`);
    sdk = new SharepointSDK(spConfig);

    try {
      await sdk.signIn();
      console.log('Connected to sharepoint');
    } catch (err) {
      sdk = null;
      modal.close();
      modal.remove();
      console.error('Could not log into Sharepoint', err);
      await acknowledge('Error', 'Could not log into Sharepoint.', 'error');
      return;
    }
  }

  const { url } = skConfig.status.preview;

  const cronjobs = await getCronJobs(sdk, 'jobs');
  const existing = cronjobs.find((job) => String(job[1]).endsWith(new URL(url).pathname));

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
