(function (root) {
  "use strict";

  function numberOrNull(value) {
    if (value === null || value === undefined || String(value).trim() === "" || /^(n\.p\.|na|nan)$/i.test(String(value).trim())) return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new Error(`Invalid numeric value: ${value}`);
    return number;
  }

  function parseRow(row) {
    const year = numberOrNull(row.year);
    if (!Number.isInteger(year)) throw new Error("A valid year is required");
    const nSuppressed = numberOrNull(row.n_suppressed) || 0;
    return {
      year,
      hospitalisations: numberOrNull(row.cases),
      bed_days: numberOrNull(row.bed_days),
      state: row.state_or_territory,
      road_user: row.road_user,
      age_group: row.age_group,
      sex: row.gender,
      status: row.status,
      remoteness: row.remoteness,
      counterparty: row.counterparty,
      n_suppressed: nSuppressed,
      suppressed: String(row.suppressed).toLowerCase() === "yes" || nSuppressed > 0
    };
  }

  function summarise(rows) {
    const result = { n_suppressed: 0, suppressed: false, row_count: rows.length };
    for (const metric of ["hospitalisations", "bed_days"]) {
      const published = rows.map(row => row[metric]).filter(Number.isFinite);
      result[metric] = published.length ? published.reduce((a, b) => a + b, 0) : null;
      result[metric + "_partial"] = rows.some(row => row.suppressed || row[metric + "_partial"] || !Number.isFinite(row[metric]));
    }
    result.n_suppressed = rows.reduce((total, row) => total + (row.n_suppressed || 0), 0);
    result.suppressed = rows.some(row => row.suppressed || row.hospitalisations_partial || row.bed_days_partial);
    result.alos = !result.hospitalisations_partial && !result.bed_days_partial && result.hospitalisations > 0 && Number.isFinite(result.bed_days)
      ? result.bed_days / result.hospitalisations : null;
    return result;
  }

  function aggregateBy(rows, fields) {
    const groups = new Map();
    for (const row of rows) {
      const key = JSON.stringify(fields.map(field => row[field]));
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    return Array.from(groups.values(), group => ({
      ...Object.fromEntries(fields.map(field => [field, group[0][field]])),
      ...summarise(group)
    }));
  }

  function categoryRows(rows, keyField, metric = "hospitalisations") {
    const total = summarise(rows);
    return aggregateBy(rows, [keyField]).map(group => ({
      ...group,
      label: group[keyField],
      value: group[metric],
      share: !total[metric + "_partial"] && !group[metric + "_partial"] && total[metric] > 0 && Number.isFinite(group[metric])
        ? group[metric] / total[metric] * 100 : null
    }));
  }

  function filterRows(rows, { year = "All", state = "All", status } = {}) {
    return rows.filter(row =>
      (year === "All" || row.year === Number(year)) &&
      (state === "All" || row.state === state) &&
      (status === undefined || row.status === status)
    );
  }

  const api = { numberOrNull, parseRow, summarise, aggregateBy, categoryRows, filterRows };
  root.RoadData = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
