// Chart 5: Age Group & Biological Sex Profile
// Sources: Data/Cleaned_CSV_Files/Age Group Demographics.csv & Gender_demographic_summary.csv

function drawDemographicsChart() {
  const container = d3.select("#demographicsChart");
  container.selectAll("*").remove();

  const metric = appState.metric;
  const ageRows = filterByYear(appState.ageGroupAnnual);
  const sexRows = filterByYear(appState.genderAnnual).filter(d => d.sex === "Male" || d.sex === "Female");

  const ageGrouped = d3.rollup(
    ageRows,
    v => ({
      hospitalisations: d3.sum(v, d => d.hospitalisations),
      bed_days: d3.sum(v, d => d.bed_days)
    }),
    d => d.age_group
  );

  const totalAgeMetric = d3.sum(Array.from(ageGrouped.values()), d => d[metric]) || 1;

  const data = AGE_ORDER.map(age => {
    const counts = ageGrouped.get(age) || { hospitalisations: 0, bed_days: 0 };
    return {
      ageGroup: age,
      hospitalisations: counts.hospitalisations,
      bed_days: counts.bed_days,
      value: counts[metric],
      share: (counts[metric] / totalAgeMetric) * 100
    };
  });

  const width = 500;
  const height = 195;
  const margin = { top: 18, right: 16, bottom: 26, left: 48 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(AGE_ORDER)
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
    .call(d3.axisBottom(x));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(4).tickFormat(d => d >= 1000 ? d3.format("~s")(d) : d));

  g.selectAll(".age-bar")
    .data(data)
    .join("rect")
    .attr("class", "age-bar bar-interactive")
    .attr("x", d => x(d.ageGroup))
    .attr("y", d => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", d => innerHeight - y(d.value))
    .attr("rx", 4)
    .attr("fill", d => d.ageGroup === "40-64" ? "#1d4ed8" : (metric === "bed_days" ? "#0d9488" : "#3b82f6"))
    .on("mouseenter", (event, d) => {
      const alos = d.hospitalisations > 0 ? d.bed_days / d.hospitalisations : 0;
      showTooltip(
        event,
        `<strong>Age Group: ${d.ageGroup} (${appState.year === "All" ? "2011–2021" : appState.year})</strong>
         Cases: <b>${formatNumber(d.hospitalisations)}</b><br/>
         Bed Days: <b>${formatNumber(d.bed_days)}</b><br/>
         Share: <b>${d.share.toFixed(1)}%</b><br/>
         Avg. Stay: <b>${formatDecimal(alos)} days</b>`
      );
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip);

  g.selectAll(".age-lbl")
    .data(data)
    .join("text")
    .attr("x", d => x(d.ageGroup) + x.bandwidth() / 2)
    .attr("y", d => y(d.value) - 4)
    .attr("text-anchor", "middle")
    .attr("fill", "#334155")
    .attr("font-size", "9px")
    .attr("font-weight", "600")
    .text(d => `${d.share.toFixed(1)}%`);

  // Biological Sex Summary in Legend bar (from Gender_demographic_summary.csv)
  const sexTotals = d3.rollup(sexRows, v => d3.sum(v, d => d[metric]), d => d.sex);
  const maleVal = sexTotals.get("Male") || 0;
  const femaleVal = sexTotals.get("Female") || 0;
  const totalSex = (maleVal + femaleVal) || 1;

  const legend = d3.select("#demographicsLegend");
  legend.selectAll("*").remove();

  [
    { label: "Male", val: maleVal, color: COLORS.sex.Male },
    { label: "Female", val: femaleVal, color: COLORS.sex.Female }
  ].forEach(s => {
    const pct = ((s.val / totalSex) * 100).toFixed(1);
    const item = legend.append("span").attr("class", "legend-item");
    item.append("span").attr("class", "legend-swatch").style("background-color", s.color);
    item.append("span").text(`${s.label}: ${formatNumber(s.val)} (${pct}%)`);
  });
}
