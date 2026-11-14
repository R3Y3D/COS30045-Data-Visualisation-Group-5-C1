# COS30045 Data Visualisation — Group 5 (C1)

## Australian Road Crash Hospitalised Injuries (2011–2021)

An interactive **D3.js dashboard** exploring national hospitalisation counts, hospital bed days, jurisdictions, road users, demographics, remoteness, and Indigenous-status comparisons.

**Last updated:** 14 November 2026.

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

### 1. Current Data Sources

The website loads **all 15 current CSV files from `Data/Cleaned_CSV/`**. The corresponding preparation workflows are in **`Data/Cleaned_KNWF/`**. The historical `Cleaned_CSV_Files` directory is excluded from the application. The old embedded data snapshot is no longer loaded or used as a fallback.

The three source workbooks cleaned with KNIME are:

| Source workbook | Scope |
| :--- | :--- |
| `First-Nations-hospitalised-injuries-2023.xlsx` | First Nations and Non-Indigenous hospitalised injuries. |
| `state-and-territory-hospitalisation-injury-publication-2023.xlsx` | State and territory breakdowns. |
| `hospitalisation_injury_publication_sep2023 (1).xlsx` | National hospitalised injury data. |

The source publications are the **Bureau of Infrastructure and Transport Research Economics (BITRE)** hospitalised injury series, using **Australian Institute of Health and Welfare (AIHW)** National Hospital Morbidity Database data and **Australian Bureau of Statistics (ABS)** classifications. Original workbooks are not bundled in this repository.

Current workflows:

- [National preparation/export workflow](Data/Cleaned_KNWF/hospitalisation_injury_publication.knwf)
- [State and territory workflow](Data/Cleaned_KNWF/state_and_teritory_data.knwf)
- [First Nations workflow](Data/Cleaned_KNWF/First-Nations-hospitalised-injuries-2023.knwf)

### 2. Run Locally

Serve the repository over HTTP to allow CSV loading. For example, with Python 3 available, run from the repository root:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open **http://127.0.0.1:8000/** in a modern browser, or use an existing VS Code Live Server. Stop the Python server with **Ctrl+C**. Opening `index.html` through `file://` can prevent CSV loading.

This is a buildless HTML/CSS/JavaScript application. D3.js v7 and Google Fonts load from external hosts, so internet access is needed for those resources. A failed CSV request displays an error and leaves the KPI placeholders empty; historical data is never substituted.

### 3. Dashboard Views & Controls

| View | Content |
| :--- | :--- |
| **Overview** | National annual counts, male/female annual trends, bed days per case, sortable annual summaries, and 2011–2021 road-user changes. |
| **States** | Eight-jurisdiction comparison and a sortable state/territory table. |
| **Road users** | Road-user and counterparty charts and complete source-category tables. The national counterparty chart includes all 10 categories. |
| **Regions** | National Major Cities, Regional, and Remote trends, with Missing retained in table totals and percentage denominators. |
| **Demographics** | Age chart, sex summary, and sortable age and sex tables. National age and sex summaries are derived from `national_age_gender.csv`. |
| **First Nations** | Both reported Indigenous-status series, plus remoteness, road-user, age, and counterparty charts for the selected population group. |

- **Metric:** switches charts between cases and bed days, including the First Nations charts.
- **Year:** scopes category breakdowns and national total KPI cards. Annual charts retain their full series; the road-user changes table always compares 2011 and 2021.
- **Jurisdiction:** highlights a state in the state comparison and scopes road-user, counterparty, age, and sex breakdowns to its dedicated state exports. Selecting Australia returns these breakdowns to the national exports. This control is disabled in views without jurisdiction-level data.
- **Population group:** appears in the First Nations view and selects `First Nations people` or `Non-Indigenous` for its category charts. The annual comparison continues to show both groups.
- **National KPIs:** retain Australia-wide coverage regardless of jurisdiction or population-group selection. The top-jurisdiction card uses the jurisdiction table's own denominator.
- **Interactions:** annual marks/rows select a year; supported state and regional selections highlight records; table headings sort by mouse or keyboard; panels expand and close with Escape or the backdrop. Reset restores all years, cases, Australia, and First Nations people.

The existing visual theme is retained. Charts adjust to available width, and tables scroll within their panels on small screens.

### 4. Current CSV Inventory

All paths below are relative to **`Data/Cleaned_CSV/`**. Row counts exclude headers. Every file is loaded by `js/load-data.js`.

| CSV path | Rows | Dimensions / use |
| :--- | ---: | :--- |
| `hospitilisation/national_annual.csv` | 11 | National annual cases, bed days, and exported bed days per case. |
| `hospitilisation/national_road_user.csv` | 132 | Year × 12 road-user categories. |
| `hospitilisation/national_remoteness.csv` | 44 | Year × remoteness, including Missing. |
| `hospitilisation/national_counterparty.csv` | 110 | Year × 10 counterparty/event categories. |
| `hospitilisation/national_age_gender.csv` | 165 | Year × age × gender, retaining source classifications. |
| `state_territory/state_year.csv` | 88 | Year × eight jurisdictions. |
| `state_territory/state_road_user.csv` | 696 | Year × jurisdiction × road-user category, with suppression metadata. |
| `state_territory/state_age.csv` | 616 | Year × jurisdiction × age, with suppression metadata. |
| `state_territory/state_gender.csv` | 176 | Year × jurisdiction × gender. |
| `state_territory/state_counterparty.csv` | 352 | Year × jurisdiction × four counterparty/event categories. |
| `first_nation/fn_year.csv` | 22 | Year × two reported Indigenous-status groups. |
| `first_nation/fn_road_user.csv` | 176 | Year × status × eight road-user categories, with suppression metadata. |
| `first_nation/fn_age.csv` | 132 | Year × status × six age categories, with suppression metadata. |
| `first_nation/fn_remoteness.csv` | 66 | Year × status × three remoteness classifications. |
| `first_nation/fn_counterparty.csv` | 88 | Year × status × four counterparty/event categories. |

### 5. Definitions & Handling of Unpublished Values

All current exports use `year`, `cases`, and `bed_days`, with additional category fields. The application normalises those rows for the existing charts without changing the CSV files.

**Counting bases differ:** the current national workflow maps `Hospitalisations` to `cases` and `Bed days` to `bed_days`. The state workflow uses cases and bed days excluding deaths in hospital within 30 days. The First Nations workflow maps `Hospitalisations` to `cases`, while its bed-day column excludes deaths in hospital within 30 days. These tables must retain their own coverage and denominators.

**Suppression is preserved:**

- Empty or unpublished cells remain missing, rather than becoming zero.
- `suppressed = Yes` and positive `n_suppressed` values are retained through filtering and aggregation.
- A numeric value with suppressed contributors is displayed as a **published subtotal marked †**. A wholly unavailable value is displayed as **Suppressed / unavailable**, with no invented bar.
- Flagged zero aggregates are displayed as unavailable rather than as evidence of no injuries.
- Category shares are omitted when suppression or missing values make the displayed source total incomplete. Bed days per case are omitted for affected groups.
- For complete totals, bed days per case are calculated as **sum of bed days ÷ sum of cases**. Exported ratios are not averaged.

The current First Nations counterparty export is a separate, correctly structured table. Its cases and bed days reconcile with `fn_year.csv` by status and year. Geographic and age/road-user totals can still have different coverage or suppressed contributors; they are not forced to match the national series.

Counts describe recorded hospital burden, not unique people, unique crashes, or population/travel-adjusted risk. Source age bands have unequal widths. Differences and time trends do not establish causes.

### 6. Checks & Current Findings

The national road-user, remoteness, counterparty, and combined age/gender exports reconcile with the annual file for both cases and bed days in every year. The loader checks these totals before showing the dashboard.

| National measure, 2011–2021 | Value |
| :--- | ---: |
| Hospitalisations / cases | **410,884** |
| Hospital bed days | **2,018,891** |
| Aggregate bed days per case | **4.91** |
| Annual case change, 2011–2021 | **+16.1%** |
| Peak case year | **2019 — 39,866 cases** |
| Peak bed-day year | **2016 — 219,157 days** |

These values are derived from the current national exports. State and Indigenous-status charts use their own current files, rather than the national total as a substitute denominator. Presentation figures and earlier findings should be checked against these current exports before reuse, particularly the expanded national counterparty categories and suppressed breakdowns.

Run the dependency-free data regression checks with Node.js:

```powershell
node --test tests/data-model.test.cjs
```

The tests cover missing versus zero values, real fully withheld and partial cells, weighted bed-day ratios, national annual reconciliation, missing/combined demographic categories, First Nations counterparty reconciliation, and jurisdiction filtering.

Browser verification covers all six views in both metrics, year and population selection, suppressed state records, current-source-only requests, failure without historical fallback, expansion/Escape, and desktop/mobile layout. Browser captures and the temporary verification harness are development checks, not source data.

### 7. Repository Structure

```text
.
|-- index.html                     Dashboard entry point
|-- assets/                        Logo and favicon
|-- css/styles.css                 Styling and responsive layouts
|-- js/
|   |-- data-model.js              Parsing, filtering, aggregation, suppression
|   |-- shared-constants.js        State, formatting, scope and tooltip helpers
|   |-- load-data.js               Registry of all 15 CSVs, validation and controls
|   |-- category-charts.js         Shared suppression-aware category charts
|   |-- first-nations-charts.js    Status trends and category charts
|   |-- tables.js                  Sortable source-category tables
|   `-- *-chart.js / overview-charts.js
|-- tests/data-model.test.cjs       Data regression checks
|-- Data/
|   |-- Cleaned_CSV/               Active CSV inputs, in three subdirectories
|   `-- Cleaned_KNWF/              Three current preparation workflows
`-- README.md
```

The current CSV and workflow folders are input sources. Dashboard changes update the application code and documentation while retaining the data exports themselves.
