function drawStateChart() {
  setChartNote("stateChart", "Jurisdiction cases and bed days exclude deaths in hospital within 30 days. National and jurisdiction totals use different source coverage.");
  const container = d3.select("#stateChart");
  container.selectAll("*").remove();

  const metric = appState.metric;
  const rows = filterByYear(appState.stateAnnual);

  const grouped = d3.rollup(
    rows,
    v => ({
      hospitalisations: d3.sum(v, d => d.hospitalisations),
      bed_days: d3.sum(v, d => d.bed_days)
    }),
    d => d.state
  );

  const totalMetric = d3.sum(Array.from(grouped.values()), d => d[metric]) || 1;

  const data = Array.from(grouped, ([state, counts]) => ({
    state,
    hospitalisations: counts.hospitalisations,
    bed_days: counts.bed_days,
    value: counts[metric],
    share: (counts[metric] / totalMetric) * 100
  })).sort((a, b) => d3.descending(a.value, b.value));

  const width = chartWidth(container, 640);
  const height = 215;
  const margin = { top: 20, right: 16, bottom: 28, left: 48 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.state))
    .range([0, innerWidth])
    .padding(0.28);

  const y = d3.scaleLinear()
    .domain([0, (d3.max(data, d => d.value) || 100) * 1.15])
    .nice()
    .range([innerHeight, 0]);

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(4).tickSize(-innerWidth).tickFormat(""));

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-weight", d => appState.selectedState === d ? "700" : "500");

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(4).tickFormat(d => d >= 1000 ? d3.format("~s")(d) : d));

  g.selectAll(".state-bar")
    .data(data)
    .join("rect")
    .attr("class", "state-bar bar-interactive")
    .attr("x", d => x(d.state))
    .attr("y", d => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", d => innerHeight - y(d.value))
    .attr("rx", 4)
    .attr("fill", d => {
      if (appState.selectedState !== "All") {
        return appState.selectedState === d.state ? COLORS.highlight : "#cbd5e1";
      }
      return COLORS.statePalette[d.state] || COLORS.primary;
    })
    .on("mouseenter", (event, d) => {
      const alos = d.hospitalisations > 0 ? d.bed_days / d.hospitalisations : 0;
      showTooltip(
        event,
        `<strong>Jurisdiction: ${d.state} (${appState.year === "All" ? "2011–2021" : appState.year})</strong>
         Cases: <b>${formatNumber(d.hospitalisations)}</b><br/>
         Bed Days: <b>${formatNumber(d.bed_days)}</b><br/>
         Share: <b>${d.share.toFixed(1)}%</b><br/>
         Bed days per case: <b>${formatDecimal(alos)}</b><br/>
         <span style="color:#94a3b8;font-size:10px;">Click to highlight state</span>`
      );
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip)
    .on("click", (event, d) => {
      appState.selectedState = appState.selectedState === d.state ? "All" : d.state;
      syncFilterControls();
      updateDashboard();
    });

  g.selectAll(".state-lbl")
    .data(data)
    .join("text")
    .attr("x", d => x(d.state) + x.bandwidth() / 2)
    .attr("y", d => y(d.value) - 5)
    .attr("text-anchor", "middle")
    .attr("fill", "#334155")
    .attr("font-size", "9.5px")
    .attr("font-weight", "600")
    .text(d => `${d.share.toFixed(1)}%`);
}
