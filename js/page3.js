/*
 * Page 3 — First Nations people
 * Charts: indexed trend, 100% remoteness stacks, road-user dumbbells,
 * and a streamgraph (complex W11-style chart) of FN cases by remoteness.
 * Blank cases → skip mark + "n.p." in tooltip. suppressed = "Yes" → hatched fill
 * and a minimum-count note. fn_year.csv is the only source for FN totals.
 *
 * AI prompts used: build page 3 in the same one-screen D3 style as pages 1–2,
 * with First Nations story panels, suppression hatching, and a streamgraph
 * as the complex visualisation.
 */
(() => {
  "use strict";

  // ---------- Data loading ----------
  const URLS = {
    year: "Data/Cleaned_CSV/first_nation/fn_year.csv",
    remoteness: "Data/Cleaned_CSV/first_nation/fn_remoteness.csv",
    roadUser: "Data/Cleaned_CSV/first_nation/fn_road_user.csv"
  };

  const FN = "First Nations people";
  const NI = "Non-Indigenous";
  const STATUS_COLOR = { [FN]: "#b86509", [NI]: COLORS.primary };
  const REMOTE_ORDER = ["Major Cities", "Regional", "Remote"];
  const REMOTE_COLORS = {
    "Major Cities": COLORS.remoteness["Major Cities"],
    Regional: COLORS.remoteness.Regional,
    Remote: COLORS.remoteness.Remote
  };

  const SHORT_ROAD = {
    "Bus occupant": "Bus",
    "Car driver, passenger or unknown position": "Car (all)",
    "Heavy transport driver, passenger or unknown position": "Heavy truck",
    Motorcyclist: "Motorcyclist",
    "Other or unknown": "Other / unknown",
    "Pedal cyclist": "Pedal cyclist",
    Pedestrian: "Pedestrian",
    "Pick-up truck or van occupant": "Ute / van"
  };

  const state = {
    yearRows: [],
    remoteness: [],
    roadUser: [],
    years: [],
    year: null // null = all years (category charts); trend always shows full series
  };

  Promise.all([
    d3.csv(URLS.year, d3.autoType),
    d3.csv(URLS.remoteness, d3.autoType),
    d3.csv(URLS.roadUser, d3.autoType)
  ])
    .then(([yearRows, remoteness, roadUser]) => {
      state.yearRows = yearRows.map(d => ({
        ...d,
        year: +d.year,
        status: d.status,
        suppressed: isSuppressed(d)
      }));
      state.remoteness = remoteness.map(d => ({
        ...d,
        year: +d.year,
        suppressed: isSuppressed(d)
      }));
      state.roadUser = roadUser.map(d => ({
        ...d,
        year: +d.year,
        suppressed: isSuppressed(d)
      }));
      state.years = [...new Set(state.yearRows.map(d => d.year))].sort(d3.ascending);
      bindControls();
      initChartExpand();
      renderAll();
      const ro = new ResizeObserver(drawCharts);
      ["#trendChart", "#remotenessChart", "#roadUserChart", "#streamChart"]
        .forEach(sel => ro.observe(document.querySelector(sel)));
    })
    .catch(err => {
      console.error(err);
      d3.selectAll(".svg-container").html(
        `<p class="chart-error">Could not load page 3 data. Serve over HTTP and check Data/Cleaned_CSV/first_nation/.</p>`
      );
      d3.select("#headline").text("Data not available");
    });

  // ---------- Interaction ----------
  function bindControls() {
    const rail = d3.select("#yearRail");
    rail.append("button")
      .attr("type", "button")
      .attr("aria-pressed", "true")
      .attr("data-year", "all")
      .text("All")
      .on("click", () => setYear(null));

    rail.selectAll("button.year")
      .data(state.years)
      .join("button")
      .attr("type", "button")
      .attr("class", "year")
      .attr("aria-pressed", "false")
      .attr("data-year", d => d)
      .text(d => d)
      .on("click", (event, year) => setYear(year));
  }

  function setYear(year) {
    state.year = year;
    d3.selectAll("#yearRail button")
      .attr("aria-pressed", function () {
        const y = this.getAttribute("data-year");
        return String(state.year === null ? "all" : state.year) === y;
      });
    renderAll();
  }

  function renderAll() {
    const scope = state.year === null ? "2011–2021" : String(state.year);
    d3.select("#headline").text(`First Nations people · ${scope}`);
    drawCharts();
  }

  function drawCharts() {
    drawTrend();
    drawRemoteness();
    drawRoadUser();
    drawStream();
  }

  // ---------- Helpers ----------
  function isSuppressed(row) {
    return String(row.suppressed).toLowerCase() === "yes" || (Number.isFinite(row.n_suppressed) && row.n_suppressed > 0);
  }

  const boxSize = host => {
    const r = host.node().getBoundingClientRect();
    return { w: Math.floor(r.width), h: Math.floor(r.height) };
  };

  function fakeEvent(el) {
    const r = el.getBoundingClientRect();
    return { clientX: r.right, clientY: r.top };
  }

  function inYear(rows) {
    return state.year === null ? rows : rows.filter(d => d.year === state.year);
  }

  /** Sum cases/bed_days; keep null if every source cell was blank. Track suppression. */
  function aggregate(rows, keyFields) {
    const map = new Map();
    for (const row of rows) {
      const key = keyFields.map(f => row[f]).join("|");
      if (!map.has(key)) {
        const base = { cases: null, bed_days: null, _c: false, _b: false, suppressed: false };
        keyFields.forEach(f => { base[f] = row[f]; });
        map.set(key, base);
      }
      const agg = map.get(key);
      if (Number.isFinite(row.cases)) {
        agg.cases = (agg._c ? agg.cases : 0) + row.cases;
        agg._c = true;
      }
      if (Number.isFinite(row.bed_days)) {
        agg.bed_days = (agg._b ? agg.bed_days : 0) + row.bed_days;
        agg._b = true;
      }
      if (row.suppressed) agg.suppressed = true;
    }
    return [...map.values()].map(d => {
      const out = { ...d };
      if (!d._c) out.cases = null;
      if (!d._b) out.bed_days = null;
      delete out._c;
      delete out._b;
      return out;
    });
  }

  function ensureHatch(svg) {
    let defs = svg.select("defs");
    if (defs.empty()) defs = svg.append("defs");
    if (defs.select("#hatch-fn").empty()) {
      defs.append("pattern")
        .attr("id", "hatch-fn")
        .attr("width", 6).attr("height", 6)
        .attr("patternUnits", "userSpaceOnUse")
        .attr("patternTransform", "rotate(35)")
        .append("rect")
        .attr("width", 2).attr("height", 6)
        .attr("fill", "#fff")
        .attr("opacity", 0.55);
    }
  }

  function casesTip(label, row) {
    if (!Number.isFinite(row.cases)) {
      return `<strong>${label}</strong>Cases: <b>n.p.</b> (not published)`;
    }
    const note = row.suppressed
      ? `<br/><em>Suppressed half-year(s): published figure is a minimum.</em>`
      : "";
    return `<strong>${label}</strong>Cases: <b>${formatNumber(row.cases)}${row.suppressed ? "†" : ""}</b><br/>Bed days: <b>${formatNumber(row.bed_days)}</b>${note}`;
  }

  // ---------- Chart 1: indexed trend ----------
  function drawTrend() {
    const host = d3.select("#trendChart");
    const { w, h } = boxSize(host);
    host.selectAll("*").remove();
    if (w < 80 || h < 80) return;

    const byStatus = d3.group(state.yearRows, d => d.status);
    const base = {};
    for (const status of [FN, NI]) {
      const row = (byStatus.get(status) || []).find(d => d.year === 2011);
      base[status] = row && Number.isFinite(row.cases) ? row.cases : null;
    }

    const series = [FN, NI].map(status => ({
      status,
      values: (byStatus.get(status) || [])
        .filter(d => Number.isFinite(d.cases) && Number.isFinite(base[status]))
        .map(d => ({
          year: d.year,
          status,
          cases: d.cases,
          bed_days: d.bed_days,
          index: (d.cases / base[status]) * 100
        }))
        .sort((a, b) => a.year - b.year)
    }));

    const m = { top: 28, right: 18, bottom: 24, left: 40 };
    const iw = w - m.left - m.right;
    const ih = h - m.top - m.bottom;
    const svg = host.append("svg").attr("viewBox", `0 0 ${w} ${h}`)
      .attr("role", "img")
      .attr("aria-label", "Line chart of hospitalisation index, 2011 equals 100, for First Nations people and Non-Indigenous Australians");
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    const years = state.years;
    const x = d3.scalePoint(years, [0, iw]).padding(0.2);
    const yMax = d3.max(series, s => d3.max(s.values, d => d.index)) || 100;
    const y = d3.scaleLinear([80, yMax * 1.05], [ih, 0]).nice();

    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(""));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5));

    // 2020 annotation from First Nations series
    const fnVals = series.find(s => s.status === FN)?.values || [];
    const a = fnVals.find(d => d.year === 2019);
    const b = fnVals.find(d => d.year === 2020);
    if (a && b && x(2020) != null) {
      const cx = x(2020);
      g.append("line").attr("x1", cx).attr("x2", cx).attr("y1", -4).attr("y2", ih)
        .attr("stroke", COLORS.amber).attr("stroke-dasharray", "3,3");
      const rise = ((b.cases / a.cases) - 1) * 100;
      g.append("text").attr("x", cx - 4).attr("y", -10).attr("text-anchor", "end")
        .attr("fill", "#b45309").attr("font-size", "10px").attr("font-weight", "600")
        .text(`2020 FN: ${formatPercent(rise)}% vs 2019 (national total fell)`);
    }

    // Baseline 100
    g.append("line").attr("x1", 0).attr("x2", iw).attr("y1", y(100)).attr("y2", y(100))
      .attr("stroke", "#94a3b8").attr("stroke-dasharray", "4,3");
    g.append("text").attr("x", 2).attr("y", y(100) - 4)
      .attr("fill", "#64748b").attr("font-size", "10px").text("2011 = 100");

    const line = d3.line().x(d => x(d.year)).y(d => y(d.index)).curve(d3.curveMonotoneX);

    for (const s of series) {
      const path = g.append("path").datum(s.values)
        .attr("fill", "none")
        .attr("stroke", STATUS_COLOR[s.status])
        .attr("stroke-width", 2.4)
        .attr("d", line);
      const len = path.node().getTotalLength();
      if (chartDuration() > 0) {
        path.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len)
          .transition().duration(chartDuration(700)).ease(d3.easeCubicOut)
          .attr("stroke-dashoffset", 0);
      }

      g.selectAll(null).data(s.values).join("circle")
        .attr("class", "bar-interactive")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.index))
        .attr("r", 0)
        .attr("fill", STATUS_COLOR[s.status])
        .attr("tabindex", 0)
        .attr("role", "button")
        .attr("aria-label", d => `${d.status}, ${d.year}: index ${formatDecimal(d.index)}, ${formatNumber(d.cases)} cases. Select year.`)
        .on("mouseenter focus", (event, d) => {
          showTooltip(event.type === "focus" ? fakeEvent(event.target) : event,
            `<strong>${d.year} · ${d.status}</strong>Index: <b>${formatDecimal(d.index)}</b><br/>Cases: <b>${formatNumber(d.cases)}</b><br/>Bed days: <b>${formatNumber(d.bed_days)}</b>`);
        })
        .on("mousemove", moveTooltip)
        .on("mouseleave blur", hideTooltip)
        .on("click", (event, d) => setYear(state.year === d.year ? null : d.year))
        .on("keydown", (event, d) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setYear(state.year === d.year ? null : d.year);
          }
        })
        .transition().duration(chartDuration(400)).delay((_, i) => chartDuration(260) + chartDelay() * i)
        .attr("r", d => (state.year === d.year ? 6 : 4));
    }
  }

  // ---------- Chart 2: 100% stacked remoteness ----------
  function drawRemoteness() {
    const host = d3.select("#remotenessChart");
    const { w, h } = boxSize(host);
    host.selectAll("*").remove();
    if (w < 80 || h < 80) return;

    const rows = aggregate(inYear(state.remoteness), ["status", "remoteness"]);
    const statuses = [FN, NI];
    const stacked = statuses.map(status => {
      const parts = REMOTE_ORDER.map(remoteness => {
        const row = rows.find(r => r.status === status && r.remoteness === remoteness);
        return {
          status,
          remoteness,
          cases: row && Number.isFinite(row.cases) ? row.cases : 0,
          raw: row || { cases: null, bed_days: null, suppressed: false }
        };
      });
      const total = d3.sum(parts, d => d.cases) || 1;
      let cursor = 0;
      return parts.map(p => {
        const share = (p.cases / total) * 100;
        const seg = { ...p, share, y0: cursor, y1: cursor + share, total };
        cursor += share;
        return seg;
      });
    });

    const m = { top: 12, right: 14, bottom: 36, left: 44 };
    const iw = w - m.left - m.right;
    const ih = h - m.top - m.bottom;
    const svg = host.append("svg").attr("viewBox", `0 0 ${w} ${h}`)
      .attr("role", "img")
      .attr("aria-label", "One-hundred percent stacked bars of remoteness mix for First Nations people and Non-Indigenous Australians");
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    const x = d3.scaleBand(statuses, [0, iw]).padding(0.35);
    const y = d3.scaleLinear([0, 100], [ih, 0]);

    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(""));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x).tickFormat(d => (d === FN ? "First Nations" : "Non-Indigenous")));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}%`));

    for (const group of stacked) {
      g.selectAll(null).data(group).join("rect")
        .attr("class", "bar-interactive")
        .attr("x", d => x(d.status))
        .attr("width", x.bandwidth())
        .attr("y", ih)
        .attr("height", 0)
        .attr("fill", d => REMOTE_COLORS[d.remoteness])
        .attr("tabindex", 0)
        .attr("role", "img")
        .attr("aria-label", d => `${d.status}, ${d.remoteness}: ${formatDecimal(d.share)} percent of cases`)
        .on("mouseenter focus", (event, d) => {
          const tip = Number.isFinite(d.raw.cases)
            ? `<strong>${d.status}<br/>${d.remoteness}</strong>Share: <b>${formatDecimal(d.share)}%</b><br/>Cases: <b>${formatNumber(d.raw.cases)}</b>`
            : `<strong>${d.status}<br/>${d.remoteness}</strong>Cases: <b>n.p.</b>`;
          showTooltip(event.type === "focus" ? fakeEvent(event.target) : event, tip);
        })
        .on("mousemove", moveTooltip)
        .on("mouseleave blur", hideTooltip)
        .transition().duration(chartDuration()).delay((_, i) => chartDelay(50) * i).ease(d3.easeCubicOut)
        .attr("y", d => y(d.y1))
        .attr("height", d => Math.max(0, y(d.y0) - y(d.y1)));

      // Label Remote share (story focus) when tall enough
      const remote = group.find(d => d.remoteness === "Remote");
      if (remote && remote.share >= 4) {
        g.append("text")
          .attr("x", x(remote.status) + x.bandwidth() / 2)
          .attr("y", y(remote.y0 + remote.share / 2))
          .attr("dy", "0.35em")
          .attr("text-anchor", "middle")
          .attr("fill", "#fff")
          .attr("font-size", "11px")
          .attr("font-weight", "700")
          .text(`${formatDecimal(remote.share)}%`);
      }
    }

    // Mini legend
    const leg = g.append("g").attr("transform", `translate(0,${ih + 22})`);
    REMOTE_ORDER.forEach((name, i) => {
      const item = leg.append("g").attr("transform", `translate(${i * 110},0)`);
      item.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", REMOTE_COLORS[name]);
      item.append("text").attr("x", 14).attr("y", 9).attr("fill", "#475569").attr("font-size", "11px").text(name);
    });
  }

  // ---------- Chart 3: road-user dumbbells ----------
  function drawRoadUser() {
    const host = d3.select("#roadUserChart");
    const { w, h } = boxSize(host);
    host.selectAll("*").remove();
    if (w < 80 || h < 80) return;

    const rows = aggregate(inYear(state.roadUser), ["status", "road_user"]);
    const users = [...new Set(rows.map(d => d.road_user))];

    // Shares within each status (published cases only in denominator)
    const totals = {};
    for (const status of [FN, NI]) {
      totals[status] = d3.sum(rows.filter(r => r.status === status && Number.isFinite(r.cases)), r => r.cases) || 1;
    }

    const data = users.map(road_user => {
      const fn = rows.find(r => r.status === FN && r.road_user === road_user) || { cases: null, suppressed: false };
      const ni = rows.find(r => r.status === NI && r.road_user === road_user) || { cases: null, suppressed: false };
      return {
        road_user,
        label: SHORT_ROAD[road_user] || road_user,
        fn,
        ni,
        fnShare: Number.isFinite(fn.cases) ? (fn.cases / totals[FN]) * 100 : null,
        niShare: Number.isFinite(ni.cases) ? (ni.cases / totals[NI]) * 100 : null
      };
    }).sort((a, b) => {
      const av = Math.max(a.fnShare || 0, a.niShare || 0);
      const bv = Math.max(b.fnShare || 0, b.niShare || 0);
      return bv - av;
    });

    const m = { top: 10, right: 18, bottom: 22, left: 100 };
    const iw = w - m.left - m.right;
    const ih = h - m.top - m.bottom;
    const svg = host.append("svg").attr("viewBox", `0 0 ${w} ${h}`)
      .attr("role", "img")
      .attr("aria-label", "Dumbbell chart comparing road-user case shares for First Nations people and Non-Indigenous Australians");
    ensureHatch(svg);
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    const y = d3.scaleBand(data.map(d => d.label), [0, ih]).padding(0.28);
    const xMax = d3.max(data, d => Math.max(d.fnShare || 0, d.niShare || 0)) || 1;
    const x = d3.scaleLinear([0, xMax * 1.1], [0, iw]).nice();

    g.append("g").attr("class", "grid").call(d3.axisBottom(x).ticks(5).tickSize(ih).tickFormat(""));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).tickSize(0).tickPadding(6));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d}%`));

    // Connector
    g.selectAll("line.conn").data(data.filter(d => Number.isFinite(d.fnShare) && Number.isFinite(d.niShare))).join("line")
      .attr("class", "conn")
      .attr("x1", d => x(d.fnShare))
      .attr("x2", d => x(d.fnShare))
      .attr("y1", d => y(d.label) + y.bandwidth() / 2)
      .attr("y2", d => y(d.label) + y.bandwidth() / 2)
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 2)
      .attr("opacity", 0)
      .transition().duration(chartDuration(450)).delay((_, i) => chartDelay(30) * i)
      .attr("x2", d => x(d.niShare))
      .attr("opacity", 1);

    function drawDots(key, shareKey, color) {
      g.selectAll(`circle.${key}`).data(data).join("circle")
        .attr("class", `bar-interactive ${key}`)
        .attr("cx", d => Number.isFinite(d[shareKey]) ? x(d[shareKey]) : -999)
        .attr("cy", d => y(d.label) + y.bandwidth() / 2)
        .attr("r", 0)
        .attr("fill", color)
        .attr("opacity", d => (d[key].suppressed ? 0.75 : 1))
        .attr("stroke", d => (d[key].suppressed ? "#fff" : "none"))
        .attr("stroke-width", d => (d[key].suppressed ? 1.2 : 0))
        .style("display", d => (Number.isFinite(d[shareKey]) ? null : "none"))
        .attr("tabindex", d => (Number.isFinite(d[shareKey]) ? 0 : null))
        .attr("role", "img")
        .attr("aria-label", d => {
          if (!Number.isFinite(d[shareKey])) return `${d.road_user}, ${key}: not published`;
          return `${d.road_user}, ${key === "fn" ? FN : NI}: ${formatDecimal(d[shareKey])} percent${d[key].suppressed ? ", suppressed minimum" : ""}`;
        })
        .on("mouseenter focus", (event, d) => {
          const row = d[key];
          const status = key === "fn" ? FN : NI;
          let tip;
          if (!Number.isFinite(row.cases)) {
            tip = `<strong>${d.road_user}<br/>${status}</strong>Cases: <b>n.p.</b>`;
          } else {
            tip = `<strong>${d.road_user}<br/>${status}</strong>Share: <b>${formatDecimal(d[shareKey])}%</b><br/>Cases: <b>${formatNumber(row.cases)}${row.suppressed ? "†" : ""}</b>`;
            if (row.suppressed) tip += `<br/><em>Suppressed half-year(s): published figure is a minimum.</em>`;
          }
          showTooltip(event.type === "focus" ? fakeEvent(event.target) : event, tip);
        })
        .on("mousemove", moveTooltip)
        .on("mouseleave blur", hideTooltip)
        .transition().duration(chartDuration(420)).delay((_, i) => chartDuration(120) + chartDelay(30) * i)
        .attr("r", d => Number.isFinite(d[shareKey]) ? 5.5 : 0);

      // Hatch overlay for suppressed published values
      g.selectAll(`circle.hatch-${key}`).data(data.filter(d => d[key].suppressed && Number.isFinite(d[shareKey]))).join("circle")
        .attr("cx", d => x(d[shareKey]))
        .attr("cy", d => y(d.label) + y.bandwidth() / 2)
        .attr("r", 0)
        .attr("fill", "url(#hatch-fn)")
        .attr("pointer-events", "none")
        .transition().duration(chartDuration(420)).delay(chartDuration(160))
        .attr("r", 5.5);
    }

    drawDots("fn", "fnShare", STATUS_COLOR[FN]);
    drawDots("ni", "niShare", STATUS_COLOR[NI]);

    // n.p. labels where both missing or one missing
    g.selectAll("text.np").data(data.filter(d => !Number.isFinite(d.fnShare) && !Number.isFinite(d.niShare))).join("text")
      .attr("x", 4)
      .attr("y", d => y(d.label) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("fill", "#94a3b8")
      .attr("font-size", "11px")
      .text("n.p.");
  }

  // ---------- Chart 4: streamgraph (complex viz) — FN cases by remoteness ----------
  function drawStream() {
    const host = d3.select("#streamChart");
    const { w, h } = boxSize(host);
    host.selectAll("*").remove();
    if (w < 80 || h < 80) return;

    // First Nations only — stream of remoteness layers over the full year range
    const fnRows = state.remoteness.filter(d => d.status === FN);
    const years = state.years;
    const series = REMOTE_ORDER.map(remoteness =>
      years.map(year => {
        const row = fnRows.find(r => r.year === year && r.remoteness === remoteness);
        return {
          year,
          remoteness,
          cases: row && Number.isFinite(row.cases) ? row.cases : 0,
          published: row && Number.isFinite(row.cases)
        };
      })
    );

    const stacked = d3.stack()
      .keys(d3.range(REMOTE_ORDER.length))
      .offset(d3.stackOffsetWiggle)
      .order(d3.stackOrderInsideOut)
      (years.map((year, yi) => {
        const point = { year };
        REMOTE_ORDER.forEach((name, ki) => { point[ki] = series[ki][yi].cases; });
        return point;
      }));

    const m = { top: 14, right: 12, bottom: 36, left: 40 };
    const iw = w - m.left - m.right;
    const ih = h - m.top - m.bottom;
    const svg = host.append("svg").attr("viewBox", `0 0 ${w} ${h}`)
      .attr("role", "img")
      .attr("aria-label", "Streamgraph of First Nations hospitalisations by remoteness from 2011 to 2021");
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    const x = d3.scalePoint(years, [0, iw]).padding(0.15);
    const y = d3.scaleLinear()
      .domain([
        d3.min(stacked, layer => d3.min(layer, d => d[0])),
        d3.max(stacked, layer => d3.max(layer, d => d[1]))
      ])
      .range([ih, 0]);

    const area = d3.area()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveBasis);

    g.selectAll("path.layer").data(stacked).join("path")
      .attr("class", "layer bar-interactive")
      .attr("fill", (d, i) => REMOTE_COLORS[REMOTE_ORDER[i]])
      .attr("opacity", 0)
      .attr("d", area)
      .attr("tabindex", 0)
      .attr("role", "img")
      .attr("aria-label", (d, i) => `First Nations ${REMOTE_ORDER[i]} stream layer`)
      .on("mouseenter focus", (event, layer) => {
        const i = layer.index;
        const name = REMOTE_ORDER[i];
        const focusYear = state.year ?? years[years.length - 1];
        const row = series[i].find(r => r.year === focusYear);
        const tip = row && row.published
          ? `<strong>${name}</strong>First Nations cases in ${focusYear}: <b>${formatNumber(row.cases)}</b><br/>Layer thickness = cases over time.`
          : `<strong>${name}</strong>Cases: <b>n.p.</b>`;
        showTooltip(event.type === "focus" ? fakeEvent(event.target) : event, tip);
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave blur", hideTooltip)
      .transition().duration(chartDuration(650)).delay((_, i) => chartDelay(80) * i).ease(d3.easeCubicOut)
      .attr("opacity", 0.92);

    // Hover bands by year for precise tooltips
    g.selectAll("rect.year-hit").data(years).join("rect")
      .attr("class", "year-hit bar-interactive")
      .attr("x", d => x(d) - x.step() / 2)
      .attr("y", 0)
      .attr("width", x.step())
      .attr("height", ih)
      .attr("fill", "transparent")
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", d => `Year ${d}. Select to filter category charts.`)
      .on("mouseenter focus", (event, year) => {
        const parts = REMOTE_ORDER.map((name, i) => {
          const row = series[i].find(r => r.year === year);
          return row && row.published
            ? `${name}: <b>${formatNumber(row.cases)}</b>`
            : `${name}: <b>n.p.</b>`;
        }).join("<br/>");
        showTooltip(event.type === "focus" ? fakeEvent(event.target) : event,
          `<strong>${year} · First Nations</strong>${parts}`);
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave blur", hideTooltip)
      .on("click", (event, year) => setYear(state.year === year ? null : year))
      .on("keydown", (event, year) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setYear(state.year === year ? null : year);
        }
      });

    if (state.year !== null && x(state.year) != null) {
      g.append("line")
        .attr("x1", x(state.year)).attr("x2", x(state.year))
        .attr("y1", 0).attr("y2", ih)
        .attr("stroke", COLORS.highlight).attr("stroke-width", 1.5).attr("stroke-dasharray", "4,3");
    }

    g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    // Legend
    const leg = g.append("g").attr("transform", `translate(0,${ih + 22})`);
    REMOTE_ORDER.forEach((name, i) => {
      const item = leg.append("g").attr("transform", `translate(${i * 110},0)`);
      item.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", REMOTE_COLORS[name]);
      item.append("text").attr("x", 14).attr("y", 9).attr("fill", "#475569").attr("font-size", "11px").text(name);
    });
  }
})();
