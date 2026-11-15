(() => {
  "use strict";

  const URLS = {
    roadUser: "Data/Cleaned_CSV/hospitilisation/national_road_user.csv",
    ageGender: "Data/Cleaned_CSV/hospitilisation/national_age_gender.csv",
    stateYear: "Data/Cleaned_CSV/state_territory/state_year.csv",
    remoteness: "Data/Cleaned_CSV/hospitilisation/national_remoteness.csv"
  };

  const state = {
    roadUser: [],
    ageGender: [],
    stateYear: [],
    remoteness: [],
    years: [],
    year: null,
    metric: "cases",
    selectedState: null
  };
  const entrance = createEntranceController(1400);

  const REMOTE_ORDER = ["Major Cities", "Regional", "Remote", "Missing"];
  const SHORT_ROAD = {
    "Bus occupant": "Bus",
    "Car driver": "Car driver",
    "Car passenger": "Car passenger",
    "Car unknown position": "Car (unknown)",
    "Heavy transport driver": "Heavy truck driver",
    "Heavy transport passenger": "Heavy truck passenger",
    "Heavy transport unknown position": "Heavy truck (unknown)",
    "Motorcyclist": "Motorcyclist",
    "Other or unknown": "Other / unknown",
    "Pedal cyclist": "Pedal cyclist",
    "Pedestrian": "Pedestrian",
    "Pick-up truck or van occupant": "Ute / van"
  };

  Promise.all([
    d3.csv(URLS.roadUser, d3.autoType),
    d3.csv(URLS.ageGender, d3.autoType),
    d3.csv(URLS.stateYear, d3.autoType),
    d3.csv(URLS.remoteness, d3.autoType)
  ])
    .then(([roadUser, ageGender, stateYear, remoteness]) => {
      state.roadUser = roadUser;
      state.ageGender = ageGender;
      state.stateYear = stateYear.map(d => ({
        ...d,
        year: +d.year,
        state_or_territory: d.state_or_territory
      }));
      state.remoteness = remoteness;
      state.years = [...new Set(state.roadUser.map(d => d.year).filter(Number.isFinite))].sort(d3.ascending);
      bindControls();
      initThemeToggle();
      initChartExpand();
      renderAll();
      const ro = new ResizeObserver(() => {
        if (entrance.shouldSkipResize()) return;
        drawCharts();
      });
      ["#roadUserChart", "#ageSexChart", "#stateChart", "#remotenessChart"]
        .forEach(sel => ro.observe(document.querySelector(sel)));
      window.addEventListener("themechange", drawCharts);
    })
    .catch(err => {
      console.error(err);
      d3.selectAll(".svg-container").html(
        `<p class="chart-error">Could not load page 2 data. Serve the folder over HTTP and check Data/Cleaned_CSV paths.</p>`
      );
      d3.select("#headline").text("Data not available");
    });

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

    d3.select("#btnCases").on("click", () => setMetric("cases"));
    d3.select("#btnStay").on("click", () => setMetric("stay"));
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

  function setMetric(metric) {
    state.metric = metric;
    d3.select("#btnCases").attr("aria-pressed", metric === "cases");
    d3.select("#btnStay").attr("aria-pressed", metric === "stay");
    renderAll();
  }

  function selectState(name) {
    state.selectedState = state.selectedState === name ? null : name;
    renderAll();
  }

  const onKeyYear = (event, d) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setYear(state.year === d.year ? null : d.year);
    }
  };

  const onKeyState = (event, d) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectState(d.state);
    }
  };

  function fakeEvent(el) {
    const r = el.getBoundingClientRect();
    return { clientX: r.right, clientY: r.top };
  }

  let animateNow = false;

  function renderAll() {
    updateHeadline();
    drawCharts();
  }

  function drawCharts() {
    animateNow = entrance.beginDraw([
      "#roadUserChart", "#ageSexChart", "#stateChart", "#remotenessChart"
    ]);
    drawRoadUser();
    drawAgeSex();
    drawStates();
    drawRemoteness();
    animateNow = false;
  }

  const boxSize = host => {
    const r = host.node().getBoundingClientRect();
    return { w: Math.floor(r.width), h: Math.floor(r.height) };
  };

  function inYear(rows) {
    return state.year === null ? rows : rows.filter(d => d.year === state.year);
  }

  function aggregate(rows, keyFields, valueFields) {
    const map = new Map();
    for (const row of rows) {
      const key = keyFields.map(f => row[f]).join("|");
      if (!map.has(key)) {
        const base = {};
        keyFields.forEach(f => { base[f] = row[f]; });
        valueFields.forEach(f => { base[f] = null; base[`${f}_has`] = false; });
        map.set(key, base);
      }
      const agg = map.get(key);
      for (const f of valueFields) {
        if (Number.isFinite(row[f])) {
          agg[f] = (agg[`${f}_has`] ? agg[f] : 0) + row[f];
          agg[`${f}_has`] = true;
        }
      }
    }
    return [...map.values()].map(d => {
      const out = { ...d };
      valueFields.forEach(f => {
        if (!d[`${f}_has`]) out[f] = null;
        delete out[`${f}_has`];
      });
      out.bed_days_per_case = (Number.isFinite(out.cases) && out.cases > 0 && Number.isFinite(out.bed_days))
        ? out.bed_days / out.cases
        : null;
      return out;
    });
  }

  function valueFor(row) {
    if (state.metric === "stay") return row.bed_days_per_case;
    return row.cases;
  }

  function metricLabel() {
    return state.metric === "stay" ? "Bed days per admission" : "Cases";
  }

  function formatMetric(v) {
    if (!Number.isFinite(v)) return "n.p.";
    return state.metric === "stay" ? `${formatDecimal(v)} days` : formatNumber(v);
  }

  function updateHeadline() {
    const scope = state.year === null ? "2011–2021" : String(state.year);
    d3.select("#headline").text(`Who is hurt, and where · ${scope}`);
    if (state.year === null) {
      d3.select("#subline").text(
        "Motorcyclists and pedal cyclists are 40.8% of cases. Pedal cyclists grew +51% with the shortest stays (~3 days); pedestrians have the longest (~9 days). 65% of cases are male."
      );
    } else {
      d3.select("#subline").text(
        `Showing ${scope}. Toggle Cases or Bed days per admission; click a state bar to highlight that jurisdiction.`
      );
    }
  }

  function drawRoadUser() {
    const host = d3.select("#roadUserChart");
    const { w, h } = boxSize(host);
    host.selectAll("*").remove();
    if (w < 80 || h < 80) return;

    const rows = aggregate(inYear(state.roadUser), ["road_user"], ["cases", "bed_days"])
      .map(d => ({ ...d, label: SHORT_ROAD[d.road_user] || d.road_user, value: valueFor(d) }))
      .sort((a, b) => {
        const av = Number.isFinite(a.value) ? a.value : -Infinity;
        const bv = Number.isFinite(b.value) ? b.value : -Infinity;
        return bv - av;
      });

    const m = { top: 8, right: state.metric === "cases" ? 72 : 48, bottom: 8, left: 108 };
    const iw = w - m.left - m.right;
    const ih = h - m.top - m.bottom;
    const svg = host.append("svg").attr("viewBox", `0 0 ${w} ${h}`)
      .attr("role", "img")
      .attr("aria-label", `Horizontal bar chart of ${metricLabel().toLowerCase()} by road user`);
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    const drawable = rows.filter(d => Number.isFinite(d.value));
    const y = d3.scaleBand(rows.map(d => d.label), [0, ih]).padding(0.22);
    const xMax = d3.max(drawable, d => d.value) || 1;
    const x = d3.scaleLinear([0, xMax * 1.05], [0, iw]).nice();

    g.append("g").attr("class", "grid")
      .call(d3.axisBottom(x).ticks(4).tickSize(ih).tickFormat(""));
    g.append("g").attr("class", "axis")
      .call(d3.axisLeft(y).tickSize(0).tickPadding(6));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x).ticks(4).tickFormat(d => state.metric === "stay" ? d3.format(".1f")(d) : d3.format("~s")(d)));

    g.selectAll("rect.bar").data(rows).join("rect")
      .attr("class", "bar bar-interactive")
      .attr("x", 0)
      .attr("y", d => y(d.label))
      .attr("width", 0)
      .attr("height", y.bandwidth())
      .attr("rx", 3)
      .attr("fill", d => {
        if (!Number.isFinite(d.value)) return "transparent";
        if (d.road_user === "Motorcyclist" || d.road_user === "Pedal cyclist") return COLORS.highlight;
        return state.metric === "stay" ? COLORS.bedDays : COLORS.primary;
      })
      .attr("tabindex", d => Number.isFinite(d.value) ? 0 : null)
      .attr("role", d => Number.isFinite(d.value) ? "img" : null)
      .attr("aria-label", d => Number.isFinite(d.value)
        ? `${d.road_user}: ${formatMetric(d.value)}; stay ${formatDecimal(d.bed_days_per_case)} days`
        : `${d.road_user}: not published`)
      .on("mouseenter focus", (event, d) => {
        const tip = Number.isFinite(d.cases)
          ? `<strong>${d.road_user}</strong>Cases: <b>${formatNumber(d.cases)}</b><br/>Bed days: <b>${formatNumber(d.bed_days)}</b><br/>Stay: <b>${formatDecimal(d.bed_days_per_case)} days</b>`
          : `<strong>${d.road_user}</strong>Cases: <b>n.p.</b> (not published)`;
        showTooltip(event.type === "focus" ? fakeEvent(event.target) : event, tip);
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave blur", hideTooltip);

    const bars = g.selectAll("rect.bar");
    if (animateNow) {
      bars.transition().duration(animDuration(true, 650)).delay((_, i) => 60 + animDelay(true, 40) * i).ease(d3.easeCubicOut)
        .attr("width", d => Number.isFinite(d.value) ? x(d.value) : 0);
    } else {
      bars.attr("width", d => Number.isFinite(d.value) ? x(d.value) : 0);
    }

    const labels = g.selectAll("text.side").data(rows).join("text")
      .attr("class", "side")
      .attr("x", d => (Number.isFinite(d.value) ? x(d.value) : 0) + 6)
      .attr("y", d => y(d.label) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("fill", themeMuted())
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("opacity", animateNow ? 0 : 1)
      .text(d => {
        if (!Number.isFinite(d.value)) return "n.p.";
        if (state.metric === "cases" && Number.isFinite(d.bed_days_per_case)) {
          return `${formatDecimal(d.bed_days_per_case)} d`;
        }
        return formatMetric(d.value);
      });
    if (animateNow) {
      labels.attr("x", 6)
        .transition().duration(animDuration(true, 400)).delay((_, i) => 220 + animDelay(true, 35) * i)
        .attr("opacity", 1)
        .attr("x", d => (Number.isFinite(d.value) ? x(d.value) : 0) + 6);
    }
  }

  function drawAgeSex() {
    const host = d3.select("#ageSexChart");
    const { w, h } = boxSize(host);
    host.selectAll("*").remove();
    if (w < 80 || h < 80) return;

    const rows = aggregate(inYear(state.ageGender), ["age_group", "gender"], ["cases", "bed_days"]);
    const ages = AGE_ORDER.filter(a => rows.some(r => r.age_group === a));
    const byAge = ages.map(age => {
      const male = rows.find(r => r.age_group === age && r.gender === "Male") || { cases: null, bed_days_per_case: null };
      const female = rows.find(r => r.age_group === age && r.gender === "Female") || { cases: null, bed_days_per_case: null };
      return { age, male, female };
    });

    const m = { top: 18, right: 16, bottom: 22, left: 16 };
    const iw = w - m.left - m.right;
    const ih = h - m.top - m.bottom;
    const labelW = 40;
    const half = (iw - labelW) / 2;

    const svg = host.append("svg").attr("viewBox", `0 0 ${w} ${h}`)
      .attr("role", "img")
      .attr("aria-label", "Population pyramid of hospitalisations by age and sex");
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    const useStay = state.metric === "stay";
    const maleVals = byAge.map(d => useStay ? d.male.bed_days_per_case : d.male.cases);
    const femaleVals = byAge.map(d => useStay ? d.female.bed_days_per_case : d.female.cases);
    const maxV = d3.max([...maleVals, ...femaleVals].filter(Number.isFinite)) || 1;

    const y = d3.scaleBand(ages, [0, ih]).padding(0.18);
    const xMale = d3.scaleLinear([0, maxV], [half, 0]);
    const xFemale = d3.scaleLinear([0, maxV], [0, half]);

    g.append("text").attr("x", half / 2).attr("y", -6).attr("text-anchor", "middle")
      .attr("fill", COLORS.sex.Male).attr("font-size", "11px").attr("font-weight", "700").text("Male");
    g.append("text").attr("x", half + labelW + half / 2).attr("y", -6).attr("text-anchor", "middle")
      .attr("fill", COLORS.sex.Female).attr("font-size", "11px").attr("font-weight", "700").text("Female");

    const left = g.append("g");
    const mid = g.append("g").attr("transform", `translate(${half},0)`);
    const right = g.append("g").attr("transform", `translate(${half + labelW},0)`);

    mid.selectAll("text").data(ages).join("text")
      .attr("x", labelW / 2).attr("y", d => y(d) + y.bandwidth() / 2)
      .attr("dy", "0.35em").attr("text-anchor", "middle")
      .attr("fill", themeInk()).attr("font-size", "11px").attr("font-weight", "650")
      .text(d => d);

    function bindSide(sel, side, xScale, color) {
      sel.selectAll("rect").data(byAge).join("rect")
        .attr("class", "bar-interactive")
        .attr("y", d => y(d.age))
        .attr("height", y.bandwidth())
        .attr("rx", 2)
        .attr("x", side === "male" ? half : 0)
        .attr("width", 0)
        .attr("fill", color)
        .attr("tabindex", 0)
        .attr("role", "img")
        .attr("aria-label", d => {
          const row = d[side];
          const v = useStay ? row.bed_days_per_case : row.cases;
          return `${d.age} ${side}: ${formatMetric(v)}`;
        })
        .on("mouseenter focus", (event, d) => {
          const row = d[side];
          const tip = Number.isFinite(row.cases)
            ? `<strong>${d.age} · ${side === "male" ? "Male" : "Female"}</strong>Cases: <b>${formatNumber(row.cases)}</b><br/>Stay: <b>${formatDecimal(row.bed_days_per_case)} days</b>`
            : `<strong>${d.age} · ${side === "male" ? "Male" : "Female"}</strong>Cases: <b>n.p.</b>`;
          showTooltip(event.type === "focus" ? fakeEvent(event.target) : event, tip);
        })
        .on("mousemove", moveTooltip)
        .on("mouseleave blur", hideTooltip);

      const endX = d => {
        const v = useStay ? d[side].bed_days_per_case : d[side].cases;
        if (!Number.isFinite(v)) return side === "male" ? half : 0;
        return side === "male" ? xScale(v) : 0;
      };
      const endW = d => {
        const v = useStay ? d[side].bed_days_per_case : d[side].cases;
        return Number.isFinite(v) ? Math.abs(xScale(v) - xScale(0)) : 0;
      };
      const rects = sel.selectAll("rect");
      if (animateNow) {
        rects.transition().duration(animDuration(true, 600)).delay((_, i) => 100 + animDelay(true, 45) * i).ease(d3.easeCubicOut)
          .attr("x", endX).attr("width", endW);
      } else {
        rects.attr("x", endX).attr("width", endW);
      }
    }

    bindSide(left, "male", xMale, COLORS.sex.Male);
    bindSide(right, "female", xFemale, COLORS.sex.Female);

    left.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(xMale).ticks(3).tickFormat(d => useStay ? d3.format(".0f")(d) : d3.format("~s")(d)));
    right.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(xFemale).ticks(3).tickFormat(d => useStay ? d3.format(".0f")(d) : d3.format("~s")(d)));
  }

  function drawStates() {
    const host = d3.select("#stateChart");
    const { w, h } = boxSize(host);
    host.selectAll("*").remove();
    if (w < 80 || h < 80) return;

    const cells = state.stateYear.map(d => {
      const cases = Number.isFinite(d.cases) ? d.cases : null;
      const bed_days = Number.isFinite(d.bed_days) ? d.bed_days : null;
      const stay = (cases && bed_days != null) ? bed_days / cases : null;
      return {
        state: d.state_or_territory,
        year: d.year,
        cases,
        bed_days,
        bed_days_per_case: stay,
        value: state.metric === "stay" ? stay : cases
      };
    });

    const years = state.years;
    const stateOrder = [...new Set(cells.map(d => d.state))]
      .map(name => ({
        state: name,
        total: d3.sum(cells.filter(c => c.state === name && Number.isFinite(c.cases)), c => c.cases)
      }))
      .sort((a, b) => b.total - a.total)
      .map(d => d.state);

    const m = { top: 18, right: 52, bottom: 22, left: 36 };
    const iw = w - m.left - m.right;
    const ih = h - m.top - m.bottom;

    const svg = host.append("svg").attr("viewBox", `0 0 ${w} ${h}`)
      .attr("role", "img")
      .attr("aria-label", `Heatmap of ${metricLabel().toLowerCase()} by state and year. Click a row to highlight a state.`);
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    g.append("text")
      .attr("x", iw).attr("y", -6).attr("text-anchor", "end")
      .attr("fill", themeWarn()).attr("font-size", "10px").attr("font-weight", "600")
      .text("Breaks: Vic from 2012 · NSW from Jun 2017");

    const x = d3.scaleBand(years, [0, iw]).paddingInner(0.06).paddingOuter(0.02);
    const y = d3.scaleBand(stateOrder, [0, ih]).paddingInner(0.08).paddingOuter(0.02);
    const vals = cells.map(d => d.value).filter(Number.isFinite);
    const color = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, d3.max(vals) || 1]);

    g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));
    g.append("g").attr("class", "axis")
      .call(d3.axisLeft(y).tickSize(0).tickPadding(6));

    g.selectAll("rect.cell").data(cells).join("rect")
      .attr("class", "cell bar-interactive")
      .attr("x", d => x(d.year))
      .attr("y", d => y(d.state))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("rx", 2)
      .attr("fill", d => Number.isFinite(d.value) ? color(d.value) : "#e2e8f0")
      .attr("opacity", 0)
      .attr("stroke", d => (state.selectedState === d.state ? COLORS.highlight : "transparent"))
      .attr("stroke-width", d => (state.selectedState === d.state ? 1.5 : 0))
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", d => Number.isFinite(d.value)
        ? `${d.state}, ${d.year}: ${formatMetric(d.value)}. Activate to highlight ${d.state}.`
        : `${d.state}, ${d.year}: not published`)
      .on("mouseenter focus", (event, d) => {
        const tip = Number.isFinite(d.cases)
          ? `<strong>${d.state} · ${d.year}</strong>Cases: <b>${formatNumber(d.cases)}</b><br/>Stay: <b>${formatDecimal(d.bed_days_per_case)} days</b><br/>Click row to ${state.selectedState === d.state ? "clear" : "highlight"}.`
          : `<strong>${d.state} · ${d.year}</strong>Cases: <b>n.p.</b>`;
        showTooltip(event.type === "focus" ? fakeEvent(event.target) : event, tip);
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave blur", hideTooltip)
      .on("click", (event, d) => selectState(d.state))
      .on("keydown", onKeyState);

    const cellOpacity = d => {
      if (state.selectedState && state.selectedState !== d.state) return 0.25;
      if (state.year !== null && state.year !== d.year) return 0.35;
      return 1;
    };
    const cellsSel = g.selectAll("rect.cell");
    if (animateNow) {
      cellsSel.transition().duration(animDuration(true, 420)).delay(d => {
        const yi = years.indexOf(d.year);
        const si = stateOrder.indexOf(d.state);
        return 80 + animDelay(true, 12) * (yi + si);
      }).attr("opacity", cellOpacity);
    } else {
      cellsSel.attr("opacity", cellOpacity);
    }

    const legendH = Math.max(40, ih * 0.55);
    const legend = g.append("g").attr("transform", `translate(${iw + 12}, ${(ih - legendH) / 2})`);
    const lgY = d3.scaleLinear().domain(color.domain()).range([legendH, 0]);
    const lgTicks = lgY.ticks(4);
    for (let i = 0; i < 40; i++) {
      const t0 = i / 40, t1 = (i + 1) / 40;
      const v0 = color.domain()[0] + (color.domain()[1] - color.domain()[0]) * (1 - t1);
      legend.append("rect")
        .attr("y", legendH * t0).attr("width", 10).attr("height", legendH / 40 + 0.5)
        .attr("fill", color(v0));
    }
    legend.append("g").attr("class", "axis").attr("transform", "translate(10,0)")
      .call(d3.axisRight(lgY).tickValues(lgTicks)
        .tickFormat(d => state.metric === "stay" ? d3.format(".1f")(d) : d3.format("~s")(d)));
  }

  function drawRemoteness() {
    const host = d3.select("#remotenessChart");
    const { w, h } = boxSize(host);
    host.selectAll("*").remove();
    if (w < 80 || h < 80) return;

    const rows = aggregate(inYear(state.remoteness), ["remoteness"], ["cases", "bed_days"])
      .map(d => ({
        ...d,
        value: d.bed_days_per_case
      }))
      .sort((a, b) => REMOTE_ORDER.indexOf(a.remoteness) - REMOTE_ORDER.indexOf(b.remoteness));

    const m = { top: 12, right: 16, bottom: 28, left: 40 };
    const iw = w - m.left - m.right;
    const ih = h - m.top - m.bottom;

    const svg = host.append("svg").attr("viewBox", `0 0 ${w} ${h}`)
      .attr("role", "img")
      .attr("aria-label", "Bar chart of bed days per admission by remoteness of residence");
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    const x = d3.scaleBand(rows.map(d => d.remoteness), [0, iw]).padding(0.32);
    const yMax = d3.max(rows, d => d.value) || 1;
    const y = d3.scaleLinear([0, yMax * 1.15], [ih, 0]).nice();

    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(4).tickSize(-iw).tickFormat(""));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(4));

    g.selectAll("rect.bar").data(rows).join("rect")
      .attr("class", "bar bar-interactive")
      .attr("x", d => x(d.remoteness))
      .attr("y", ih)
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("rx", 3)
      .attr("fill", d => COLORS.remoteness[d.remoteness] || COLORS.slate)
      .attr("tabindex", 0)
      .attr("role", "img")
      .attr("aria-label", d => `${d.remoteness}: ${formatDecimal(d.value)} bed days per admission`)
      .on("mouseenter focus", (event, d) => {
        const tip = Number.isFinite(d.cases)
          ? `<strong>${d.remoteness}</strong>Stay: <b>${formatDecimal(d.value)} days</b><br/>Cases: <b>${formatNumber(d.cases)}</b><br/>Bed days: <b>${formatNumber(d.bed_days)}</b>`
          : `<strong>${d.remoteness}</strong>Cases: <b>n.p.</b>`;
        showTooltip(event.type === "focus" ? fakeEvent(event.target) : event, tip);
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave blur", hideTooltip);

    const remoteBars = g.selectAll("rect.bar");
    if (animateNow) {
      remoteBars.transition().duration(animDuration(true, 650)).delay((_, i) => 120 + animDelay(true, 70) * i).ease(d3.easeCubicOut)
        .attr("y", d => Number.isFinite(d.value) ? y(d.value) : ih)
        .attr("height", d => Number.isFinite(d.value) ? ih - y(d.value) : 0);
    } else {
      remoteBars
        .attr("y", d => Number.isFinite(d.value) ? y(d.value) : ih)
        .attr("height", d => Number.isFinite(d.value) ? ih - y(d.value) : 0);
    }

    const remoteVals = g.selectAll("text.val").data(rows.filter(d => Number.isFinite(d.value))).join("text")
      .attr("x", d => x(d.remoteness) + x.bandwidth() / 2)
      .attr("y", d => y(d.value) - 5)
      .attr("text-anchor", "middle")
      .attr("fill", themeInk())
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .attr("opacity", animateNow ? 0 : 1)
      .text(d => formatDecimal(d.value));
    if (animateNow) {
      remoteVals.transition().duration(animDuration(true, 360)).delay(animDuration(true, 380))
        .attr("opacity", 1);
    }
  }
})();
