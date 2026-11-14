// Sources: Cleaned_CSV/hospitilisation/national_counterparty.csv and state_territory/state_counterparty.csv.
function drawCounterpartyChart() {
  drawHorizontalCategories("counterpartyChart", getBreakdownRows("counterparty"), "counterparty", {
    title: "Collision counterparts and events", barClass: "cp-bar", note: "All categories from the selected source are shown. Counterparty does not establish fault."
  });
}
