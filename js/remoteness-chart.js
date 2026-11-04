// Chart 4: ABS Remoteness Area Trends (Major Cities, Regional, Remote)
// Source: Data/Cleaned_CSV_Files/remoteness_yearly_trends.csv

function drawRemotenessChart() {
  const container = d3.select("#remotenessChart");
  container.selectAll("*").remove();

  const categories = ["Major Cities", "Regional", "Remote"];
  const years = d3.range(2011, 2022);

  const nested = d3.rollup(
    appState.remotenessAnnual.filter(d => categories.includes(d.remoteness)),
    v => ({
      hospitalisations: d3.sum(v, d => d.hospitalisations),
      died_bed_days: d3.sum(v, d => d.died_bed_days)
    }),
    d => d.remoteness,
    d => d.year
  );

  const seriesList = categories.map(cat => {
    const yearMap = nested.get(cat) || new Map();
    const values = years.map(y => {
      const rec = yearMap.get(y) || { hospitalisations: 0, died_bed_days: 0 };
      return {
        year: y,
        remoteness: cat,
        hospitalisations: rec.hospitalisations,
        died_bed_days: rec.died_bed_days,
        value: rec.hospitalisations
      };
    });
    const scopedVals = appState.year === "All" ? values : values.filter(v => String(v.year) === String(appState.year));
    const total = d3.sum(scopedVals, d => d.value);
    return { category: cat, values, total };
  });

  const grandTotal = d3.sum(seriesList, s => s.total) || 1;

  const width = 500;
  const height = 195;
  const margin = { top: 14, right: 18, bottom: 26, left: 48 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scalePoint()
    .domain(years)
    .range([0, innerWidth])
    .padding(0.15);

  const maxY = d3.max(seriesList, s => d3.max(s.values, d => d.value)) || 100;
  const y = d3.scaleLinear()
    .domain([0, maxY * 1.12])
    .nice()
    .range([innerHeight, 0]);

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(4).tickSize(-innerWidth).tickFormat(""));

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(4).tickFormat(d => d >= 1000 ? d3.format("~s")(d) : d));

  // Highlight selected year vertical guide if active
  if (appState.year !== "All" && x(+appState.year) !== undefined) {
    g.append("line")
      .attr("x1", x(+appState.year)).attr("x2", x(+appState.year))
      .attr("y1", 0).attr("y2", innerHeight)
      .attr("stroke", COLORS.highlight)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,3");
  }

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

  seriesList.forEach(s => {
    const color = COLORS.remoteness[s.category];
    const dimmed = appState.selectedRemoteness !== "All" && appState.selectedRemoteness !== s.category;

    g.append("path")
      .datum(s.values)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", dimmed ? 1.4 : 2.3)
      .attr("stroke-opacity", dimmed ? 0.25 : 1)
      .attr("d", line);

    g.selectAll(`.rem-dot-${s.category.replace(/\s+/g, "")}`)
      .data(s.values)
      .join("circle")
      .attr("class", "bar-interactive")
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.value))
      .attr("r", d => String(appState.year) === String(d.year) ? 5.2 : 3.5)
      .attr("fill", color)
      .attr("opacity", dimmed ? 0.25 : 1)
      .on("mouseenter", (event, d) => {
        showTooltip(
          event,
          `<strong>${d.remoteness} (${d.year})</strong>
           Hospitalisations: <b>${formatNumber(d.hospitalisations)}</b><br/>
           Died Bed Days: <b>${formatNumber(d.died_bed_days)}</b>`
        );
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", hideTooltip)
      .on("click", (event, d) => {
        appState.year = String(appState.year) === String(d.year) ? "All" : String(d.year);
        syncFilterControls();
        updateDashboard();
      });
  });

  const legend = d3.select("#remotenessLegend");
  legend.selectAll("*").remove();

  seriesList.forEach(s => {
    const share = ((s.total / grandTotal) * 100).toFixed(1);
    const item = legend.append("span")
      .attr("class", "legend-item")
      .style("font-weight", appState.selectedRemoteness === s.category ? "700" : "400")
      .on("click", () => {
        appState.selectedRemoteness = appState.selectedRemoteness === s.category ? "All" : s.category;
        drawRemotenessChart();
      });

    item.append("span")
      .attr("class", "legend-swatch")
      .style("background-color", COLORS.remoteness[s.category]);

    item.append("span")
      .text(`${s.category}: ${formatNumber(s.total)} (${share}%)`);
  });
}
