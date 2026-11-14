// Shared state, constants, formatters, and tooltip utilities for the D3.js Dashboard
// All active data is sourced exclusively from Data/Cleaned_CSV/.

const appState = {
  year: "All",
  metric: "hospitalisations", // "hospitalisations" or "bed_days"
  selectedState: "All",
  selectedRoadUser: "All",
  selectedRemoteness: "All",
  selectedSex: "All",
  view: "overview",
  fnStatus: "First Nations people",

  // Normalised rows from the current national, jurisdiction and First Nations exports.
  nationalAnnual: [],     // national_annual.csv
  stateAnnual: [],        // state_territory/state_year.csv
  roadUserAnnual: [],
  remotenessAnnual: [],
  ageGroupAnnual: [],
  genderAnnual: [],
  counterpartyAnnual: [],
  stateRoadUser: [],
  stateAge: [],
  stateGender: [],
  stateCounterparty: [],
  fnAnnual: [],
  fnRoadUser: [],
  fnAge: [],
  fnRemoteness: [],
  fnCounterparty: []
};

// Palette taken from the reference dashboard (navy / sky blue / teal / purple / pink)
const COLORS = {
  primary: "#0a63b8",
  sky: "#33b1f0",
  bedDays: "#00a0b8",
  highlight: "#e0557a",
  amber: "#f0a030",
  purple: "#5b2ea6",
  slate: "#64748b",
  remoteness: {
    "Major Cities": "#0a63b8",
    "Regional": "#33b1f0",
    "Remote": "#5b2ea6",
    "Missing": "#9aa8bd"
  },
  sex: {
    "Male": "#0a63b8",
    "Female": "#d9507b"
  },
  statePalette: {
    "NSW": "#0a63b8",
    "Vic": "#33b1f0",
    "Qld": "#00a0b8",
    "WA": "#5b2ea6",
    "SA": "#7b5fd0",
    "Tas": "#1f8fd6",
    "NT": "#3d4fc4",
    "ACT": "#0f7f95"
  },
  palette: [
    "#0a63b8", "#33b1f0", "#00a0b8", "#5b2ea6",
    "#7b5fd0", "#1f8fd6", "#3d4fc4", "#0f7f95",
    "#d9507b", "#64748b", "#94a3b8", "#b8c4d6"
  ]
};

const AGE_ORDER = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"];

const formatNumber = value => Number.isFinite(value) ? d3.format(",.0f")(value) : "—";
const formatDecimal = value => Number.isFinite(value) ? d3.format(",.2f")(value) : "—";
const formatPercent = value => Number.isFinite(value) ? d3.format("+.1f")(value) : "—";

function getMetricLabel(metric = appState.metric) {
  return metric === "bed_days" ? "Bed days" : "Cases";
}

let tooltipEl = null;

function initTooltip() {
  if (!tooltipEl) {
    tooltipEl = d3.select("body")
      .append("div")
      .attr("class", "d3-tooltip");
  }
  return tooltipEl;
}

function showTooltip(event, htmlContent) {
  const tip = initTooltip();
  tip.html(htmlContent).style("opacity", 1);
  moveTooltip(event);
}

function moveTooltip(event) {
  if (!tooltipEl) return;
  const pad = 12;
  const x = Math.min(window.innerWidth - 260, event.clientX + pad);
  const y = Math.max(10, Math.min(window.innerHeight - 110, event.clientY - 24));
  tooltipEl.style("left", `${x}px`).style("top", `${y}px`);
}

function hideTooltip() {
  if (!tooltipEl) return;
  tooltipEl.style("opacity", 0);
}

function filterByYear(rows) {
  if (appState.year === "All") return rows;
  return rows.filter(d => String(d.year) === String(appState.year));
}

function getBreakdownRows(kind, applyYear = true) {
  const nationalKeys = { road_user: "roadUserAnnual", age_group: "ageGroupAnnual", sex: "genderAnnual", counterparty: "counterpartyAnnual" };
  const stateKeys = { road_user: "stateRoadUser", age_group: "stateAge", sex: "stateGender", counterparty: "stateCounterparty" };
  const selected = appState.selectedState !== "All";
  return RoadData.filterRows(appState[(selected ? stateKeys : nationalKeys)[kind]], {
    year: applyYear ? appState.year : "All", state: selected ? appState.selectedState : "All"
  });
}

function getFnRows(key, applyYear = true) {
  return RoadData.filterRows(appState[key], { year: applyYear ? appState.year : "All", status: appState.fnStatus });
}

function metricText(row, metric = appState.metric) {
  const value = row[metric];
  if (!Number.isFinite(value) || (value === 0 && (row[metric + "_partial"] || row.suppressed))) return "Suppressed / unavailable";
  return formatNumber(value) + (row[metric + "_partial"] || row.suppressed ? "†" : "");
}

function shareText(value) { return Number.isFinite(value) ? `${value.toFixed(1)}%` : "—"; }

function categoryScopeLabel() { return appState.selectedState === "All" ? "Australia" : appState.selectedState; }

function suppressionNote(rows) {
  const total = RoadData.summarise(rows);
  return total.hospitalisations_partial || total.bed_days_partial
    ? "† Published subtotal: some source values are withheld or missing. Shares and bed days per case are omitted where totals are incomplete."
    : "Shares use the displayed source and period. Bed days per case = total bed days ÷ total cases.";
}

function setChartNote(containerId, message) {
  const card = d3.select("#" + containerId).node()?.closest(".chart-card");
  if (card) d3.select(card).selectAll(".chart-note").data([message]).join("p").attr("class", "chart-note").text(message);
}

function chartWidth(host, preferred = 640) {
  return Math.max(320, Math.min(preferred, host.node()?.getBoundingClientRect().width || preferred));
}
