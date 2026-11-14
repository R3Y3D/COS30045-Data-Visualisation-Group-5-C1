// Load only the current exports. No historical snapshot or fallback is used.
const CSV_DIR = "Data/Cleaned_CSV/";
const DATA_FILES = [
  ["nationalAnnual", "hospitilisation/national_annual.csv", []],
  ["roadUserAnnual", "hospitilisation/national_road_user.csv", ["road_user"]],
  ["remotenessAnnual", "hospitilisation/national_remoteness.csv", ["remoteness"]],
  ["nationalAgeGender", "hospitilisation/national_age_gender.csv", ["age_group", "gender"]],
  ["counterpartyAnnual", "hospitilisation/national_counterparty.csv", ["counterparty"]],
  ["stateAnnual", "state_territory/state_year.csv", ["state_or_territory"]],
  ["stateRoadUser", "state_territory/state_road_user.csv", ["state_or_territory", "road_user", "n_suppressed", "suppressed"]],
  ["stateAge", "state_territory/state_age.csv", ["state_or_territory", "age_group", "n_suppressed", "suppressed"]],
  ["stateGender", "state_territory/state_gender.csv", ["state_or_territory", "gender"]],
  ["stateCounterparty", "state_territory/state_counterparty.csv", ["state_or_territory", "counterparty"]],
  ["fnAnnual", "first_nation/fn_year.csv", ["status"]],
  ["fnRoadUser", "first_nation/fn_road_user.csv", ["status", "road_user", "n_suppressed", "suppressed"]],
  ["fnAge", "first_nation/fn_age.csv", ["status", "age_group", "n_suppressed", "suppressed"]],
  ["fnRemoteness", "first_nation/fn_remoteness.csv", ["status", "remoteness"]],
  ["fnCounterparty", "first_nation/fn_counterparty.csv", ["status", "counterparty"]]
];

function populateFilterOptions() {
  const years = appState.nationalAnnual.map(d => d.year).sort(d3.ascending);
  d3.select("#filterYear").selectAll("option").data(["All", ...years]).join("option")
    .attr("value", d => d).text(d => d === "All" ? "All years (2011–2021)" : d);
  const states = [...new Set(appState.stateAnnual.map(d => d.state))].sort();
  d3.select("#filterState").selectAll("option").data(["All", ...states]).join("option")
    .attr("value", d => d).text(d => d === "All" ? "Australia / all jurisdictions" : d);
  const statuses = [...new Set(appState.fnAnnual.map(d => d.status))];
  d3.select("#filterFnStatus").selectAll("option").data(statuses).join("option")
    .attr("value", d => d).text(d => d);

  d3.select("#filterMetric").on("change", function () { appState.metric = this.value; updateDashboard(); });
  d3.select("#filterYear").on("change", function () { appState.year = this.value; updateDashboard(); });
  d3.select("#filterState").on("change", function () { appState.selectedState = this.value; updateDashboard(); });
  d3.select("#filterFnStatus").on("change", function () { appState.fnStatus = this.value; updateDashboard(); });
  d3.select("#resetFiltersBtn").on("click", () => {
    Object.assign(appState, { year: "All", metric: "hospitalisations", selectedState: "All", selectedRemoteness: "All", fnStatus: "First Nations people" });
    syncFilterControls();
    updateDashboard();
  });
  syncFilterControls();
}

function syncFilterControls() {
  d3.select("#filterMetric").property("value", appState.metric);
  d3.select("#filterYear").property("value", appState.year);
  d3.select("#filterState").property("value", appState.selectedState);
  d3.select("#filterFnStatus").property("value", appState.fnStatus);
}

function topGroup(rows, field) {
  return RoadData.categoryRows(rows, field, appState.metric)
    .filter(d => Number.isFinite(d.value)).sort((a, b) => d3.descending(a.value, b.value))[0];
}

function updateKPIs() {
  const total = RoadData.summarise(filterByYear(appState.nationalAnnual));
  d3.select("#kpiHospitalisations").text(formatNumber(total.hospitalisations));
  d3.select("#kpiHospitalisationsSub").text(appState.year === "All" ? "National total · 2011–2021" : `National total · ${appState.year}`);
  d3.select("#kpiBedDays").text(formatNumber(total.bed_days));
  d3.select("#kpiBedDaysSub").text(appState.year === "All" ? "National inpatient bed days" : `National inpatient bed days · ${appState.year}`);
  d3.select("#kpiAlos").text(`${formatDecimal(total.alos)} days`);
  d3.select("#kpiAlosSub").text("National bed days per case");

  const metric = appState.metric;
  const first = appState.nationalAnnual.find(d => d.year === 2011);
  const last = appState.nationalAnnual.find(d => d.year === 2021);
  const change = first?.[metric] > 0 ? (last[metric] / first[metric] - 1) * 100 : null;
  d3.select("#kpiChange").text(Number.isFinite(change) ? `${formatPercent(change)}%` : "—");
  d3.select("#kpiChangeSub").text(`${formatNumber(first?.[metric])} → ${formatNumber(last?.[metric])}`);
  const peak = d3.greatest(appState.nationalAnnual, d => d[metric]);
  d3.select("#kpiPeak").text(peak?.year || "—");
  d3.select("#kpiPeakSub").text(peak ? `${formatNumber(peak[metric])} ${getMetricLabel(metric).toLowerCase()}` : "");
  const user = topGroup(filterByYear(appState.roadUserAnnual), "road_user");
  d3.select("#kpiTopUser").text(user?.label || "—");
  d3.select("#kpiTopUserSub").text(`${shareText(user?.share)} of national total`);
  const state = topGroup(filterByYear(appState.stateAnnual), "state");
  d3.select("#kpiTopState").text(state?.label || "—");
  d3.select("#kpiTopStateSub").text(`${shareText(state?.share)} of jurisdiction-table total`);

  const period = appState.year === "All" ? "2011–2021" : String(appState.year);
  d3.selectAll(".metric-badge").text(`${getMetricLabel(metric)} | ${period}`);
  d3.selectAll(".scope-badge").text(period);
  d3.select("#filterState").property("disabled", !["states", "roadusers", "demographics"].includes(appState.view));
  d3.select("#fnStatusControl").property("hidden", appState.view !== "firstnations");
  const scope = appState.selectedState === "All" ? "National category summaries." : `${appState.selectedState} selected for road-user, counterparty, age and sex breakdowns; jurisdiction tables exclude deaths in hospital within 30 days.`;
  d3.select("#dataScope").text(appState.view === "firstnations"
    ? `${appState.fnStatus} breakdowns. Annual chart compares both reported status groups. Indigenous-status table bed days exclude deaths in hospital within 30 days.`
    : `${scope} KPI cards, overview trends and regional charts retain Australia-wide coverage.`);
  d3.selectAll("#card-roaduser .chart-subtitle, #card-roaduser-table .chart-subtitle").text(`${categoryScopeLabel()} · top categories in chart; full published breakdown in table`);
  d3.select("#card-counterparty .chart-subtitle").text(`${categoryScopeLabel()} · collision counterparts and non-collision events`);
  d3.select("#card-demographics .chart-subtitle").text(`${categoryScopeLabel()} · age and sex categories from the selected source`);
}

const DRAW_STEPS = [
  ["drawTrendChart", ["trendChart"]], ["drawStateChart", ["stateChart"]],
  ["drawRoadUserChart", ["roadUserChart"]], ["drawRemotenessChart", ["remotenessChart"]],
  ["drawDemographicsChart", ["demographicsChart"]], ["drawCounterpartyChart", ["counterpartyChart"]],
  ["drawSexTrendChart", ["sexTrendChart"]], ["drawAlosChart", ["alosChart"]],
  ["drawTables", ["annualTable", "moversTable", "stateTable", "roadUserTable", "counterpartyTable", "remotenessTable", "ageTable", "sexTable"]],
  ["drawFnCharts", ["fnAnnualChart", "fnRemotenessChart", "fnRoadUserChart", "fnAgeChart", "fnCounterpartyChart"]]
];

function updateDashboard() {
  hideTooltip();
  updateKPIs();
  for (const [name, ids] of DRAW_STEPS) {
    try {
      if (typeof window[name] !== "function") throw new Error(`${name} is unavailable`);
      window[name]();
    } catch (error) {
      console.error(name, error);
      for (const id of ids) d3.select("#" + id).selectAll(".chart-error").data([error]).join("p")
        .attr("class", "chart-error").text("This chart could not be displayed. Please reload the page.");
    }
  }
}

const VIEWS = {
  overview: ["card-trend", "card-sex-trend", "card-alos", "card-annual-table", "card-movers-table"],
  states: ["card-state", "card-state-table"],
  roadusers: ["card-roaduser", "card-counterparty", "card-roaduser-table", "card-counterparty-table"],
  regions: ["card-remoteness", "card-remoteness-table"],
  demographics: ["card-demographics", "card-age-table", "card-sex-table"],
  firstnations: ["card-fn-annual", "card-fn-remoteness", "card-fn-roaduser", "card-fn-age", "card-fn-counterparty"]
};

function setView(view, updateHash = true) {
  if (!VIEWS[view]) view = "overview";
  appState.view = view;
  closeExpanded();
  const ids = VIEWS[view];
  d3.selectAll(".chart-card").each(function () {
    const show = ids.includes(this.id);
    d3.select(this).classed("is-hidden", !show).classed("is-solo", show && ids.length === 1)
      .classed("is-wide", show && ids.length > 1 && ids.length % 2 === 1 && this.id === ids[0]);
  });
  d3.selectAll(".tab").classed("is-active", function () { return this.dataset.view === view; })
    .attr("aria-current", function () { return this.dataset.view === view ? "page" : null; });
  if (updateHash) history.replaceState(null, "", "#" + view);
  updateDashboard();
}

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
function initTabs() {
  backdropEl = d3.select("body").append("div").attr("class", "backdrop").on("click", closeExpanded);
  d3.selectAll(".chart-card").each(function () {
    const el = this;
    const header = d3.select(el).select(".chart-header");
    const actions = header.append("div").attr("class", "chart-actions");
    const badge = header.select(".chart-badge").node();
    if (badge) actions.node().appendChild(badge);
    actions.append("button").attr("type", "button").attr("class", "btn-expand")
      .attr("title", "Expand").attr("aria-label", "Expand chart")
      .html('<span class="material-symbols-outlined" aria-hidden="true">open_in_full</span>')
      .on("click", () => toggleExpand(el));
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeExpanded(); });
  d3.selectAll(".tab").on("click", function (event) { event.preventDefault(); setView(this.dataset.view); });
  window.addEventListener("hashchange", () => setView(location.hash.slice(1), false));
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateDashboard, 120);
  });
}

async function loadDashboard() {
  const entries = await Promise.all(DATA_FILES.map(async ([key, path, dimensions]) => {
    const rows = await d3.csv(CSV_DIR + path, { cache: "no-store" });
    for (const column of ["year", "cases", "bed_days", ...dimensions]) {
      if (!rows.columns.includes(column)) throw new Error(`${path}: missing ${column}`);
    }
    return [key, rows.map(row => RoadData.parseRow(row))];
  }));
  const data = Object.fromEntries(entries);
  data.ageGroupAnnual = RoadData.aggregateBy(data.nationalAgeGender, ["year", "age_group"]);
  data.genderAnnual = RoadData.aggregateBy(data.nationalAgeGender, ["year", "sex"]);
  for (const key of ["roadUserAnnual", "remotenessAnnual", "counterpartyAnnual", "ageGroupAnnual", "genderAnnual"]) {
    for (const annual of data.nationalAnnual) {
      const total = RoadData.summarise(data[key].filter(row => row.year === annual.year));
      if (total.hospitalisations !== annual.hospitalisations || total.bed_days !== annual.bed_days) throw new Error(`${key}: inconsistent national totals for ${annual.year}`);
    }
  }
  Object.assign(appState, data);
  initTooltip();
  populateFilterOptions();
  initTabs();
  setView(location.hash.slice(1), false);
  d3.select("#loadStatus").text("").property("hidden", true);
  document.documentElement.dataset.dashboardReady = "true";
  return data;
}

window.dashboardReady = loadDashboard().catch(error => {
  console.error("Unable to load current dashboard data", error);
  d3.select("#loadStatus").property("hidden", false).attr("role", "alert")
    .classed("chart-error", true).text("The current data could not be loaded. Please reload the page or check your connection.");
  document.documentElement.dataset.dashboardReady = "error";
  return null;
});
