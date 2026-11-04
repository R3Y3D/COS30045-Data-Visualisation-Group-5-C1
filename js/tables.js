// Heat-map data tables (D3-rendered), styled like the reference dashboard.
// Each table respects the Year filter; clicking a heading sorts, clicking a row filters where it makes sense.

const tableSortState = {};

const HEAT = {
  blue:   ["#eef8fe", "#86cdf5"],
  green:  ["#ecf8f1", "#8fd9ae"],
  purple: ["#f1ecf9", "#a98fd3"]
};

function drawTable(id, cfg) {
  const host = d3.select("#" + id);
  host.selectAll("*").remove();

  const sort = tableSortState[id] || cfg.defaultSort || { key: appState.metric, dir: "desc" };

  const rows = cfg.rows.slice().sort((a, b) => {
    const av = a[sort.key], bv = b[sort.key];
    const r = typeof av === "string" ? av.localeCompare(bv) : av - bv;
    return sort.dir === "asc" ? r : -r;
  });

  const heat = {};
  cfg.columns.filter(c => c.heat).forEach(c => {
    const max = d3.max(cfg.rows, d => d[c.key]) || 1;
    heat[c.key] = d3.scaleLinear().domain([0, max]).range(HEAT[c.heat]).interpolate(d3.interpolateRgb).clamp(true);
  });

  const wrap = host.append("div").attr("class", "table-wrap");
  const table = wrap.append("table").attr("class", "heat-table");

  table.append("thead").append("tr")
    .selectAll("th")
    .data(cfg.columns)
    .join("th")
    .attr("class", c => c.type === "text" ? "col-text" : "col-num")
    .html(c => {
      const k = c.sortKey || c.key;
      const arrow = sort.key === k ? `<span class="sort-arrow">${sort.dir === "asc" ? "▲" : "▼"}</span>` : "";
      return `${c.label}${arrow}`;
    })
    .on("click", (event, c) => {
      const k = c.sortKey || c.key;
      const dir = sort.key === k ? (sort.dir === "desc" ? "asc" : "desc") : (c.type === "text" ? "asc" : "desc");
      tableSortState[id] = { key: k, dir };
      drawTable(id, cfg);
    });

  table.append("tbody")
    .selectAll("tr")
    .data(rows)
    .join("tr")
    .classed("is-active", d => cfg.isActive ? cfg.isActive(d) : false)
    .classed("is-clickable", () => !!cfg.onRowClick)
    .on("click", (event, d) => { if (cfg.onRowClick) cfg.onRowClick(d); })
    .each(function (d) {
      const tr = d3.select(this);
      cfg.columns.forEach(c => {
        const td = tr.append("td").attr("class", c.type === "text" ? "col-text" : "col-num");
        td.text(c.fmt ? c.fmt(d[c.key]) : d[c.key]);
        if (c.heat) td.style("background-color", heat[c.key](d[c.key]));
      });
    });
}

// Group raw rows by a field -> { label, hospitalisations, bed_days, alos, share }
function groupRows(rows, keyField) {
  const metric = appState.metric;
  const grouped = d3.rollup(
    rows,
    v => ({ hospitalisations: d3.sum(v, d => d.hospitalisations), bed_days: d3.sum(v, d => d.bed_days) }),
    d => d[keyField]
  );
  const total = d3.sum(Array.from(grouped.values()), d => d[metric]) || 1;
  return Array.from(grouped, ([label, c]) => ({
    label,
    hospitalisations: c.hospitalisations,
    bed_days: c.bed_days,
    alos: c.hospitalisations > 0 ? c.bed_days / c.hospitalisations : 0,
    share: (c[metric] / total) * 100
  }));
}

function drawTables() {
  const pct = v => `${v.toFixed(1)}%`;
  const num = formatNumber;
  const stay = v => formatDecimal(v);
  const shareLabel = `Share (${getMetricLabel()})`;

  const hosp = { key: "hospitalisations", label: "Hospitalisations", type: "num", fmt: num, heat: "blue" };
  const beds = { key: "bed_days", label: "Bed days", type: "num", fmt: num, heat: "green" };
  const share = { key: "share", label: shareLabel, type: "num", fmt: pct, heat: "purple" };
  const alosCol = { key: "alos", label: "Avg. stay (days)", type: "num", fmt: stay, heat: "purple" };
  const textCol = label => ({ key: "label", label, type: "text" });

  // Overview: year-by-year (all years; selected year highlighted)
  drawTable("annualTable", {
    columns: [{ key: "label", sortKey: "order", label: "Year", type: "text" }, hosp, beds, alosCol],
    rows: appState.nationalAnnual.map(d => ({
      label: String(d.year), order: d.year,
      hospitalisations: d.hospitalisations, bed_days: d.bed_days,
      alos: d.hospitalisations > 0 ? d.bed_days / d.hospitalisations : 0
    })),
    defaultSort: { key: "order", dir: "asc" },
    isActive: d => String(appState.year) === d.label,
    onRowClick: d => {
      appState.year = String(appState.year) === d.label ? "All" : d.label;
      syncFilterControls();
      updateDashboard();
    }
  });

  // Overview: biggest changes by road user, 2011 vs 2021 (ignores the year filter)
  const metricKey = appState.metric;
  const sumFor = year => d3.rollup(
    appState.roadUserAnnual.filter(d => d.year === year),
    v => d3.sum(v, d => d[metricKey]),
    d => d.road_user
  );
  const first = sumFor(2011), last = sumFor(2021);
  const moverRows = Array.from(new Set([...first.keys(), ...last.keys()])).map(label => {
    const a = first.get(label) || 0, b = last.get(label) || 0;
    return { label, v2011: a, v2021: b, change: a > 0 ? ((b - a) / a) * 100 : 0 };
  });
  drawTable("moversTable", {
    columns: [
      textCol("Road user"),
      { key: "v2011", label: "2011", type: "num", fmt: num, heat: "blue" },
      { key: "v2021", label: "2021", type: "num", fmt: num, heat: "green" },
      { key: "change", label: "Change", type: "num", fmt: v => `${formatPercent(v)}%`, heat: "purple" }
    ],
    rows: moverRows,
    defaultSort: { key: "change", dir: "desc" }
  });

  // States
  drawTable("stateTable", {
    columns: [textCol("Jurisdiction"), hosp, beds, share],
    rows: groupRows(filterByYear(appState.stateAnnual), "state"),
    isActive: d => appState.selectedState === d.label,
    onRowClick: d => {
      appState.selectedState = appState.selectedState === d.label ? "All" : d.label;
      syncFilterControls();
      updateDashboard();
    }
  });

  // Road users
  drawTable("roadUserTable", {
    columns: [textCol("Road user"), hosp, beds, share],
    rows: groupRows(filterByYear(appState.roadUserAnnual), "road_user")
  });

  drawTable("counterpartyTable", {
    columns: [textCol("Counterparty"), hosp, beds, alosCol],
    rows: groupRows(filterByYear(appState.counterpartyAnnual), "counterparty")
  });

  // Regions
  drawTable("remotenessTable", {
    columns: [textCol("ABS remoteness area"), hosp, beds, share],
    rows: groupRows(filterByYear(appState.remotenessAnnual), "remoteness"),
    isActive: d => appState.selectedRemoteness === d.label,
    onRowClick: d => {
      if (d.label === "Missing") return;
      appState.selectedRemoteness = appState.selectedRemoteness === d.label ? "All" : d.label;
      updateDashboard();
    }
  });

  // Demographics
  const ageRows = groupRows(filterByYear(appState.ageGroupAnnual), "age_group").map(d => {
    const i = AGE_ORDER.indexOf(d.label);
    return { ...d, order: i < 0 ? 99 : i };
  });
  drawTable("ageTable", {
    columns: [{ key: "label", sortKey: "order", label: "Age group", type: "text" }, hosp, beds, share],
    rows: ageRows,
    defaultSort: { key: "order", dir: "asc" }
  });

  drawTable("sexTable", {
    columns: [textCol("Sex"), hosp, beds, share],
    rows: groupRows(filterByYear(appState.genderAnnual), "sex")
  });
}