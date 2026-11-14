// Sortable tables use current source totals and retain suppression metadata.
const tableSortState = {};
const HEAT = { blue: ["#eef8fe", "#86cdf5"], green: ["#ecf8f1", "#8fd9ae"], purple: ["#f1ecf9", "#a98fd3"] };
function drawTable(id, cfg) {
  const host = d3.select("#" + id);
  host.selectAll("*").remove();
  const sort = tableSortState[id] || cfg.defaultSort || { key: appState.metric, dir: "desc" };
  const rows = cfg.rows.slice().sort((a, b) => {
    const av = a[sort.key], bv = b[sort.key];
    if (av == null || bv == null) return av == null ? (bv == null ? 0 : 1) : -1;
    const compare = typeof av === "string" ? av.localeCompare(bv) : av - bv;
    return sort.dir === "asc" ? compare : -compare;
  });
  const heat = {};
  cfg.columns.filter(c => c.heat).forEach(c => {
    heat[c.key] = d3.scaleLinear().domain([0, d3.max(cfg.rows, d => d[c.key]) || 1]).range(HEAT[c.heat]).clamp(true);
  });
  const table = host.append("div").attr("class", "table-wrap").append("table").attr("class", "heat-table");
  const sortColumn = column => {
    const key = column.sortKey || column.key;
    tableSortState[id] = { key, dir: sort.key === key ? (sort.dir === "desc" ? "asc" : "desc") : (column.type === "text" ? "asc" : "desc") };
    drawTable(id, cfg);
  };
  table.append("thead").append("tr").selectAll("th").data(cfg.columns).join("th")
    .attr("class", c => c.type === "text" ? "col-text" : "col-num").attr("scope", "col").attr("tabindex", 0)
    .attr("aria-sort", c => sort.key === (c.sortKey || c.key) ? (sort.dir === "asc" ? "ascending" : "descending") : "none")
    .text(c => c.label + (sort.key === (c.sortKey || c.key) ? (sort.dir === "asc" ? " ▲" : " ▼") : ""))
    .on("click", (event, c) => sortColumn(c))
    .on("keydown", (event, c) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); sortColumn(c); } });
  table.append("tbody").selectAll("tr").data(rows).join("tr")
    .classed("is-active", d => cfg.isActive ? cfg.isActive(d) : false).classed("is-clickable", !!cfg.onRowClick)
    .attr("tabindex", cfg.onRowClick ? 0 : null)
    .attr("title", d => d.hospitalisations_partial || d.bed_days_partial ? "Published subtotal; some source values are withheld or missing." : null)
    .on("click", (event, d) => { if (cfg.onRowClick) cfg.onRowClick(d); })
    .on("keydown", (event, d) => { if (cfg.onRowClick && ["Enter", " "].includes(event.key)) { event.preventDefault(); cfg.onRowClick(d); } })
    .each(function (row) {
      const tr = d3.select(this);
      for (const column of cfg.columns) {
        const td = tr.append("td").attr("class", column.type === "text" ? "col-text" : "col-num")
          .text(column.fmt ? column.fmt(row[column.key], row) : row[column.key]);
        if (column.heat && Number.isFinite(row[column.key])) td.style("background-color", heat[column.key](row[column.key]));
      }
    });
  if (cfg.note) setChartNote(id, cfg.note);
}
function groupRows(rows, key) { return RoadData.categoryRows(rows, key, appState.metric); }
function drawTables() {
  const cases = { key: "hospitalisations", label: "Cases", type: "num", fmt: (v, row) => metricText(row, "hospitalisations"), heat: "blue" };
  const beds = { key: "bed_days", label: "Bed days", type: "num", fmt: (v, row) => metricText(row, "bed_days"), heat: "green" };
  const share = { key: "share", label: `Share (${getMetricLabel()})`, type: "num", fmt: shareText, heat: "purple" };
  const stay = { key: "alos", label: "Bed days / case", type: "num", fmt: formatDecimal, heat: "purple" };
  const text = label => ({ key: "label", label, type: "text" });
  drawTable("annualTable", {
    columns: [{ ...text("Year"), sortKey: "year" }, cases, beds, stay],
    rows: appState.nationalAnnual.map(d => ({ ...d, label: String(d.year), alos: RoadData.summarise([d]).alos })),
    defaultSort: { key: "year", dir: "asc" }, isActive: d => String(appState.year) === d.label,
    onRowClick: d => { appState.year = String(appState.year) === d.label ? "All" : d.label; syncFilterControls(); updateDashboard(); }
  });
  const first = new Map(groupRows(appState.roadUserAnnual.filter(d => d.year === 2011), "road_user").map(d => [d.label, d]));
  const last = new Map(groupRows(appState.roadUserAnnual.filter(d => d.year === 2021), "road_user").map(d => [d.label, d]));
  drawTable("moversTable", {
    columns: [text("Road user"), { key: "v2011", label: "2011", type: "num", fmt: formatNumber, heat: "blue" },
      { key: "v2021", label: "2021", type: "num", fmt: formatNumber, heat: "green" },
      { key: "change", label: "Change", type: "num", fmt: v => Number.isFinite(v) ? `${formatPercent(v)}%` : "—", heat: "purple" }],
    rows: [...new Set([...first.keys(), ...last.keys()])].map(label => {
      const a = first.get(label)?.[appState.metric], b = last.get(label)?.[appState.metric];
      return { label, v2011: a, v2021: b, change: a > 0 && Number.isFinite(b) ? (b / a - 1) * 100 : null };
    }), defaultSort: { key: "change", dir: "desc" }, note: "National road-user series; this comparison always uses 2011 and 2021."
  });
  drawTable("stateTable", {
    columns: [text("Jurisdiction"), cases, beds, share], rows: groupRows(filterByYear(appState.stateAnnual), "state"),
    isActive: d => appState.selectedState === d.label,
    onRowClick: d => { appState.selectedState = appState.selectedState === d.label ? "All" : d.label; syncFilterControls(); updateDashboard(); },
    note: "Jurisdiction cases and bed days exclude deaths in hospital within 30 days. Selecting a jurisdiction also scopes road-user, counterparty, age and sex breakdowns."
  });
  for (const [id, kind, label] of [["roadUserTable", "road_user", "Road user"], ["counterpartyTable", "counterparty", "Counterparty"], ["ageTable", "age_group", "Age group"], ["sexTable", "sex", "Sex"]]) {
    const source = getBreakdownRows(kind);
    const rows = groupRows(source, kind);
    if (kind === "age_group") for (const row of rows) { const index = AGE_ORDER.indexOf(row.label); row.order = index < 0 ? 99 : index; }
    drawTable(id, { columns: [{ ...text(label), ...(kind === "age_group" ? { sortKey: "order" } : {}) }, cases, beds, ...(kind === "counterparty" ? [stay] : [share])],
      rows, ...(kind === "age_group" ? { defaultSort: { key: "order", dir: "asc" } } : {}),
      note: `${categoryScopeLabel()}. ${suppressionNote(source)}` });
  }
  drawTable("remotenessTable", {
    columns: [text("ABS remoteness area"), cases, beds, share], rows: groupRows(filterByYear(appState.remotenessAnnual), "remoteness"),
    isActive: d => appState.selectedRemoteness === d.label,
    onRowClick: d => { if (d.label !== "Missing") { appState.selectedRemoteness = appState.selectedRemoteness === d.label ? "All" : d.label; updateDashboard(); } },
    note: "Missing-area records are retained in the table and in percentage denominators."
  });
}
