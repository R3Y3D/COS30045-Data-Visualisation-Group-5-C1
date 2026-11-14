(() => {
  "use strict";

  const DATA_URL = "Data\\Cleaned_CSV\\hospitilisation\\national_annual.csv";
  const state = { rows: [], metric: "cases", year: null }; // year === null means "all years"
  const entrance = createEntranceController(1200);
  const pct = d3.format("+.1f");
  const metricName = m => (m === "bed_days" ? "Bed days" : "Hospitalisations");
  const set = (sel, text) => d3.select(sel).text(text);

  // ---------- Data loading ----------
  d3.csv(DATA_URL, d3.autoType)
    .then(rows => {
      state.rows = rows.filter(d => Number.isFinite(d.year)).sort((a, b) => a.year - b.year);
      if (!state.rows.length) throw new Error("no rows in file");
      bindControls();
      initThemeToggle();
      initChartExpand();
      renderAll();
      // Redraw the charts when their boxes change size (window resize / expand)
      const ro = new ResizeObserver(() => {
        if (entrance.shouldSkipResize()) return;
        drawCharts();
      });
      ["#trendChart", "#stayChart"].forEach(s => ro.observe(document.querySelector(s)));
      window.addEventListener("themechange", drawCharts);
    })
    .catch(err => {
      console.error(err);
      d3.selectAll(".svg-container").html(`<p class="chart-error">Could not load ${DATA_URL}. Check the file path.</p>`);
      set("#headline", "Data not available");
    });

  // ---------- Interaction ----------
  function bindControls() {
    d3.select("#btnCases").on("click", () => setMetric("cases"));
    d3.select("#btnBeds").on("click", () => setMetric("bed_days"));
  }

  function setMetric(m) {
    state.metric = m;
    d3.select("#btnCases").attr("aria-pressed", m === "cases");
    d3.select("#btnBeds").attr("aria-pressed", m === "bed_days");
    renderAll();
  }

  function selectYear(year) {
    state.year = state.year === year ? null : year; // same year again clears the selection
    renderAll();
  }

  // Keyboard support: Enter or Space selects the focused mark
  const onKey = (event, d) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectYear(d.year); }
  };

  // ---------- Text and KPIs ----------
  function renderText() {
    const rs = state.rows, first = rs[0], last = rs[rs.length - 1], key = state.metric;
    const scope = state.year === null ? rs : rs.filter(d => d.year === state.year);
    const cases = d3.sum(scope, d => d.cases), beds = d3.sum(scope, d => d.bed_days);
    const stay = cases ? beds / cases : 0;
    const change = (last[key] / first[key] - 1) * 100;

    set("#kpiCases", formatNumber(cases));
    set("#kpiCasesSub", state.year === null ? `${first.year}–${last.year} total` : `in ${state.year}`);
    set("#kpiChange", `${pct(change)}%`);
    set("#kpiChangeSub", `${formatNumber(first[key])} → ${formatNumber(last[key])} ${metricName(key).toLowerCase()}`);
    set("#kpiStay", `${formatDecimal(stay)} days`);
    set("#kpiStaySub", state.year === null ? "all years" : `in ${state.year}`);
    set("#trendTitle", `${metricName(key)} per year`);

    if (state.year === null) {
      const shortest = d3.least(rs, d => d.bed_days_per_case);
      const casesChange = (last.cases / first.cases - 1) * 100;
      set("#headline", `Road crash hospitalisations rose ${pct(casesChange)}% in ten years`);
      set("#subline",
        `From ${formatNumber(first.cases)} in ${first.year} to ${formatNumber(last.cases)} in ${last.year}. ` +
        `Stays are longer too: the average admission lasted ${formatDecimal(shortest.bed_days_per_case)} days in ${shortest.year} ` +
        `and ${formatDecimal(last.bed_days_per_case)} days in ${last.year}.`);
    } else {
      set("#headline", `${state.year}: ${formatNumber(cases)} hospitalisations`);
      set("#subline", `${formatNumber(beds)} bed days, ${formatDecimal(stay)} days per admission. Select the same year again to see all years.`);
    }
  }

  const renderAll = () => { renderText(); drawCharts(); };
  function drawCharts() {
    const animate = entrance.beginDraw(["#trendChart", "#stayChart"]);
    drawTrend(animate);
    drawStay(animate);
  }

  const boxSize = host => {
    const r = host.node().getBoundingClientRect();
    return { w: Math.floor(r.width), h: Math.floor(r.height) };
  };

  // ---------- Chart 1: bars per year, with the 2020 dip annotated ----------
  function drawTrend(animate = false) {
    const host = d3.select("#trendChart");
    const { w, h } = boxSize(host);
    host.selectAll("*").remove();
    if (w < 80 || h < 80) return;

    const key = state.metric, rows = state.rows;
    const m = { top: 26, right: 14, bottom: 26, left: 50 };
    const iw = w - m.left - m.right, ih = h - m.top - m.bottom;

    const svg = host.append("svg").attr("viewBox", `0 0 ${w} ${h}`)
      .attr("role", "img").attr("aria-label", `Bar chart of ${metricName(key).toLowerCase()} per year, ${rows[0].year} to ${rows[rows.length - 1].year}`);
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    const x = d3.scaleBand(rows.map(d => d.year), [0, iw]).padding(0.28);
    const y = d3.scaleLinear([0, d3.max(rows, d => d[key]) * 1.1], [ih, 0]).nice();

    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(4).tickSize(-iw).tickFormat(""));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(4).tickFormat(d => d3.format("~s")(d)));

    // Annotation: change from 2019 to 2020 (computed from the data, not typed in)
    const a = rows.find(d => d.year === 2019), b = rows.find(d => d.year === 2020);
    if (a && b) {
      const cx = x(2020) + x.bandwidth() / 2;
      g.append("line").attr("x1", cx).attr("x2", cx).attr("y1", -4).attr("y2", ih)
        .attr("stroke", COLORS.amber).attr("stroke-dasharray", "3,3");
      g.append("text").attr("x", cx - 5).attr("y", -9).attr("text-anchor", "end")
        .attr("fill", themeWarn()).attr("font-size", "10px").attr("font-weight", "600")
        .text(`2020: ${pct((b[key] / a[key] - 1) * 100)}% vs 2019 (COVID-19 period)`);
    }

    g.selectAll("rect.bar").data(rows).join("rect")
      .attr("class", "bar bar-interactive")
      .attr("x", d => x(d.year)).attr("y", ih).attr("width", x.bandwidth()).attr("height", 0).attr("rx", 3)
      .attr("fill", d => state.year === null ? (key === "bed_days" ? COLORS.bedDays : COLORS.primary)
        : (state.year === d.year ? COLORS.highlight : COLORS.sky))
      .attr("tabindex", 0).attr("role", "button")
      .attr("aria-label", d => `${d.year}: ${formatNumber(d[key])} ${metricName(key).toLowerCase()}. Select to focus on this year.`)
      .on("mouseenter focus", (event, d) => showTooltip(event.type === "focus" ? fakeEvent(event.target) : event,
        `<strong>${d.year}</strong>Hospitalisations: <b>${formatNumber(d.cases)}</b><br/>Bed days: <b>${formatNumber(d.bed_days)}</b><br/>` +
        `Stay per admission: <b>${formatDecimal(d.bed_days_per_case)} days</b>`))
      .on("mousemove", moveTooltip).on("mouseleave blur", hideTooltip)
      .on("click", (event, d) => selectYear(d.year))
      .on("keydown", onKey);

    if (animate) {
      g.selectAll("rect.bar")
        .transition().duration(animDuration(true, 650)).delay((_, i) => 80 + animDelay(true, 45) * i).ease(d3.easeCubicOut)
        .attr("y", d => y(d[key])).attr("height", d => ih - y(d[key]));
    } else {
      g.selectAll("rect.bar")
        .attr("y", d => y(d[key])).attr("height", d => ih - y(d[key]));
    }

    if (iw > 520) {
      const vals = g.selectAll("text.val").data(rows).join("text").attr("class", "val")
        .attr("x", d => x(d.year) + x.bandwidth() / 2).attr("y", d => y(d[key]) - 4)
        .attr("text-anchor", "middle").attr("fill", themeInk()).attr("font-size", "11px").attr("font-weight", "600")
        .attr("opacity", animate ? 0 : 1).text(d => formatNumber(d[key]));
      if (animate) {
        vals.transition().duration(animDuration(true, 400)).delay(animDuration(true, 320))
          .attr("opacity", 1);
      }
    }
  }

  // Position the tooltip next to a keyboard-focused element
  function fakeEvent(el) {
    const r = el.getBoundingClientRect();
    return { clientX: r.right, clientY: r.top };
  }

  // ---------- Chart 2: bed days per admission, with the 2014-2016 jump marked ----------
  function drawStay(animate = false) {
    const host = d3.select("#stayChart");
    const { w, h } = boxSize(host);
    host.selectAll("*").remove();
    if (w < 80 || h < 60) return;

    const rows = state.rows;
    const m = { top: 22, right: 18, bottom: 24, left: 40 };
    const iw = w - m.left - m.right, ih = h - m.top - m.bottom;

    const svg = host.append("svg").attr("viewBox", `0 0 ${w} ${h}`)
      .attr("role", "img").attr("aria-label", "Line chart of average bed days per admission by year");
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    const x = d3.scalePoint(rows.map(d => d.year), [0, iw]).padding(0.3);
    const y = d3.scaleLinear([Math.floor(d3.min(rows, d => d.bed_days_per_case) - 0.3),
      Math.ceil(d3.max(rows, d => d.bed_days_per_case) + 0.3)], [ih, 0]);

    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(3).tickSize(-iw).tickFormat(""));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(3));

    // Shaded band over the abrupt rise (values read from the data)
    const p = rows.find(d => d.year === 2014), q = rows.find(d => d.year === 2016);
    if (p && q) {
      g.append("rect").attr("x", x(2014)).attr("width", x(2016) - x(2014)).attr("y", 0).attr("height", ih)
        .attr("fill", COLORS.amber).attr("opacity", 0.14);
      g.append("text").attr("x", x(2014) - 6).attr("y", 2).attr("text-anchor", "end")
        .attr("fill", themeWarn()).attr("font-size", "10px").attr("font-weight", "600")
        .text(`2014→2016: ${formatDecimal(p.bed_days_per_case)} → ${formatDecimal(q.bed_days_per_case)} days (cause unconfirmed)`);
    }

    const linePath = g.append("path").datum(rows)
      .attr("fill", "none").attr("stroke", COLORS.bedDays).attr("stroke-width", 2.4)
      .attr("d", d3.line().x(d => x(d.year)).y(d => y(d.bed_days_per_case)).curve(d3.curveMonotoneX));
    if (animate) {
      const totalLen = linePath.node().getTotalLength();
      linePath.attr("stroke-dasharray", `${totalLen} ${totalLen}`).attr("stroke-dashoffset", totalLen)
        .transition().duration(animDuration(true, 800)).delay(120).ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);
    }

    const dots = g.selectAll("circle").data(rows).join("circle")
      .attr("class", "bar-interactive")
      .attr("cx", d => x(d.year)).attr("cy", d => y(d.bed_days_per_case))
      .attr("r", animate ? 0 : d => (state.year === d.year ? 6 : 4))
      .attr("fill", d => (state.year === d.year ? COLORS.highlight : "#fff"))
      .attr("stroke", d => (state.year === d.year ? COLORS.highlight : COLORS.bedDays)).attr("stroke-width", 2.2)
      .attr("tabindex", 0).attr("role", "button")
      .attr("aria-label", d => `${d.year}: ${formatDecimal(d.bed_days_per_case)} bed days per admission. Select to focus on this year.`)
      .on("mouseenter focus", (event, d) => showTooltip(event.type === "focus" ? fakeEvent(event.target) : event,
        `<strong>${d.year}</strong>Stay per admission: <b>${formatDecimal(d.bed_days_per_case)} days</b><br/>Bed days: <b>${formatNumber(d.bed_days)}</b>`))
      .on("mousemove", moveTooltip).on("mouseleave blur", hideTooltip)
      .on("click", (event, d) => selectYear(d.year))
      .on("keydown", onKey);
    if (animate) {
      dots.transition().duration(animDuration(true, 420)).delay((_, i) => 280 + animDelay(true, 40) * i)
        .attr("r", d => (state.year === d.year ? 6 : 4));
    }
  }
})();