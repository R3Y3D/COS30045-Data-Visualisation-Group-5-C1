// Data loader and controller for the single-page D3.js Dashboard
// Strictly loads the user's CSV files from Data/Cleaned_CSV_Files/

function parseNationalRow(d) {
  return {
    year: +d["year"],
    hospitalisations: +d["hospitalisations"],
    bed_days: +d["bed_days"]
  };
}

function parseStateRow(d) {
  return {
    year: +d["calendar year"],
    state: d["state or territory"],
    hospitalisations: +d["Sum(count of cases excluding died in hospitals within 30 days)"],
    bed_days: +d["Sum(bed days excluding died in hospitals within 30 days)"]
  };
}

function parseRoadUserRow(d) {
  return {
    year: +d["Calendar year"],
    road_user: d["Road user"],
    hospitalisations: +d["Sum(Hospitalisations)"],
    bed_days: +d["Sum(Bed days)"]
  };
}

function parseRemotenessRow(d) {
  return {
    year: +d["Calendar year"],
    remoteness: d["ABS remoteness area"],
    hospitalisations: +d["Sum(Hospitalisations)"],
    bed_days: +d["Sum(Bed days)"]
  };
}

function parseAgeGroupRow(d) {
  return {
    year: +d["Calendar year"],
    age_group: d["Age group"],
    hospitalisations: +d["Sum(Hospitalisations)"],
    bed_days: +d["Sum(Bed days)"]
  };
}

function parseGenderRow(d) {
  return {
    year: +d["Calendar year"],
    sex: d["Sex"],
    hospitalisations: +d["Sum(Hospitalisations)"],
    bed_days: +d["Sum(Bed days)"]
  };
}

function parseCounterpartyRow(d) {
  return {
    year: +d["calendar year (#4)"],
    counterparty: d["counterparty"],
    hospitalisations: +d["Sum(count of cases excluding died in hospitals within 30 days (#4))"],
    bed_days: +d["Sum(bed days excluding died in hospitals within 30 days (#4))"]
  };
}

function populateFilterOptions() {
  const years = appState.nationalAnnual.map(d => d.year).sort(d3.ascending);
  const yearSelect = d3.select("#filterYear");
  years.forEach(y => {
    yearSelect.append("option").attr("value", y).text(y);
  });

  const states = Array.from(new Set(appState.stateAnnual.map(d => d.state))).sort();
  const stateSelect = d3.select("#filterState");
  states.forEach(st => {
    stateSelect.append("option").attr("value", st).text(st);
  });

  d3.select("#filterMetric").on("change", function () {
    appState.metric = this.value;
    updateDashboard();
  });

  d3.select("#filterYear").on("change", function () {
    appState.year = this.value;
    updateDashboard();
  });

  d3.select("#filterState").on("change", function () {
    appState.selectedState = this.value;
    updateDashboard();
  });

  d3.select("#resetFiltersBtn").on("click", () => {
    appState.year = "All";
    appState.metric = "hospitalisations";
    appState.selectedState = "All";
    appState.selectedRemoteness = "All";
    syncFilterControls();
    updateDashboard();
  });
}

function syncFilterControls() {
  d3.select("#filterMetric").property("value", appState.metric);
  d3.select("#filterYear").property("value", appState.year);
  d3.select("#filterState").property("value", appState.selectedState);
}

// Returns { key, value, share } of the largest group for the current metric
function topGroup(rows, keyField) {
  const metric = appState.metric;
  const grouped = d3.rollup(rows, v => d3.sum(v, d => d[metric]), d => d[keyField]);
  const total = d3.sum(Array.from(grouped.values())) || 1;
  const best = Array.from(grouped, ([key, value]) => ({ key, value, share: (value / total) * 100 }))
    .sort((a, b) => d3.descending(a.value, b.value))[0];
  return best || { key: "–", value: 0, share: 0 };
}

function updateKPIs() {
  const natRows = filterByYear(appState.nationalAnnual);
  const totalHosp = d3.sum(natRows, d => d.hospitalisations);
  const totalBeds = d3.sum(natRows, d => d.bed_days);
  const alos = totalHosp > 0 ? totalBeds / totalHosp : 0;

  const grandHosp = d3.sum(appState.nationalAnnual, d => d.hospitalisations) || 1;
  const sharePct = ((totalHosp / grandHosp) * 100).toFixed(1);

  d3.select("#kpiHospitalisations").text(formatNumber(totalHosp));
  d3.select("#kpiHospitalisationsSub").text(
    appState.year === "All"
      ? "11-year national total"
      : `${sharePct}% of 11-yr total`
  );

  d3.select("#kpiBedDays").text(formatNumber(totalBeds));
  d3.select("#kpiBedDaysSub").text(
    appState.year === "All"
      ? `Avg. ${formatNumber(totalBeds / 11)} / year`
      : `Inpatient bed days in ${appState.year}`
  );

  d3.select("#kpiAlos").text(`${formatDecimal(alos)} days`);
  d3.select("#kpiAlosSub").text("Mean stay per admission");

  const metric = appState.metric;
  const row2011 = appState.nationalAnnual.find(d => d.year === 2011);
  const row2021 = appState.nationalAnnual.find(d => d.year === 2021);
  const v2011 = row2011 ? row2011[metric] : 0;
  const v2021 = row2021 ? row2021[metric] : 0;
  const pctChange = v2011 > 0 ? ((v2021 - v2011) / v2011) * 100 : 0;

  d3.select("#kpiChange").text(`${formatPercent(pctChange)}%`);
  d3.select("#kpiChangeSub").text(`${formatNumber(v2011)} → ${formatNumber(v2021)}`);

  // Peak year (always across all years, for the selected metric)
  const peak = d3.greatest(appState.nationalAnnual, d => d[metric]);
  d3.select("#kpiPeak").text(peak ? peak.year : "–");
  d3.select("#kpiPeakSub").text(peak ? `${formatNumber(peak[metric])} ${getMetricLabel(metric).toLowerCase()}` : "");

  // Top road user and top jurisdiction (respect the year filter)
  const topUser = topGroup(filterByYear(appState.roadUserAnnual), "road_user");
  d3.select("#kpiTopUser").text(topUser.key);
  d3.select("#kpiTopUserSub").text(`${topUser.share.toFixed(1)}% of total`);

  const topState = topGroup(filterByYear(appState.stateAnnual), "state");
  d3.select("#kpiTopState").text(topState.key);
  d3.select("#kpiTopStateSub").text(`${topState.share.toFixed(1)}% of total`);

  const scopeLabel = appState.year === "All" ? "2011–2021" : `Year: ${appState.year}`;
  d3.selectAll(".metric-badge").text(`${getMetricLabel(metric)} | ${scopeLabel}`);
  d3.selectAll(".scope-badge").text(scopeLabel);
}

// Each draw runs on its own, so one failure can't blank the rest of the dashboard.
// A failing card shows its error message instead of staying empty.
const DRAW_STEPS = [
  ["drawTrendChart", ["trendChart"], "js/trend-chart.js"],
  ["drawStateChart", ["stateChart"], "js/state-chart.js"],
  ["drawRoadUserChart", ["roadUserChart"], "js/road-user-chart.js"],
  ["drawRemotenessChart", ["remotenessChart"], "js/remoteness-chart.js"],
  ["drawDemographicsChart", ["demographicsChart"], "js/demographics-chart.js"],
  ["drawCounterpartyChart", ["counterpartyChart"], "js/counterparty-chart.js"],
  ["drawSexTrendChart", ["sexTrendChart"], "js/overview-charts.js"],
  ["drawAlosChart", ["alosChart"], "js/overview-charts.js"],
  ["drawTables", ["annualTable", "moversTable", "stateTable", "roadUserTable", "counterpartyTable", "remotenessTable", "ageTable", "sexTable"], "js/tables.js"]
];

function showDrawError(containerIds, message) {
  console.error(message);
  containerIds.forEach(id => {
    const host = d3.select("#" + id);
    if (host.empty() || host.select(".chart-error").size()) return;
    host.selectAll("*").remove();
    host.append("p").attr("class", "chart-error").text("⚠ " + message);
  });
}

function updateDashboard() {
  try { updateKPIs(); } catch (err) { console.error("updateKPIs failed:", err); }

  DRAW_STEPS.forEach(([fnName, containerIds, file]) => {
    const fn = window[fnName];
    if (typeof fn !== "function") {
      showDrawError(containerIds, `${fnName} is not defined. Is ${file} in your project and linked in index.html?`);
      return;
    }
    try {
      fn();
    } catch (err) {
      showDrawError(containerIds, `${fnName} failed: ${err.message}`);
    }
  });
}

// ---------- Header tabs = separate views ----------
const VIEWS = {
  overview:     ["card-trend", "card-sex-trend", "card-alos", "card-annual-table", "card-movers-table"],
  states:       ["card-state", "card-state-table"],
  roadusers:    ["card-roaduser", "card-counterparty", "card-roaduser-table", "card-counterparty-table"],
  regions:      ["card-remoteness", "card-remoteness-table"],
  demographics: ["card-demographics", "card-age-table", "card-sex-table"]
};

function setView(view, updateHash = true) {
  if (!VIEWS[view]) view = "overview";
  const ids = VIEWS[view];
  closeExpanded();

  d3.selectAll(".chart-card").each(function () {
    const show = ids.includes(this.id);
    d3.select(this)
      .classed("is-hidden", !show)
      .classed("is-solo", show && ids.length === 1)
      // odd number of cards: first one spans the full width
      .classed("is-wide", show && ids.length > 1 && ids.length % 2 === 1 && this.id === ids[0]);
  });
  d3.selectAll(".tab").classed("is-active", function () { return this.dataset.view === view; });
  if (updateHash) history.replaceState(null, "", "#" + view);
}

// ---------- Expandable charts ----------
let backdropEl = null;

function closeExpanded() {
  d3.selectAll(".chart-card.is-expanded").classed("is-expanded", false);
  d3.selectAll(".btn-expand").attr("title", "Expand").attr("aria-label", "Expand chart")
    .select(".material-symbols-outlined").text("open_in_full");
  if (backdropEl) backdropEl.classed("is-open", false);
  document.body.classList.remove("no-scroll");
}

function toggleExpand(el) {
  const wasOpen = el.classList.contains("is-expanded");
  closeExpanded();
  if (wasOpen) return;
  el.classList.add("is-expanded");
  d3.select(el).select(".btn-expand").attr("title", "Close").attr("aria-label", "Close expanded chart")
    .select(".material-symbols-outlined").text("close_fullscreen");
  backdropEl.classed("is-open", true);
  document.body.classList.add("no-scroll");
}

function initExpand() {
  backdropEl = d3.select("body").append("div").attr("class", "backdrop").on("click", closeExpanded);

  d3.selectAll(".chart-card").each(function () {
    const el = this;
    const header = d3.select(el).select(".chart-header");
    const actions = header.append("div").attr("class", "chart-actions");
    actions.node().appendChild(header.select(".chart-badge").node());
    actions.append("button")
      .attr("type", "button")
      .attr("class", "btn-expand")
      .attr("title", "Expand")
      .attr("aria-label", "Expand chart")
      .html('<span class="material-symbols-outlined" aria-hidden="true">open_in_full</span>')
      .on("click", () => toggleExpand(el));
  });

  document.addEventListener("keydown", e => { if (e.key === "Escape") closeExpanded(); });
}

function initTabs() {
  initExpand();
  d3.selectAll(".tab").on("click", function (event) {
    event.preventDefault();
    setView(this.dataset.view);
  });
  setView(location.hash.replace("#", ""), false);
}

let dashboardBooted = false;

function bootDashboard(data) {
  Object.assign(appState, data);
  initTooltip();
  if (!dashboardBooted) {
    dashboardBooted = true;
    initTabs();
    populateFilterOptions();
  }
  updateDashboard();
}

const CSV_DIR = "Data/Cleaned_CSV_Files/";

Promise.all([
  d3.csv(CSV_DIR + "national_annual.csv", parseNationalRow),
  d3.csv(CSV_DIR + "Temporal Trends & State Comparisons.csv", parseStateRow),
  d3.csv(CSV_DIR + "road_user_summary.csv", parseRoadUserRow),
  d3.csv(CSV_DIR + "remoteness_yearly_trends.csv", parseRemotenessRow),
  d3.csv(CSV_DIR + "age_group_summary.csv", parseAgeGroupRow),
  d3.csv(CSV_DIR + "Gender_demographic_summary.csv", parseGenderRow),
  d3.csv(CSV_DIR + "Counterparty Analysis.csv", parseCounterpartyRow)
])
  .then(([nat, state, roadUser, remoteness, ageGroup, gender, counterparty]) => {
    bootDashboard({
      nationalAnnual: nat,
      stateAnnual: state,
      roadUserAnnual: roadUser,
      remotenessAnnual: remoteness,
      ageGroupAnnual: ageGroup,
      genderAnnual: gender,
      counterpartyAnnual: counterparty
    });
  })
  .catch(err => {
    console.warn("Using fallback from js/data-fallback.js:", err);
    if (!window.CLEANED_CSV_FALLBACK) {
      console.error("No fallback data found. Is js/data-fallback.js linked in index.html?");
      return;
    }
    const fb = window.CLEANED_CSV_FALLBACK;
    bootDashboard({
      nationalAnnual: fb["national_annual.csv"].map(d => parseNationalRow(d)),
      stateAnnual: fb["Temporal Trends & State Comparisons.csv"].map(d => parseStateRow(d)),
      roadUserAnnual: fb["road_user_summary.csv"].map(d => parseRoadUserRow(d)),
      remotenessAnnual: fb["remoteness_yearly_trends.csv"].map(d => parseRemotenessRow(d)),
      ageGroupAnnual: fb["age_group_summary.csv"].map(d => parseAgeGroupRow(d)),
      genderAnnual: fb["Gender_demographic_summary.csv"].map(d => parseGenderRow(d)),
      counterpartyAnnual: fb["Counterparty Analysis.csv"].map(d => parseCounterpartyRow(d))
    });
  });