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
  counterpartyAnnual: []  // Counterparty Analysis.csv
};

const COLORS = {
  primary: "#2563eb",
  bedDays: "#0d9488",
  highlight: "#e11d48",
  amber: "#d97706",
  purple: "#7c3aed",
  slate: "#64748b",
  remoteness: {
    "Major Cities": "#2563eb",
    "Regional": "#0d9488",
    "Remote": "#d97706",
    "Missing": "#94a3b8"
  },
  sex: {
    "Male": "#2563eb",
    "Female": "#e11d48"
  },
  statePalette: {
    "NSW": "#1d4ed8",
    "Vic": "#0d9488",
    "Qld": "#d97706",
    "WA": "#7c3aed",
    "SA": "#0284c7",
    "Tas": "#059669",
    "NT": "#e11d48",
    "ACT": "#4f46e5"
  },
  palette: [
    "#1d4ed8", "#2563eb", "#0d9488", "#0284c7",
    "#d97706", "#7c3aed", "#4f46e5", "#059669",
    "#e11d48", "#475569", "#64748b", "#94a3b8"
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
