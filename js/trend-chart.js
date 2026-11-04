// Chart 1: National Annual Trajectory (2011–2021)
// Source: Data/Cleaned_CSV_Files/national_annual.csv

function drawTrendChart() {
  const container = d3.select("#trendChart");
  container.selectAll("*").remove();

  const metric = appState.metric;
  const lineColor = metric === "bed_days" ? COLORS.bedDays : COLORS.primary;

  const series = appState.nationalAnnual.map(d => ({
    year: d.year,
    hospitalisations: d.hospitalisations,
    bed_days: d.bed_days,
    value: d[metric]
  }));

  const width = 500;
  const height = 215;
  const margin = { top: 22, right: 20, bottom: 28, left: 52 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", "natGrad")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "0%").attr("y2", "100%");
  gradient.append("stop").attr("offset", "0%").attr("stop-color", lineColor).attr("stop-opacity", 0.25);
  gradient.append("stop").attr("offset", "100%").attr("stop-color", lineColor).attr("stop-opacity", 0.02);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const years = series.map(d => d.year);
  const x = d3.scalePoint()
    .domain(years)
    .range([0, innerWidth])
    .padding(0.2);

  const minVal = d3.min(series, d => d.value) || 0;
  const maxVal = d3.max(series, d => d.value) || 100;
  const y = d3.scaleLinear()
    .domain([Math.floor(minVal * 0.88), maxVal * 1.08])
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

  // Annotations: 2017 NSW Break & 2020 COVID-19 Dip
  if (x(2017) !== undefined) {
    g.append("line")
      .attr("x1", x(2017)).attr("x2", x(2017))
      .attr("y1", 0).attr("y2", innerHeight)
      .attr("stroke", "#94a3b8").attr("stroke-dasharray", "3,3");
    g.append("text")
      .attr("x", x(2017) + 4).attr("y", 10)
      .attr("fill", "#64748b").attr("font-size", "9.5px")
      .text("2017 NSW Break");
  }

  if (x(2020) !== undefined) {
    g.append("line")
      .attr("x1", x(2020)).attr("x2", x(2020))
      .attr("y1", 0).attr("y2", innerHeight)
      .attr("stroke", "#f59e0b").attr("stroke-dasharray", "3,3");
    g.append("text")
      .attr("x", x(2020) - 4).attr("y", 10)
      .attr("text-anchor", "end")
      .attr("fill", "#b45309").attr("font-size", "9.5px")
      .text("COVID Dip");
  }

  const area = d3.area()
    .x(d => x(d.year))
    .y0(innerHeight)
    .y1(d => y(d.value))
    .curve(d3.curveMonotoneX);

  g.append("path")
    .datum(series)
    .attr("fill", "url(#natGrad)")
    .attr("d", area);

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

  g.append("path")
    .datum(series)
    .attr("fill", "none")
    .attr("stroke", lineColor)
    .attr("stroke-width", 2.4)
    .attr("d", line);

  g.selectAll(".trend-dot")
    .data(series)
    .join("circle")
    .attr("class", "trend-dot bar-interactive")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.value))
    .attr("r", d => String(appState.year) === String(d.year) ? 6.5 : 4.2)
    .attr("fill", d => String(appState.year) === String(d.year) ? COLORS.highlight : "#ffffff")
    .attr("stroke", d => String(appState.year) === String(d.year) ? COLORS.highlight : lineColor)
    .attr("stroke-width", 2.2)
    .on("mouseenter", (event, d) => {
      const alos = d.hospitalisations > 0 ? d.bed_days / d.hospitalisations : 0;
      showTooltip(
        event,
        `<strong>Year ${d.year} (national_annual.csv)</strong>
         Hospitalisations: <b>${formatNumber(d.hospitalisations)}</b><br/>
         Bed Days: <b>${formatNumber(d.bed_days)}</b><br/>
         Avg. Stay: <b>${formatDecimal(alos)} days</b><br/>
         <span style="color:#94a3b8;font-size:10px;">Click to filter year</span>`
      );
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip)
    .on("click", (event, d) => {
      appState.year = String(appState.year) === String(d.year) ? "All" : String(d.year);
      syncFilterControls();
      updateDashboard();
    });

  // Value labels on 2011, 2019, 2020, 2021
  const labelYears = new Set([2011, 2019, 2020, 2021]);
  g.selectAll(".val-lbl")
    .data(series.filter(d => labelYears.has(d.year)))
    .join("text")
    .attr("x", d => x(d.year))
    .attr("y", d => y(d.value) - 8)
    .attr("text-anchor", "middle")
    .attr("fill", "#1e293b")
    .attr("font-size", "9.5px")
    .attr("font-weight", "600")
    .text(d => formatNumber(d.value));
}
