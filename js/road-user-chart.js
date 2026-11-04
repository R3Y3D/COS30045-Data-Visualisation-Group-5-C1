// Chart 3: Road User Vulnerability Horizontal Bar Chart
// Source: Data/Cleaned_CSV_Files/road_user_summary.csv

function drawRoadUserChart() {
  const container = d3.select("#roadUserChart");
  container.selectAll("*").remove();

  const metric = appState.metric;
  const rows = filterByYear(appState.roadUserAnnual);

  const grouped = d3.rollup(
    rows,
    v => ({
      hospitalisations: d3.sum(v, d => d.hospitalisations),
      bed_days: d3.sum(v, d => d.bed_days)
    }),
    d => d.road_user
  );

  const totalMetric = d3.sum(Array.from(grouped.values()), d => d[metric]) || 1;

  const data = Array.from(grouped, ([roadUser, counts]) => ({
    roadUser,
    hospitalisations: counts.hospitalisations,
    bed_days: counts.bed_days,
    value: counts[metric],
    share: (counts[metric] / totalMetric) * 100
  }))
    .sort((a, b) => d3.descending(a.value, b.value))
    .slice(0, 7);

  const width = 500;
  const height = 215;
  const margin = { top: 8, right: 86, bottom: 26, left: 138 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const y = d3.scaleBand()
    .domain(data.map(d => d.roadUser))
    .range([0, innerHeight])
    .padding(0.24);

  const x = d3.scaleLinear()
    .domain([0, (d3.max(data, d => d.value) || 100) * 1.08])
    .nice()
    .range([0, innerWidth]);

  g.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(4).tickSize(-innerHeight).tickFormat(""));

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(4).tickFormat(d => d >= 1000 ? d3.format("~s")(d) : d));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0));

  g.selectAll(".ru-bar")
    .data(data)
    .join("rect")
    .attr("class", "ru-bar bar-interactive")
    .attr("x", 0)
    .attr("y", d => y(d.roadUser))
    .attr("width", d => x(d.value))
    .attr("height", y.bandwidth())
    .attr("rx", 3)
    .attr("fill", (d, i) => COLORS.palette[i % COLORS.palette.length])
    .on("mouseenter", (event, d) => {
      const alos = d.hospitalisations > 0 ? d.bed_days / d.hospitalisations : 0;
      showTooltip(
        event,
        `<strong>${d.roadUser} (${appState.year === "All" ? "2011–2021" : appState.year})</strong>
         Hospitalisations: <b>${formatNumber(d.hospitalisations)}</b><br/>
         Bed Days: <b>${formatNumber(d.bed_days)}</b><br/>
         Share: <b>${d.share.toFixed(1)}%</b><br/>
         Avg. Stay: <b>${formatDecimal(alos)} days</b>`
      );
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip);

  g.selectAll(".ru-lbl")
    .data(data)
    .join("text")
    .attr("x", d => x(d.value) + 5)
    .attr("y", d => y(d.roadUser) + y.bandwidth() / 2 + 3.5)
    .attr("fill", "#334155")
    .attr("font-size", "9.5px")
    .attr("font-weight", "600")
    .text(d => `${formatNumber(d.value)} (${d.share.toFixed(1)}%)`);
}
