/*
 * Page 3 — First Nations people
 * Charts: indexed trend, 100% remoteness stacks, road-user dumbbells,
 * and a parallel-coordinates profile (lecture technique).
 * Blank cases → skip mark + "n.p." in tooltip. suppressed = "Yes" → hatched fill
 * and a minimum-count note. fn_year.csv is the only source for FN totals.
 *
 * AI prompts used: build page 3 in the same one-screen D3 style as pages 1–2,
 * with First Nations story panels, suppression hatching, and a parallel-
 * coordinates special visualisation.
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
      renderAll();
      const ro = new ResizeObserver(drawCharts);
      ["#trendChart", "#remotenessChart", "#roadUserChart", "#parallelChart"]
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
    drawParallel();
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
      g.append("path").datum(s.values)
        .attr("fill", "none")
        .attr("stroke", STATUS_COLOR[s.status])
        .attr("stroke-width", 2.4)
        .attr("d", line);

      g.selectAll(null).data(s.values).join("circle")
        .attr("class", "bar-interactive")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.index))
        .attr("r", d => (state.year === d.year ? 6 : 4))
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
        });
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
        .attr("y", d => y(d.y1))
        .attr("height", d => Math.max(0, y(d.y0) - y(d.y1)))
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
        .on("mouseleave blur", hideTooltip);

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
      .attr("x2", d => x(d.niShare))
      .attr("y1", d => y(d.label) + y.bandwidth() / 2)
      .attr("y2", d => y(d.label) + y.bandwidth() / 2)
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 2);

    function drawDots(key, shareKey, color) {
      g.selectAll(`circle.${key}`).data(data).join("circle")
        .attr("class", `bar-interactive ${key}`)
        .attr("cx", d => Number.isFinite(d[shareKey]) ? x(d[shareKey]) : -999)
        .attr("cy", d => y(d.label) + y.bandwidth() / 2)
        .attr("r", d => Number.isFinite(d[shareKey]) ? 5.5 : 0)
        .attr("fill", d => (d[key].suppressed ? color : color))
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
        .on("mouseleave blur", hideTooltip);

      // Hatch overlay for suppressed published values
      g.selectAll(`circle.hatch-${key}`).data(data.filter(d => d[key].suppressed && Number.isFinite(d[shareKey]))).join("circle")
        .attr("cx", d => x(d[shareKey]))
        .attr("cy", d => y(d.label) + y.bandwidth() / 2)
        .attr("r", 5.5)
        .attr("fill", "url(#hatch-fn)")
        .attr("pointer-events", "none");
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

  // ---------- Chart 4: parallel coordinates (special viz) ----------
  function drawParallel() {
    const host = d3.select("#parallelChart");
    const { w, h } = boxSize(host);
    host.selectAll("*").remove();
    if (w < 80 || h < 80) return;

    // Build one profile per status from the selected year scope
    const remoteRows = aggregate(inYear(state.remoteness), ["status", "remoteness"]);
    const roadRows = aggregate(inYear(state.roadUser), ["status", "road_user"]);

    function share(status, rows, key, value) {
      const subset = rows.filter(r => r.status === status);
      const total = d3.sum(subset.filter(r => Number.isFinite(r.cases)), r => r.cases);
      if (!total) return null;
      const row = subset.find(r => r[key] === value);
      return row && Number.isFinite(row.cases) ? (row.cases / total) * 100 : null;
    }

    const dims = [
      { key: "major", label: "Major Cities %", get: s => share(s, remoteRows, "remoteness", "Major Cities") },
      { key: "regional", label: "Regional %", get: s => share(s, remoteRows, "remoteness", "Regional") },
      { key: "remote", label: "Remote %", get: s => share(s, remoteRows, "remoteness", "Remote") },
      { key: "ped", label: "Pedestrian %", get: s => share(s, roadRows, "road_user", "Pedestrian") },
      { key: "cycle", label: "Pedal cyclist %", get: s => share(s, roadRows, "road_user", "Pedal cyclist") },
      { key: "moto", label: "Motorcyclist %", get: s => share(s, roadRows, "road_user", "Motorcyclist") }
    ];

    const profiles = [FN, NI].map(status => {
      const values = {};
      dims.forEach(d => { values[d.key] = d.get(status); });
      return { status, values };
    });

    const m = { top: 28, right: 18, bottom: 18, left: 18 };
    const iw = w - m.left - m.right;
    const ih = h - m.top - m.bottom;
    const svg = host.append("svg").attr("viewBox", `0 0 ${w} ${h}`)
      .attr("role", "img")
      .attr("aria-label", "Parallel coordinates comparing First Nations and Non-Indigenous profiles across remoteness and road-user shares");
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    const x = d3.scalePoint(dims.map(d => d.key), [0, iw]).padding(0.15);
    const y = {};
    dims.forEach(d => {
      const vals = profiles.map(p => p.values[d.key]).filter(Number.isFinite);
      const lo = 0;
      const hi = Math.max(10, (d3.max(vals) || 10) * 1.15);
      y[d.key] = d3.scaleLinear([lo, hi], [ih, 0]);
    });

    // Axes: tick numbers only on the first and last axes to keep the panel readable
    dims.forEach((d, i) => {
      const ax = g.append("g").attr("transform", `translate(${x(d.key)},0)`);
      ax.append("line").attr("y1", 0).attr("y2", ih).attr("stroke", "#d5deea");
      const showTicks = i === 0 || i === dims.length - 1;
      ax.call(d3.axisLeft(y[d.key]).ticks(4).tickSize(showTicks ? 4 : 0).tickFormat(showTicks ? d => `${d}` : ""));
      ax.selectAll("text").attr("font-size", "11px").attr("fill", "#5d6b80");
      const short = d.label.replace(" %", "");
      ax.append("text")
        .attr("y", -14)
        .attr("text-anchor", "middle")
        .attr("fill", "#334155")
        .attr("font-size", "11px")
        .attr("font-weight", "700")
        .text(short);
    });

    function path(profile) {
      return d3.line()
        .defined(d => Number.isFinite(profile.values[d.key]))
        .x(d => x(d.key))
        .y(d => y[d.key](profile.values[d.key]))(dims);
    }

    g.selectAll("path.profile").data(profiles).join("path")
      .attr("class", "profile bar-interactive")
      .attr("fill", "none")
      .attr("stroke", d => STATUS_COLOR[d.status])
      .attr("stroke-width", 2.6)
      .attr("d", path)
      .attr("tabindex", 0)
      .attr("role", "img")
      .attr("aria-label", d => `${d.status} parallel-coordinates profile`)
      .on("mouseenter focus", (event, d) => {
        const lines = dims.map(dim => {
          const v = d.values[dim.key];
          return `${dim.label}: <b>${Number.isFinite(v) ? `${formatDecimal(v)}%` : "n.p."}</b>`;
        }).join("<br/>");
        showTooltip(event.type === "focus" ? fakeEvent(event.target) : event,
          `<strong>${d.status}</strong>${lines}`);
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave blur", hideTooltip);

    g.selectAll("g.dots").data(profiles).join("g")
      .attr("fill", d => STATUS_COLOR[d.status])
      .selectAll("circle")
      .data(d => dims.map(dim => ({ status: d.status, dim, value: d.values[dim.key] })))
      .join("circle")
      .attr("class", "bar-interactive")
      .attr("cx", d => x(d.dim.key))
      .attr("cy", d => Number.isFinite(d.value) ? y[d.dim.key](d.value) : -999)
      .attr("r", d => Number.isFinite(d.value) ? 4.5 : 0)
      .style("display", d => (Number.isFinite(d.value) ? null : "none"))
      .attr("tabindex", d => (Number.isFinite(d.value) ? 0 : null))
      .attr("role", "img")
      .attr("aria-label", d => `${d.status}, ${d.dim.label}: ${Number.isFinite(d.value) ? formatDecimal(d.value) + "%" : "n.p."}`)
      .on("mouseenter focus", (event, d) => {
        showTooltip(event.type === "focus" ? fakeEvent(event.target) : event,
          `<strong>${d.status}</strong>${d.dim.label}: <b>${Number.isFinite(d.value) ? `${formatDecimal(d.value)}%` : "n.p."}</b>`);
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave blur", hideTooltip);
  }
})();
