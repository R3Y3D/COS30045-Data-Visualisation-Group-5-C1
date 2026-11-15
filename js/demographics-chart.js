function drawDemographicsChart() {
  drawVerticalCategories("demographicsChart", getBreakdownRows("age_group"), "age_group", { title: "Age groups" });
  const rows = RoadData.categoryRows(getBreakdownRows("sex"), "sex", appState.metric);
  const legend = d3.select("#demographicsLegend");
  legend.selectAll("*").remove();
  rows.sort((a, b) => (b.value || 0) - (a.value || 0)).forEach(row => {
    const item = legend.append("span").attr("class", "legend-item");
    item.append("span").attr("class", "legend-swatch").style("background-color", COLORS.sex[row.label] || "#94a3b8");
    item.append("span").text(`${SHORT_LABELS[row.label] || row.label}: ${metricText(row)} (${shareText(row.share)})`);
  });
}
