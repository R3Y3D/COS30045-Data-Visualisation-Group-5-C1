const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const model = require('../js/data-model.js');

function csvRows(relative) {
  const source = fs.readFileSync(path.join(__dirname, '../Data/Cleaned_CSV', relative), 'utf8').replace(/^\uFEFF/, '');
  const records = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(cell); if (row.some(Boolean)) records.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); records.push(row); }
  const headers = records.shift();
  return records.map(values => model.parseRow(Object.fromEntries(headers.map((key, i) => [key, values[i]]))));
}

test('blank and unpublished values remain missing; published zero remains zero', () => {
  for (const value of ['', ' ', null, undefined, 'n.p.']) assert.equal(model.numberOrNull(value), null);
  assert.equal(model.numberOrNull('0'), 0);
  assert.throws(() => model.numberOrNull('invalid'));
  assert.throws(() => model.numberOrNull('-1'));
});

test('a fully withheld real road-user cell never becomes a zero count', () => {
  const rows = model.filterRows(csvRows('first_nation/fn_road_user.csv'), { status: 'First Nations people', year: 2011 })
    .filter(row => row.road_user === 'Bus occupant');
  assert.equal(rows.length, 1);
  const total = model.summarise(rows);
  assert.equal(total.hospitalisations, null);
  assert.equal(total.bed_days, null);
  assert.equal(total.hospitalisations_partial, true);
  assert.equal(total.alos, null);
});

test('published subtotals retain their values and flags without exact shares or ratios', () => {
  const row = csvRows('first_nation/fn_road_user.csv').find(row => row.year === 2012 && row.status === 'First Nations people' && row.road_user === 'Bus occupant');
  assert.equal(row.hospitalisations, 5);
  assert.equal(row.suppressed, true);
  const grouped = model.categoryRows([row], 'road_user')[0];
  assert.equal(grouped.hospitalisations, 5);
  assert.equal(grouped.hospitalisations_partial, true);
  assert.equal(grouped.share, null);
  assert.equal(grouped.alos, null);
});

test('bed days per case uses the weighted aggregate rather than the mean of ratios', () => {
  const rows = [model.parseRow({ year: 2021, cases: 100, bed_days: 100 }), model.parseRow({ year: 2021, cases: 1, bed_days: 10 })];
  assert.equal(model.summarise(rows).alos, 110 / 101);
  assert.equal(model.summarise([]).alos, null);
});

test('all current national breakdowns reconcile for both metrics in every year', () => {
  const annual = csvRows('hospitilisation/national_annual.csv');
  for (const file of ['national_road_user.csv', 'national_remoteness.csv', 'national_age_gender.csv', 'national_counterparty.csv']) {
    const rows = csvRows('hospitilisation/' + file);
    for (const year of annual) {
      const total = model.summarise(model.filterRows(rows, { year: year.year }));
      for (const metric of ['hospitalisations', 'bed_days']) assert.equal(total[metric], year[metric], `${file} ${year.year} ${metric}`);
    }
  }
});

test('age and sex derivation retains missing and combined source categories', () => {
  const rows = csvRows('hospitilisation/national_age_gender.csv');
  const ages = model.aggregateBy(rows, ['year', 'age_group']);
  const sexes = model.aggregateBy(rows, ['year', 'sex']);
  assert.equal(model.summarise(ages.filter(row => row.age_group === 'Missing')).hospitalisations, 1);
  assert.equal(model.summarise(sexes.filter(row => row.sex === 'intersex or indeterminate or missing')).hospitalisations, 15);
  assert.equal(model.summarise(ages).hospitalisations, model.summarise(rows).hospitalisations);
  assert.equal(model.summarise(sexes).bed_days, model.summarise(rows).bed_days);
});

test('the new First Nations counterparty data reconciles by status and year', () => {
  const annual = csvRows('first_nation/fn_year.csv');
  const counterparties = csvRows('first_nation/fn_counterparty.csv');
  assert.equal(new Set(counterparties.map(row => row.counterparty)).size, 4);
  for (const reference of annual) {
    const total = model.summarise(model.filterRows(counterparties, { year: reference.year, status: reference.status }));
    assert.equal(total.hospitalisations, reference.hospitalisations);
    assert.equal(total.bed_days, reference.bed_days);
  }
});

test('jurisdiction filtering preserves suppressed cells and broader state road-user categories', () => {
  const rows = model.filterRows(csvRows('state_territory/state_road_user.csv'), { year: 2011, state: 'ACT' });
  assert(rows.every(row => row.year === 2011 && row.state === 'ACT'));
  assert(rows.some(row => row.road_user === 'Car driver, passenger or unknown position'));
  const bus = rows.find(row => row.road_user === 'Bus occupant');
  assert.equal(bus.hospitalisations, null);
  assert.equal(bus.suppressed, true);
  assert.equal(model.categoryRows(rows, 'road_user').find(row => row.label === 'Bus occupant').share, null);
});

test('partially suppressed age totals cannot produce an exact average', () => {
  const rows = model.filterRows(csvRows('state_territory/state_age.csv'), { year: 2011, state: 'ACT' });
  const total = model.summarise(rows);
  assert.equal(total.hospitalisations_partial, true);
  assert.equal(total.alos, null);
  assert(model.categoryRows(rows, 'age_group').every(row => row.share === null));
});
