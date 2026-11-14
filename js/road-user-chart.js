// Sources: Cleaned_CSV/hospitilisation/national_road_user.csv and state_territory/state_road_user.csv.
function drawRoadUserChart() {
  drawHorizontalCategories("roadUserChart", getBreakdownRows("road_user"), "road_user", {
    limit: 7, title: "Road users", barClass: "ru-bar", note: "Top seven categories shown; the table retains every published category."
  });
}
