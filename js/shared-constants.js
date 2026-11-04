// Shared state, constants, formatters, and tooltip utilities for the D3.js Dashboard
// All data is sourced exclusively from Data/Cleaned_CSV_Files/

const appState = {
  year: "All",
  metric: "hospitalisations", // "hospitalisations" or "bed_days"
  selectedState: "All",
  selectedRoadUser: "All",
  selectedRemoteness: "All",
  selectedSex: "All",

  // Datasets from Data/Cleaned_CSV_Files/
  nationalAnnual: [],     // national_annual.csv
  stateAnnual: [],        // Temporal Trends & State Comparisons.csv
  roadUserAnnual: [],     // road_user_summary.csv
  remotenessAnnual: [],   // remoteness_yearly_trends.csv
  ageGroupAnnual: [],     // age_group_summary.csv
  genderAnnual: [],       // Gender_demographic_summary.csv
  counterpartyAnnual: [], // Counterparty Analysis.csv
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

const formatNumber = d3.format(",.0f");
const formatDecimal = d3.format(",.2f");
const formatPercent = d3.format("+.1f");

function getMetricLabel(metric = appState.metric) {
  return metric === "bed_days" ? "Bed Days" : "Hospitalisations";
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