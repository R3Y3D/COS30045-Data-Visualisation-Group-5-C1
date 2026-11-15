function drawRoadUserChart() {
  drawHorizontalCategories("roadUserChart", getBreakdownRows("road_user"), "road_user", {
    limit: 7, title: "Road users", barClass: "ru-bar", note: "Top seven categories shown; the table retains every published category."
  });
}
