// Data loader and controller for the single-screen D3.js Dashboard
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
      ? "11-year national total (2011–2021)"
      : `Year ${appState.year} (${sharePct}% of 11-yr total)`
  );

  d3.select("#kpiBedDays").text(formatNumber(totalBeds));
  d3.select("#kpiBedDaysSub").text(
    appState.year === "All"
      ? `Avg. ${formatNumber(totalBeds / 11)} bed days / year`
      : `Total inpatient bed days in ${appState.year}`
  );

  d3.select("#kpiAlos").text(`${formatDecimal(alos)} days`);
  d3.select("#kpiAlosSub").text("Mean hospital stay per admission");

  const metric = appState.metric;
  const row2011 = appState.nationalAnnual.find(d => d.year === 2011);
  const row2021 = appState.nationalAnnual.find(d => d.year === 2021);
  const v2011 = row2011 ? row2011[metric] : 0;
  const v2021 = row2021 ? row2021[metric] : 0;
  const pctChange = v2011 > 0 ? ((v2021 - v2011) / v2011) * 100 : 0;

  d3.select("#kpiChange").text(`${formatPercent(pctChange)}%`);
  d3.select("#kpiChangeSub").text(
    `${getMetricLabel(metric)}: ${formatNumber(v2011)} (2011) → ${formatNumber(v2021)} (2021)`
  );

  const scopeLabel = appState.year === "All" ? "2011–2021" : `Year: ${appState.year}`;
  d3.selectAll(".metric-badge").text(`${getMetricLabel(metric)} | ${scopeLabel}`);
}

function updateDashboard() {
  updateKPIs();
  drawTrendChart();
  drawStateChart();
  drawRoadUserChart();
  drawRemotenessChart();
  drawDemographicsChart();
  drawCounterpartyChart();
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
    appState.nationalAnnual = nat;
    appState.stateAnnual = state;
    appState.roadUserAnnual = roadUser;
    appState.remotenessAnnual = remoteness;
    appState.ageGroupAnnual = ageGroup;
    appState.genderAnnual = gender;
    appState.counterpartyAnnual = counterparty;

    initTooltip();
    populateFilterOptions();
    updateDashboard();
  })
  .catch(err => {
    console.warn("Using fallback from Data/Cleaned_CSV_Files/:", err);
    if (window.CLEANED_CSV_FALLBACK) {
      const fb = window.CLEANED_CSV_FALLBACK;
      appState.nationalAnnual = fb["national_annual.csv"].map(parseNationalRow);
      appState.stateAnnual = fb["Temporal Trends & State Comparisons.csv"].map(parseStateRow);
      appState.roadUserAnnual = fb["road_user_summary.csv"].map(parseRoadUserRow);
      appState.remotenessAnnual = fb["remoteness_yearly_trends.csv"].map(parseRemotenessRow);
      appState.ageGroupAnnual = fb["age_group_summary.csv"].map(parseAgeGroupRow);
      appState.genderAnnual = fb["Gender_demographic_summary.csv"].map(parseGenderRow);
      appState.counterpartyAnnual = fb["Counterparty Analysis.csv"].map(parseCounterpartyRow);

      initTooltip();
      populateFilterOptions();
      updateDashboard();
    }
  });
