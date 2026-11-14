// First Nations long-format exports from Data/Cleaned_CSV/first_nation/.
function drawFnCharts() {
  drawFnAnnualChart();
  const scope = appState.fnStatus;
  drawHorizontalCategories("fnRemotenessChart", getFnRows("fnRemoteness"), "remoteness", {
    title: "Remoteness by Indigenous status", scope,
    note: `${scope}. Geographic coverage can differ from the annual table.`
  });
  drawHorizontalCategories("fnRoadUserChart", getFnRows("fnRoadUser"), "road_user", {
    title: "Road users by Indigenous status", scope, color: "#059669", note: scope + "."
  });
  drawVerticalCategories("fnAgeChart", getFnRows("fnAge"), "age_group", {
    title: "Age by Indigenous status", scope, color: COLORS.purple,
    order: ["0-7", "8-16", "17-25", "26-39", "40-64", "65+"], note: scope + ". Age bands differ in width."
  });
  drawHorizontalCategories("fnCounterpartyChart", getFnRows("fnCounterparty"), "counterparty", {
    title: "Counterparty by Indigenous status", scope, note: scope + ". Counterparty does not establish fault."
  });
}

function drawFnAnnualChart() {
  const host = d3.select("#fnAnnualChart");
  host.selectAll("*").remove();
  const metric = appState.metric;
  const statuses = [...new Set(appState.fnAnnual.map(d => d.status))];
  const years = [...new Set(appState.fnAnnual.map(d => d.year))].sort(d3.ascending);
  const colors = { "First Nations people": "#b86509", "Non-Indigenous": COLORS.primary };
  const series = statuses.map(status => ({ status, values: RoadData.filterRows(appState.fnAnnual, { status }) }));
  const width = chartWidth(host, 820), height = 245;
  host.classed("responsive-chart", true).style("min-height", `${height}px`);
  const margin = { top: 18, right: width < 500 ? 12 : 30, bottom: 28, left: width < 500 ? 44 : 58 };
  const w = width - margin.left - margin.right, h = height - margin.top - margin.bottom;
  const svg = host.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "img")
    .attr("aria-label", `${getMetricLabel()} by year for First Nations people and Non-Indigenous Australians`);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const x = d3.scalePoint().domain(years).range([0, w]).padding(0.15);
  const y = d3.scaleLinear().domain([0, (d3.max(appState.fnAnnual, d => d[metric]) || 1) * 1.13]).nice().range([h, 0]);
  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(4).tickSize(-w).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(4).tickFormat(d => d3.format("~s")(d)));
  const line = d3.line().defined(d => Number.isFinite(d[metric])).x(d => x(d.year)).y(d => y(d[metric]));
  for (const item of series) {
    g.append("path").datum(item.values).attr("class", "fn-series").attr("data-status", item.status)
      .attr("fill", "none").attr("stroke", colors[item.status]).attr("stroke-width", 2.5).attr("d", line);
    g.selectAll(null).data(item.values).join("circle").attr("class", "fn-dot bar-interactive")
      .attr("cx", d => x(d.year)).attr("cy", d => y(d[metric]))
      .attr("r", d => String(d.year) === String(appState.year) ? 6 : 4).attr("fill", colors[item.status])
      .on("mouseenter", (event, d) => {
        const sameYear = appState.fnAnnual.filter(row => row.year === d.year);
        showTooltip(event, `<strong>${d.year} · ${getMetricLabel()}</strong>${sameYear.map(row => `${escapeHTML(row.status)}: <b>${metricText(row, metric)}</b>`).join("<br/>")}<br/>Click to select this year.`);
      }).on("mousemove", moveTooltip).on("mouseleave", hideTooltip)
      .on("click", (event, d) => {
        appState.year = String(appState.year) === String(d.year) ? "All" : String(d.year);
        syncFilterControls(); updateDashboard();
      });
  }
  const legend = d3.select("#fnAnnualLegend");
  legend.selectAll("*").remove();
  for (const status of statuses) {
    const item = legend.append("span").attr("class", "legend-item");
    item.append("span").attr("class", "legend-swatch").style("background-color", colors[status]);
    item.append("span").text(status);
  }
  d3.select("#card-fn-annual .metric-badge").text(`${getMetricLabel()} | 2011–2021`);
  setChartNote("fnAnnualChart", "Both reported status groups are shown across all years. Coverage differs from national totals. Bed days exclude deaths in hospital within 30 days.");
}
