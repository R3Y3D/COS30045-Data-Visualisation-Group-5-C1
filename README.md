# COS30045 Data Visualisation — Group 5 (C1)

## Australian Road Crash Hospitalised Injuries (2011–2021)

An interactive **D3.js dashboard** exploring Australia's road crash hospitalisation burden, hospital bed days, geographic patterns, road users, demographics, and First Nations comparisons. The project focuses on non-fatal hospitalised injuries, but the cleaned files contain different counting definitions and coverage; national hospitalisation summaries and tables explicitly excluding deaths must be interpreted separately.

**Last updated:** 4 November 2026.

### Unit & Team Details

| Field | Details |
| :--- | :--- |
| **Unit Code & Name** | COS30045 — Data Visualisation |
| **Section & Group** | Section C1 — Group 5 |
| **Lecturer / Teacher** | Rishma Fathima Basher |

| Team member | Student ID |
| :--- | :--- |
| Ibrahim Mahbub | `105684360` |
| Darrshan A/L Muraleesvaran | `105965528` |
| Nasrul Aman bin Abdul Rashid | `105556595` |

### 1. Project Overview & Purpose

The national summary records **410,884 hospitalisations** and **2,018,891 hospital bed days** across 2011–2021. Annual hospitalisations increased from **34,033** to **39,505**, a **16.1% increase**. The dashboard examines both recorded hospitalisation volume and associated inpatient resources.

The intended audiences are road safety policymakers and analysts, public health researchers, and the general public. The visualisations support questions about:

- How national hospitalisation counts and bed days changed over time.
- How recorded burden differs across states, territories, and remoteness classifications.
- Which road-user, age, and sex categories account for the largest counts or bed-day demand.
- How First Nations and Non-Indigenous records differ in annual trends, age composition, and geographic distribution.

Counts describe hospital burden. Population and travel-exposure data are needed before making comparisons of individual risk.

### 2. Run the Dashboard Locally

Serve the repository through a local HTTP server so the browser can load the CSV files. With Python 3 available, run this command from the repository root:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open **http://127.0.0.1:8000/** in a modern browser. Stop the server with **Ctrl+C**. VS Code's Live Server is another option.

The application uses HTML, CSS, JavaScript, and D3.js v7, with no package installation or build step. Internet access is required to load D3.js and Google Fonts from their external hosts. Opening `index.html` directly through `file://` may prevent CSV loading.

The current loader reads the CSV files directly. Although `js/data-fallback.js` is included in the page, the loader does not use it as an automatic fallback when CSV loading fails.

### 3. Implemented Dashboard Features

| View | Content |
| :--- | :--- |
| **Overview** | National annual trajectory, male/female annual comparison, average bed days per hospitalisation, annual summary table, and 2011–2021 road-user changes. |
| **States** | Ranked state/territory comparison and a sortable jurisdiction table. |
| **Road users** | Road-user and counterparty charts with corresponding breakdown tables. |
| **Regions** | Major Cities, Regional, and Remote time series, plus a table retaining the missing classification. |
| **Demographics** | Age-group chart, sex summary, and separate age and sex tables. |
| **First Nations** | Annual First Nations series with Non-Indigenous values in tooltips, and First Nations remoteness, selected road-user, and age breakdowns. |

The interface includes national KPI cards, metric and year controls, jurisdiction highlighting, hover tooltips, sortable tables with shaded numeric cells, expandable charts/tables, and a reset control.

**Control behaviour:**

- **Metric:** switches applicable national and category visualisations between hospitalisations and bed days. First Nations charts remain count-based because their exports do not contain bed days.
- **Year:** updates applicable summaries and breakdowns. National trend views retain their full time series for context; the road-user changes table always compares 2011 with 2021. The First Nations annual chart also retains its full series.
- **Jurisdiction:** highlights the selected state in the state chart and table. It does not filter national KPIs or demographic datasets to that state.
- **Interactions:** clicking supported annual marks or annual-table rows selects a year; state marks/rows highlight a jurisdiction; remoteness legend/rows highlight a series. Expanded panels close with Escape or the backdrop.

The First Nations annual chart currently plots the First Nations line only; Non-Indigenous counts appear in tooltips. The exports support broader comparisons than are currently drawn in that view.

### 4. Repository Structure

```text
.
|-- index.html                         Dashboard entry point
|-- assets/                            Logo and favicon
|-- css/styles.css                     Dashboard styling
|-- js/
|   |-- shared-constants.js            Shared state, colours, formatting, tooltips
|   |-- load-data.js                   CSV parsers, controls, navigation, rendering
|   |-- trend-chart.js                 National annual chart
|   |-- overview-charts.js             Sex trends and average-stay chart
|   |-- state-chart.js                 State/territory chart
|   |-- road-user-chart.js             Road-user chart
|   |-- counterparty-chart.js          National counterparty chart
|   |-- remoteness-chart.js            Remoteness trends
|   |-- demographics-chart.js          Age chart and sex summary
|   |-- first-nations-charts.js        First Nations charts
|   |-- tables.js                      Sortable breakdown tables
|   `-- data-fallback.js               Included snapshot; not an active fallback
|-- Data/
|   |-- Cleaned_CSV_Files/             17 cleaned CSV exports
|   `-- *.knwf                         Four KNIME workflow archives
`-- README.md
```

### 5. Data Sources & Preparation

The source publications are the **Bureau of Infrastructure and Transport Research Economics (BITRE)** hospitalised injury series, using **Australian Institute of Health and Welfare (AIHW)** National Hospital Morbidity Database data and **Australian Bureau of Statistics (ABS)** classifications.

The **three Excel datasets cleaned using KNIME** are listed below with their exact source filenames:

| Source dataset | Scope |
| :--- | :--- |
| `First-Nations-hospitalised-injuries-2023.xlsx` | First Nations and Non-Indigenous hospitalised injury comparisons. |
| `state-and-territory-hospitalisation-injury-publication-2023.xlsx` | Hospitalised injury breakdowns across Australia's states and territories. |
| `hospitalisation_injury_publication_sep2023 (1).xlsx` | National hospitalised injury data, including annual, road-user, demographic, and remoteness breakdowns. |

**Metadata reference:** `hospitalised-injury-data-dictionary-september-2023.pdf` provides definitions and classification guidance.

The repository contains cleaned CSV exports and **four KNIME workflow archives covering these three source datasets**, including two national preparation/aggregation workflows. The original workbooks and dictionary are not bundled here. The workflows are:

- [National preparation workflow](Data/hospitalisation_injury_publication_sep2023.knwf)
- [Additional national aggregation/export workflow](Data/hospitalisation_injury_publication.knwf)
- [State and territory workflow](Data/state_and_teritory_data.knwf)
- [First Nations workflow](Data/First-Nations-hospitalised-injuries-2023.knwf)

The original national preparation imported **117,919 records across 13 attributes**, inspected missing/suppressed values, and filtered `Cause of injury = Traffic` to obtain **86,140 traffic records**. KNIME aggregation and export steps produced annual and category summaries. Subsequent work extended the exports to demographic, remoteness, state/territory, and First Nations tables.

#### Current CSV inventory

Row counts exclude headers. The dashboard currently loads **11 of the 17 CSV files**.

| File in `Data/Cleaned_CSV_Files/` | Rows | Contents / current use |
| :--- | ---: | :--- |
| `national_annual.csv` | 11 | Annual hospitalisations and bed days; national KPIs and trends. |
| `road_user_summary.csv` | 132 | Annual sums of hospitalisations and bed days across 12 road-user categories; active road-user source. |
| `road_user_annual.csv` | 132 | Supporting annual road-user hospitalisation counts. |
| `road_user_totals.csv` | 12 | Supporting cumulative road-user hospitalisation totals. |
| `remoteness_yearly_trends.csv` | 44 | Annual hospitalisations and total bed days for Major Cities, Regional, Remote, and Missing; active regional source. |
| `age_group_summary.csv` | 78 | Annual hospitalisations and bed days by age, including one missing-age record; active age source. |
| `Gender_demographic_summary.csv` | 28 | Annual hospitalisations and bed days by source-defined sex category; active sex source. |
| `Temporal Trends & State Comparisons.csv` | 88 | Annual cases and bed days by eight jurisdictions, explicitly excluding deaths in hospital within 30 days; active state source. |
| `Counterparty Analysis.csv` | 44 | Annual cases and bed days across four counterparty/event categories with the same explicit death exclusion; active national counterparty source. |
| `Age Group Demographics.csv` | 77 | Separate age-case export explicitly excluding deaths in hospital within 30 days; not the active age source. |
| `Gender Demographic.csv` | 22 | Separate female/male case export with the explicit death exclusion; not the active sex source. |
| `Road User Analysis.csv` | 88 | Separate case export using eight broader road-user categories and the explicit death exclusion; not the active road-user source. |
| `first_nations_annual_comparison_t1.csv` | 11 | Annual First Nations, Non-Indigenous, and national totals; active First Nations source. |
| `first_nations_road_user.csv` | 22 | Annual road-user counts and reported totals for two Indigenous-status groups; active, subject to reconciliation and unpublished-value limitations. |
| `first_nations_age_group.csv` | 22 | Annual age counts and reported totals for two Indigenous-status groups; active, with a 2014 reconciliation issue. |
| `first_nations_remoteness.csv` | 22 | Annual geographic counts and totals for two Indigenous-status groups; active, using its own table coverage. |
| `first_nations_counterparty.csv` | 22 | Exact duplicate of the First Nations remoteness export; excluded from the loader and unsuitable for counterparty analysis. |

The updated `road_user_summary.csv` contains **sums**, rather than the earlier means. The updated `age_group_summary.csv` contains **age groups**, rather than the previous road-user content. The updated remoteness export contains **`Sum(Bed days)`**, replacing the earlier `Sum(Died_bed_days)` column. Use these current headers and meanings when preparing charts or slides.

### 6. Validation, Definitions & Known Limitations

#### Reconciled national summaries

For every year from 2011 to 2021, the road-user, age, sex, and remoteness summary files match `national_annual.csv` for **both hospitalisations and bed days**. Each totals **410,884 hospitalisations** and **2,018,891 bed days**. Annual road-user counts also reconcile with cumulative road-user totals.

The state and national counterparty files match each other year by year, totaling **403,293 cases** and **1,970,095 bed days**. Their column labels explicitly exclude deaths in hospital within 30 days. Their totals must not be substituted for the national hospitalisation-summary denominator.

The separate `Age Group Demographics.csv`, `Gender Demographic.csv`, and `Road User Analysis.csv` exports total **402,560**, **403,280**, and **402,643 cases**, respectively. Their coverage differs from the active national summaries. The cleaned files alone do not establish the reason for every difference.

Calculate category shares within the relevant source table. Calculate aggregate bed days per hospitalisation as **sum of bed days / sum of hospitalisations**, rather than averaging already-aggregated means.

#### First Nations export issues

- **Duplicated counterparty export:** `first_nations_counterparty.csv` and `first_nations_remoteness.csv` are byte-for-byte identical. Both corresponding KNIME Excel Reader branches select sheet **T4**. The counterparty branch needs the correct source table, column mapping, and a fresh export before it can support analysis.
- **Unpublished values converted to zero:** four First Nations String Manipulation steps apply `replace($$CURRENTCOLUMN$$, "n.p.", "0")`. These replacements remove the distinction between unpublished entries and confirmed zero counts. Preserve unpublished values as missing in a corrected export and consult the source legend before interpretation.
- **2014 age reconciliation:** First Nations age categories sum to **1,344**, while that row reports **1,407**, and the annual comparison file reports **1,456**. Non-Indigenous age categories sum to **28,342**, versus an age-table total of **30,785** and an annual comparison total of **33,361**. The **2021** age rows reconcile with annual comparison totals for both groups and are used for the presentation's age comparison.
- **Road-user coverage:** category sums do not exhaust reported row totals. Across the period, First Nations listed categories sum to **18,146**, versus a reported total of **18,616**; Non-Indigenous categories sum to **372,633**, versus **380,684**. Treat selected categories as a partial breakdown and keep their table totals distinct from the annual comparison file.
- **Remoteness coverage:** geographic categories reconcile within each row, totaling **18,523 First Nations** and **376,765 Non-Indigenous** records. These are the geographic distribution denominators, rather than the annual comparison totals.
- **Annual comparison residual:** national totals match `national_annual.csv`. First Nations and Non-Indigenous columns sum to **18,739** and **385,095**, leaving **7,050** of the national total unrepresented by those two columns. Do not assign that residual an Indigenous-status label without the source definition.

#### Interpretation and display limits

- The data contain de-identified aggregate statistics, not individual patient records. Hospitalisations/cases should not be described as unique people or unique crashes.
- Raw counts and within-table percentages are not population-, age-, or travel-exposure-adjusted rates. Age bands have different widths. Differences do not establish individual risk or causation.
- NSW and Victoria reporting changes limit historical comparability; the project source notes identify a NSW reporting change from June 2017. The 2020 dip coincides with pandemic-era mobility changes, but these counts alone do not establish a causal effect.
- Missing remoteness accounts for **8,833 hospitalisations (2.1%)**. The remoteness trend legend calculates shares across its three plotted categories, excluding Missing; the table and findings below retain Missing in the national denominator.
- The active age summary retains **one hospitalisation** with missing age. The active sex summary retains **15 hospitalisations** in the combined source category `intersex or indeterminate or missing`.
- First Nations charts remain exploratory while the export issues above are unresolved. They contain counts only, even when the global metric control is set to bed days.

### 7. Key Findings from the Current Exports

Unless stated otherwise, figures below cover **2011–2021**. Percentages use the source table appropriate to each finding.

| Finding | Values and interpretation | CSV source |
| :--- | :--- | :--- |
| **National burden** | **410,884 hospitalisations**, **2,018,891 bed days**, and **4.91 bed days per hospitalisation**. | `national_annual.csv` |
| **Annual trajectory** | Hospitalisations rose **16.1%**, from **34,033** to **39,505**. The peak was **39,866 in 2019**; counts fell **4.8% in 2020** and rose **4.1% in 2021**. | `national_annual.csv` |
| **Inpatient demand** | Annual bed days rose **27.6%**, from **155,959** to **198,934**, and peaked at **219,157 in 2016**. Bed days per hospitalisation increased from **4.58 to 5.04**. | `national_annual.csv` |
| **State concentration** | NSW (**116,060**), Victoria (**107,942**), and Queensland (**93,967**) together account for **78.8%** of the state table's **403,293 cases**. | `Temporal Trends & State Comparisons.csv` |
| **Road-user concentration** | Car drivers (**135,063**), motorcyclists (**92,322**), and pedal cyclists (**75,362**) account for **73.7%** of hospitalisations. Pedal cyclist counts increased **51.4%** between 2011 and 2021. | `road_user_summary.csv` |
| **Pedestrian bed-day demand** | Pedestrians account for **6.9% of hospitalisations**, **13.0% of bed days**, and **9.19 bed days per hospitalisation**, the highest among recorded road-user categories. | `road_user_summary.csv` |
| **Geographic distribution** | Major Cities account for **66.1%** of hospitalisations. Regional and Remote categories together account for **31.8% of hospitalisations** but **35.6% of bed days**. | `remoteness_yearly_trends.csv` |
| **Age and inpatient demand** | Ages 40–64 account for **133,729 hospitalisations (32.5%)**. Ages 65+ account for **13.0% of hospitalisations** but **22.8% of bed days**. Ages 75+ average **10.04 bed days per hospitalisation**. | `age_group_summary.csv` |
| **Sex distribution** | Male records account for **266,763 hospitalisations (64.9%)**; female records account for **144,106 (35.1%)**. The remaining 15 belong to the combined source category described above. | `Gender_demographic_summary.csv` |
| **Non-collision events** | **106,112 cases (26.3%)** fall within non-collision transport accidents, using the counterparty table's **403,293-case** denominator. Counterparty categories do not establish fault. | `Counterparty Analysis.csv` |
| **First Nations annual trend** | Recorded counts rose from **1,167 to 2,220 (+90.2%)**, compared with **+14.9%** for Non-Indigenous Australians. This describes count growth, not a change in individual risk. | `first_nations_annual_comparison_t1.csv` |
| **First Nations geography** | Regional/Remote categories account for **65.7%** of First Nations records in the remoteness table. Remote represents **25.9%** of First Nations and **2.1%** of Non-Indigenous table totals. | `first_nations_remoteness.csv` |
| **First Nations age composition, 2021 only** | People under 26 account for **47.9%** of First Nations hospitalisations versus **28.2%** of Non-Indigenous hospitalisations. This compares hospitalisation composition, not age-specific population risk. | `first_nations_age_group.csv` |

### 8. Presentation Preparation

A **20-slide content outline** and continuation instructions have been prepared for updating the existing Canva presentation. The outline uses the current age and road-user summaries, adds geographic bed-day demand and First Nations comparisons, and retains source definitions and limitations.

| Slides | Narrative |
| :--- | :--- |
| **1–4** | Project introduction, national burden, annual trends, and inpatient demand. |
| **5–10** | Jurisdictions, remoteness, road-user volume/change, pedestrian bed days, and sex distribution. |
| **11–14** | Updated age distribution, older-adult bed-day demand, national counterparty analysis, and geographic bed-day comparisons. |
| **15–18** | First Nations annual trends, geographic distribution, the reconciled 2021 age comparison, and selected road-user comparisons using their own table totals. |
| **19–20** | Data limitations and evidence-based takeaways. |

The First Nations counterparty export is excluded from the presentation analysis until corrected. The content outline does not establish that a finished Canva deck has been exported or verified.

### 9. Current Progress & Next Steps

#### Completed

- [x] Established the repository, team details, project purpose, audiences, and source documentation.
- [x] Built national, state/territory, and First Nations KNIME preparation/export workflows.
- [x] Added 17 cleaned CSV exports, including corrected age, road-user, and remoteness summary schemas.
- [x] Implemented six dashboard views, KPI cards, interactive charts, sortable tables, and chart expansion controls.
- [x] Reconciled active national category summaries against annual hospitalisations and bed days across all 11 years.
- [x] Calculated updated national, geographic, demographic, road-user, and qualified First Nations findings.
- [x] Prepared the 20-slide presentation content outline and Canva continuation instructions.

#### Remaining work

1. Correct the First Nations counterparty workflow branch and re-export the actual counterparty table.
2. Preserve unpublished First Nations values as missing, then investigate and reconcile the age and road-user discrepancies against the original source tables.
3. Revalidate affected CSVs, chart interpretations, percentages, and presentation figures after any re-export.
4. Improve First Nations chart comparisons and make count-only metrics and control scope clearer in the interface.
5. Complete the Project Design Book and verify dashboard rendering, interactions, responsiveness, and accessibility in browsers.
6. Apply the presentation updates in Canva and verify every displayed figure, chart, and source footer against the appropriate CSV.
