// D3 Visualisations for First Nations Hospitalised Injury Datasets

function drawFnCharts() {
  drawFnAnnualChart();
  drawFnRemotenessChart();
  drawFnRoadUserChart();
  drawFnAgeChart();
}

// 1. Line Plot: First Nations vs Non-Indigenous Annual Trends
function drawFnAnnualChart() {
  const container = d3.select("#fnAnnualChart");
  container.selectAll("*").remove();
  if (!appState.fnAnnual || !appState.fnAnnual.length) return;

  const width = 500, height = 215;
  const margin = { top: 14, right: 18, bottom: 26, left: 48 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const data = appState.fnAnnual.map(d => ({
    year: +d["Calendar year"],
    fn: +d["First Nations peoples"],
    nonFn: +d["Non-Indigenous Australians"]
  }));

  const x = d3.scalePoint().domain(data.map(d => d.year)).range([0, innerWidth]).padding(0.15);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.fn) * 1.15]).range([innerHeight, 0]);

  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(4).tickSize(-innerWidth).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(4));

  const line = d3.line().x(d => x(d.year)).y(d => y(d.fn)).curve(d3.curveMonotoneX);

  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#d97706")
    .attr("stroke-width", 2.4)
    .attr("d", line);

  g.selectAll(".fn-dot")
    .data(data)
    .join("circle")
    .attr("class", "bar-interactive")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.fn))
    .attr("r", 4)
    .attr("fill", "#d97706")
    .on("mouseenter", (event, d) => {
      showTooltip(
        event,
        `<strong>First Nations Hospitalisations (${d.year})</strong><br/>
         Count: <b>${formatNumber(d.fn)}</b><br/>
         Non-Indigenous: <b>${formatNumber(d.nonFn)}</b>`
      );
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip);
}

// 2. Bar Chart: First Nations Remoteness (Respects Year Filter)
function drawFnRemotenessChart() {
  const container = d3.select("#fnRemotenessChart");
  container.selectAll("*").remove();
  if (!appState.fnRemoteness || !appState.fnRemoteness.length) return;

  const rows = appState.fnRemoteness.filter(d => 
    d.Indigenous_status === "First Nations" && 
    (appState.year === "All" || String(d["Calendar year"]) === String(appState.year))
  );

  const totals = {
    "Major Cities": d3.sum(rows, d => +d["Major Cities"] || 0),
    "Regional": d3.sum(rows, d => +d["Regional"] || 0),
    "Remote": d3.sum(rows, d => +d["Remote"] || 0)
  };

  const data = Object.entries(totals).map(([remoteness, value]) => ({ remoteness, value }));

  const width = 500, height = 215;
  const margin = { top: 18, right: 16, bottom: 26, left: 48 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(data.map(d => d.remoteness)).range([0, innerWidth]).padding(0.3);
  const y = d3.scaleLinear().domain([0, (d3.max(data, d => d.value) || 10) * 1.15]).range([innerHeight, 0]);

  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(4).tickSize(-innerWidth).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(4).tickFormat(d => d3.format("~s")(d)));

  g.selectAll(".fn-rem-bar")
    .data(data)
    .join("rect")
    .attr("class", "bar-interactive")
    .attr("x", d => x(d.remoteness))
    .attr("y", d => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", d => innerHeight - y(d.value))
    .attr("rx", 3)
    .attr("fill", d => COLORS.remoteness[d.remoteness] || "#d97706")
    .on("mouseenter", (event, d) => {
      showTooltip(event, `<strong>${d.remoteness} (${appState.year === "All" ? "2011–2021" : appState.year})</strong><br/>Cases: <b>${formatNumber(d.value)}</b>`);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip);
}

// 3. Horizontal Bar Chart: First Nations Road Users (Respects Year & Indigenous Filter)
function drawFnRoadUserChart() {
  const container = d3.select("#fnRoadUserChart");
  container.selectAll("*").remove();
  if (!appState.fnRoadUser || !appState.fnRoadUser.length) return;

  const filteredRows = appState.fnRoadUser.filter(d => 
    d.Indigenous_status === "First Nations" &&
    (appState.year === "All" || String(d["Calendar year"]) === String(appState.year))
  );

  const categories = [
    "Car driver, passenger or unknown position",
    "Motorcyclist",
    "Pedal cyclist",
    "Pedestrian"
  ];

  const data = categories.map(cat => ({
    roadUser: cat,
    value: d3.sum(filteredRows, d => +d[cat] || 0)
  })).sort((a, b) => d3.descending(a.value, b.value));

  const width = 500, height = 215;
  const margin = { top: 10, right: 60, bottom: 26, left: 160 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const y = d3.scaleBand().domain(data.map(d => d.roadUser)).range([0, innerHeight]).padding(0.25);
  const x = d3.scaleLinear().domain([0, (d3.max(data, d => d.value) || 10) * 1.12]).range([0, innerWidth]);

  g.append("g").attr("class", "grid").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(4).tickSize(-innerHeight).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(4));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).tickSize(0));

  g.selectAll(".fn-ru-bar")
    .data(data)
    .join("rect")
    .attr("class", "bar-interactive")
    .attr("x", 0)
    .attr("y", d => y(d.roadUser))
    .attr("width", d => x(d.value))
    .attr("height", y.bandwidth())
    .attr("rx", 3)
    .attr("fill", "#059669")
    .on("mouseenter", (event, d) => {
      showTooltip(event, `<strong>${d.roadUser} (${appState.year === "All" ? "2011–2021" : appState.year})</strong><br/>Cases: <b>${formatNumber(d.value)}</b>`);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip);
}

// 4. Vertical Bar Chart: First Nations Age Groups (Respects Year & Indigenous Filter)
function drawFnAgeChart() {
  const container = d3.select("#fnAgeChart");
  container.selectAll("*").remove();
  if (!appState.fnAge || !appState.fnAge.length) return;

  const filteredRows = appState.fnAge.filter(d => 
    d.Indigenous_status === "First Nations" &&
    (appState.year === "All" || String(d["Calendar year"]) === String(appState.year))
  );

  const ageCols = ["0-7", "8-16", "17-25", "26-39", "40-64", "65+"];
  const data = ageCols.map(age => ({
    ageGroup: age,
    value: d3.sum(filteredRows, d => +d[age] || 0)
  }));

  const width = 500, height = 215;
  const margin = { top: 18, right: 16, bottom: 26, left: 48 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(data.map(d => d.ageGroup)).range([0, innerWidth]).padding(0.28);
  const y = d3.scaleLinear().domain([0, (d3.max(data, d => d.value) * 1.15) || 10]).range([innerHeight, 0]);

  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(4).tickSize(-innerWidth).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(4));

  g.selectAll(".fn-age-bar")
    .data(data)
    .join("rect")
    .attr("class", "bar-interactive")
    .attr("x", d => x(d.ageGroup))
    .attr("y", d => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", d => innerHeight - y(d.value))
    .attr("rx", 3)
    .attr("fill", "#7c3aed")
    .on("mouseenter", (event, d) => {
      showTooltip(event, `<strong>Age ${d.ageGroup} (${appState.year === "All" ? "2011–2021" : appState.year})</strong><br/>Cases: <b>${formatNumber(d.value)}</b>`);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip);
}