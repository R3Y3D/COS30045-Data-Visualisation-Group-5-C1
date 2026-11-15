const SHORT_LABELS = {
  "Car driver, passenger or unknown position": "Car occupants",
  "Heavy transport driver, passenger or unknown position": "Heavy transport occupants",
  "Pick-up truck or van occupant": "Pick-up / van occupants",
  "Car, pick-up truck or van": "Car / pick-up / van",
  "Non-collision transport accident": "Non-collision accident",
  "Fixed or stationary object": "Fixed / stationary object",
  "Other and unspecified transport accidents": "Other / unspecified",
  "2- or 3- wheeled motor vehicle": "2- / 3-wheel motor",
  "intersex or indeterminate or missing": "Intersex / indeterminate / missing"
};
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function visibleMetric(row, metric = appState.metric) {
  return row[metric + "_partial"] && row[metric] === 0 ? null : row[metric];
}
function categoryTooltip(row, scope) {
  return `<strong>${escapeHTML(row.label)} · ${escapeHTML(scope)}</strong>
    Cases: <b>${metricText(row, "hospitalisations")}</b><br/>
    Bed days: <b>${metricText(row, "bed_days")}</b><br/>
    Share: <b>${shareText(row.share)}</b><br/>
    Bed days per case: <b>${formatDecimal(row.alos)}</b>
    ${row.hospitalisations_partial || row.bed_days_partial ? "<br/>† Published subtotal; some source values are withheld or missing." : ""}`;
}
function drawHorizontalCategories(id, rows, key, options = {}) {
  const host = d3.select("#" + id);
  host.selectAll("*").remove();
  const data = RoadData.categoryRows(rows, key, appState.metric)
    .sort((a, b) => (visibleMetric(b) ?? -1) - (visibleMetric(a) ?? -1))
    .slice(0, options.limit || Infinity);
  const width = chartWidth(host), height = Math.max(235, data.length * 30 + 46);
  const margin = { top: 8, right: width < 500 ? 112 : 122, bottom: 28, left: width < 500 ? 125 : 195 };
  const w = width - margin.left - margin.right, h = height - margin.top - margin.bottom;
  host.classed("responsive-chart", true).style("min-height", `${height}px`);
  const svg = host.append("svg").attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img").attr("aria-label", `${options.title || key}: ${getMetricLabel()}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const y = d3.scaleBand().domain(data.map(d => d.label)).range([0, h]).padding(0.23);
  const x = d3.scaleLinear().domain([0, (d3.max(data, d => visibleMetric(d)) || 1) * 1.08]).nice().range([0, w]);
  g.append("g").attr("class", "grid").attr("transform", `translate(0,${h})`)
    .call(d3.axisBottom(x).ticks(4).tickSize(-h).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`)
    .call(d3.axisBottom(x).ticks(4).tickFormat(d => d3.format("~s")(d)));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).tickSize(0).tickFormat(d => SHORT_LABELS[d] || d));
  const color = (d, i) => options.color || COLORS.palette[i % COLORS.palette.length];
  g.selectAll(".category-bar").data(data.filter(d => Number.isFinite(visibleMetric(d)))).join("rect")
    .attr("class", `category-bar bar-interactive ${options.barClass || ""}`)
    .attr("x", 0).attr("y", d => y(d.label)).attr("width", d => x(visibleMetric(d))).attr("height", y.bandwidth())
    .attr("rx", 3).attr("fill", color)
    .attr("stroke", d => d[appState.metric + "_partial"] ? COLORS.amber : "none")
    .attr("stroke-dasharray", d => d[appState.metric + "_partial"] ? "3,2" : null)
    .on("mouseenter", (event, d) => showTooltip(event, categoryTooltip(d, options.scope || categoryScopeLabel())))
    .on("mousemove", moveTooltip).on("mouseleave", hideTooltip)
    .append("title").text(d => `${d.label}: ${metricText(d)}`);
  g.selectAll(".category-label").data(data).join("text").attr("class", "category-label bar-interactive")
    .attr("x", d => Number.isFinite(visibleMetric(d)) ? x(visibleMetric(d)) + 5 : 5)
    .attr("y", d => y(d.label) + y.bandwidth() / 2 + 4).attr("fill", "#334155").attr("font-size", 11)
    .text(d => !Number.isFinite(visibleMetric(d)) ? "Suppressed" : `${metricText(d)}${Number.isFinite(d.share) ? ` (${shareText(d.share)})` : ""}`)
    .on("mouseenter", (event, d) => showTooltip(event, categoryTooltip(d, options.scope || categoryScopeLabel())))
    .on("mousemove", moveTooltip).on("mouseleave", hideTooltip);
  setChartNote(id, [options.note, suppressionNote(rows)].filter(Boolean).join(" "));
}
function drawVerticalCategories(id, rows, key, options = {}) {
  const host = d3.select("#" + id);
  host.selectAll("*").remove();
  const groups = RoadData.categoryRows(rows, key, appState.metric);
  const order = options.order || AGE_ORDER;
  const data = groups.sort((a, b) => {
    const ai = order.indexOf(a.label), bi = order.indexOf(b.label);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  const width = chartWidth(host, 560), height = 235;
  host.classed("responsive-chart", true).style("min-height", `${height}px`);
  const margin = { top: 24, right: 18, bottom: 28, left: 54 };
  const w = width - margin.left - margin.right, h = height - margin.top - margin.bottom;
  const svg = host.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "img")
    .attr("aria-label", `${options.title || "Age groups"}: ${getMetricLabel()}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const x = d3.scaleBand().domain(data.map(d => d.label)).range([0, w]).padding(0.27);
  const y = d3.scaleLinear().domain([0, (d3.max(data, d => visibleMetric(d)) || 1) * 1.15]).nice().range([h, 0]);
  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(4).tickSize(-w).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(4).tickFormat(d => d3.format("~s")(d)));
  g.selectAll(".age-bar").data(data.filter(d => Number.isFinite(visibleMetric(d)))).join("rect")
    .attr("class", "age-bar bar-interactive").attr("x", d => x(d.label)).attr("y", d => y(visibleMetric(d)))
    .attr("width", x.bandwidth()).attr("height", d => h - y(visibleMetric(d))).attr("rx", 3)
    .attr("fill", d => options.color || (d.label === "40-64" ? COLORS.primary : COLORS.sky))
    .attr("stroke", d => d[appState.metric + "_partial"] ? COLORS.amber : "none")
    .attr("stroke-dasharray", d => d[appState.metric + "_partial"] ? "3,2" : null)
    .on("mouseenter", (event, d) => showTooltip(event, categoryTooltip(d, options.scope || categoryScopeLabel())))
    .on("mousemove", moveTooltip).on("mouseleave", hideTooltip);
  g.selectAll(".age-label").data(data).join("text").attr("class", "age-label bar-interactive")
    .attr("x", d => x(d.label) + x.bandwidth() / 2).attr("y", d => Number.isFinite(visibleMetric(d)) ? y(visibleMetric(d)) - 6 : h - 6)
    .attr("text-anchor", "middle").attr("font-size", 9).attr("fill", "#334155")
    .text(d => !Number.isFinite(visibleMetric(d)) ? "Withheld" : Number.isFinite(d.share) ? shareText(d.share) : metricText(d))
    .on("mouseenter", (event, d) => showTooltip(event, categoryTooltip(d, options.scope || categoryScopeLabel())))
    .on("mousemove", moveTooltip).on("mouseleave", hideTooltip);
  setChartNote(id, [options.note, suppressionNote(rows)].filter(Boolean).join(" "));
}
