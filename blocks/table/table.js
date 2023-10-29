/*
 * Table Block
 * Recreate a table
 * https://www.hlx.live/developer/block-collection/table
 */

const VARIANT_INDUSTRY = 'industry';
const VARIANT_REVENUE = 'revenue';

function buildCell(rowIndex) {
  const cell = rowIndex ? document.createElement('td') : document.createElement('th');
  if (!rowIndex) cell.setAttribute('scope', 'col');
  return cell;
}

export default async function decorate(block) {
  let table = block.querySelector('table');
  if (!table) {
    table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    table.append(thead, tbody);
    [...block.children].forEach((child, i) => {
      const row = document.createElement('tr');
      if (i) tbody.append(row);
      else thead.append(row);
      [...child.children].forEach((col) => {
        const cell = buildCell(i);
        cell.innerHTML = col.innerHTML;
        row.append(cell);
      });
    });
    block.innerHTML = '';
    block.append(table);
  }
  if (block.classList.contains(VARIANT_INDUSTRY)) {
    table.querySelectorAll('tbody td').forEach((cell) => {
      cell.innerHTML = `<p>${cell.innerHTML}</p>`;
    });
  }
  if (block.classList.contains(VARIANT_REVENUE)) {
    table.querySelectorAll('tr').forEach((row) => {
      if (row.children.length === 1) {
        row.children[0].setAttribute('colspan', 4);
        const cell = row.children[0];
        if (cell.textContent === '') {
          row.classList.add('empty');
        }
      }
    });
  }
}
