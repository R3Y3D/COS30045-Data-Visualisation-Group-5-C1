// Overview-only charts: Male vs Female by year (grouped bars) and Average length of stay by year (line)

function drawSexTrendChart() {
  setChartNote("sexTrendChart", "This trend compares Male and Female records. Other source classifications are retained in the Demographics view and sex table.");
  const container = d3.select("#sexTrendChart");
  container.selectAll("*").remove();

  const metric = appState.metric;
  const sexes = ["Male", "Female"];
  const years = appState.nationalAnnual.map(d => d.year);

  const data = years.map(year => {
    const row = { year };
    sexes.forEach(s => {
      row[s] = d3.sum(appState.genderAnnual.filter(d => d.year === year && d.sex === s), d => d[metric]);
    });
    return row;
  });

  const width = chartWidth(container, 640), height = 215;
  const margin = { top: 14, right: 16, bottom: 28, left: 52 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x0 = d3.scaleBand().domain(years).range([0, innerWidth]).padding(0.22);
  const x1 = d3.scaleBand().domain(sexes).range([0, x0.bandwidth()]).padding(0.08);
  const y = d3.scaleLinear()
    .domain([0, (d3.max(data, d => Math.max(d.Male, d.Female)) || 100) * 1.1])
    .nice().range([innerHeight, 0]);

  g.append("g").attr("class", "grid")
    .call(d3.axisLeft(y).ticks(4).tickSize(-innerWidth).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x0).tickFormat(d3.format("d")));
  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).ticks(4).tickFormat(d => d >= 1000 ? d3.format("~s")(d) : d));

  const groups = g.selectAll(".sx-group").data(data).join("g")
    .attr("class", "sx-group")
    .attr("transform", d => `translate(${x0(d.year)},0)`);

  groups.selectAll("rect")
    .data(d => sexes.map(s => ({ sex: s, value: d[s], year: d.year, male: d.Male, female: d.Female })))
    .join("rect")
    .attr("class", "bar-interactive")
    .attr("x", d => x1(d.sex))
    .attr("y", d => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", d => innerHeight - y(d.value))
    .attr("rx", 2)
    .attr("fill", d => COLORS.sex[d.sex])
    .attr("opacity", d => appState.year === "All" || String(appState.year) === String(d.year) ? 1 : 0.3)
    .on("mouseenter", (event, d) => {
      const total = d.male + d.female || 1;
      showTooltip(
        event,
        `<strong>${d.year}</strong>
         Male: <b>${formatNumber(d.male)}</b> (${((d.male / total) * 100).toFixed(1)}%)<br/>
         Female: <b>${formatNumber(d.female)}</b> (${((d.female / total) * 100).toFixed(1)}%)<br/>
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

  const legend = d3.select("#sexTrendLegend");
  legend.selectAll("*").remove();
  sexes.forEach(s => {
    const total = d3.sum(data, d => d[s]);
    const item = legend.append("span").attr("class", "legend-item");
    item.append("span").attr("class", "legend-swatch").style("background-color", COLORS.sex[s]);
    item.append("span").text(`${s}: ${formatNumber(total)}`);
  });
}

function drawAlosChart() {
  const container = d3.select("#alosChart");
  container.selectAll("*").remove();

  const series = appState.nationalAnnual.map(d => ({
    year: d.year,
    hospitalisations: d.hospitalisations,
    bed_days: d.bed_days,
    value: d.hospitalisations > 0 ? d.bed_days / d.hospitalisations : 0
  }));
  const totalH = d3.sum(series, d => d.hospitalisations) || 1;
  const avg = d3.sum(series, d => d.bed_days) / totalH;

  const width = chartWidth(container, 640), height = 215;
  const margin = { top: 20, right: 20, bottom: 28, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scalePoint().domain(series.map(d => d.year)).range([0, innerWidth]).padding(0.2);
  const y = d3.scaleLinear()
    .domain([Math.floor((d3.min(series, d => d.value) || 0) - 0.4), Math.ceil((d3.max(series, d => d.value) || 6) + 0.2)])
    .range([innerHeight, 0]);

  g.append("g").attr("class", "grid")
    .call(d3.axisLeft(y).ticks(4).tickSize(-innerWidth).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(4));

  // 11-year average reference line
  g.append("line")
    .attr("x1", 0).attr("x2", innerWidth).attr("y1", y(avg)).attr("y2", y(avg))
    .attr("stroke", COLORS.purple).attr("stroke-dasharray", "4,3").attr("stroke-opacity", 0.7);
  g.append("text")
    .attr("x", innerWidth).attr("y", y(avg) - 4).attr("text-anchor", "end")
    .attr("fill", COLORS.purple).attr("font-size", "9px")
    .text(`11-yr avg ${formatDecimal(avg)}`);

  const line = d3.line().x(d => x(d.year)).y(d => y(d.value)).curve(d3.curveMonotoneX);
  g.append("path").datum(series)
    .attr("fill", "none").attr("stroke", COLORS.bedDays).attr("stroke-width", 2.4).attr("d", line);

  g.selectAll(".alos-dot").data(series).join("circle")
    .attr("class", "alos-dot bar-interactive")
    .attr("cx", d => x(d.year)).attr("cy", d => y(d.value))
    .attr("r", d => String(appState.year) === String(d.year) ? 6 : 4)
    .attr("fill", d => String(appState.year) === String(d.year) ? COLORS.highlight : "#fff")
    .attr("stroke", d => String(appState.year) === String(d.year) ? COLORS.highlight : COLORS.bedDays)
    .attr("stroke-width", 2.2)
    .on("mouseenter", (event, d) => {
      showTooltip(
        event,
        `<strong>Year ${d.year}</strong>
         Bed days per case: <b>${formatDecimal(d.value)}</b><br/>
         Hospitalisations: <b>${formatNumber(d.hospitalisations)}</b><br/>
         Bed days: <b>${formatNumber(d.bed_days)}</b><br/>
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

  const labelYears = new Set([2011, 2014, 2016, 2019, 2021]);
  g.selectAll(".alos-lbl").data(series.filter(d => labelYears.has(d.year))).join("text")
    .attr("x", d => x(d.year)).attr("y", d => y(d.value) - 9)
    .attr("text-anchor", "middle").attr("fill", "#1e293b")
    .attr("font-size", "9px").attr("font-weight", "600")
    .text(d => formatDecimal(d.value));
}
