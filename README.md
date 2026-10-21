# COS30045 Data Visualisation — Group 5 (C1)
## Non-Fatal Hospitalised Injuries from Road Crashes in Australia (2011–2021)

---

### Unit & Team Details

| Field | Details |
| :--- | :--- |
| **Unit Code & Name** | COS30045 — Data Visualisation |
| **Section & Group** | Section C1 — Group 5 |
| **Lecturer / Teacher** | Rishma Fathima Basher |

#### Team Members
- **Ibrahim Mahbub** — `105684360`
- **Darrshan A/L Muraleesvaran** — `105965528`
- **Nasrul Aman bin Abdul Rashid** — `105556595`

---

### 1. Project Overview & Motivation

Road traffic incidents represent a major public health challenge across Australia. While fatal crashes receive substantial media coverage, **non-fatal hospitalised injuries** impose a much broader, ongoing burden on individuals, families, communities, and the healthcare system. Between 2011 and 2021, annual road crash hospitalisations in Australia rose by approximately **16.1%** (from **34,033** cases in 2011 to **39,505** cases in 2021), totaling **410,884** traffic-related hospitalisations over the 11-year period.

This project develops an interactive **D3.js web-based data visualisation dashboard** designed around analytical storytelling to explore non-fatal road crash hospitalisations across Australia from 2011 to 2021.

#### Target Audience
1. **Road Safety Policymakers & Analysts:** State transport authorities, the National Road Safety Council, and safety advocates seeking actionable evidence for infrastructure investment, legislation, and safety campaigns.
2. **Public Health Researchers:** Analysts investigating injury epidemiology, hospital bed-day burden, and demographic or geographic inequalities.
3. **General Public & Road Users:** Everyday commuters looking to understand risk factors across different road user types, age groups, and regions.

#### Core Analytical Questions
- **National & Temporal Trends:** How have annual hospitalised injury counts and hospital bed days evolved from 2011 to 2021, including shifts during the COVID-19 pandemic?
- **Jurisdictional & Regional Comparisons:** How do hospitalisation trajectories vary across Australia's 8 states and territories, and how do urban, regional, and remote environments (ABS Remoteness Areas) differ in injury burden?
- **Road User Vulnerability & Demographics:** Which road user categories (e.g., car drivers, motorcyclists, pedal cyclists, pedestrians) experience the highest hospitalisation burden, and how does risk vary across age groups, biological sex, and First Nations populations?

---

### 2. Data Sources & Governance

All datasets are sourced from the **Bureau of Infrastructure and Transport Research Economics (BITRE)** *Hospitalised Injury Data* publication series (updated September 2023), compiled from the **Australian Institute of Health and Welfare (AIHW)** National Hospital Morbidity Database (NHMD) and **Australian Bureau of Statistics (ABS)** demographic/geographic classifications.

#### Datasets Used
| Dataset File | Scope & Records | Key Attributes | Reference Period |
| :--- | :--- | :--- | :--- |
| `hospitalisation_injury_publication_sep2023.xlsx` | National Summary Tables & Raw Data (117,919 raw rows; 86,140 traffic rows) | Calendar Year, Month, ABS Remoteness Area, Cause of Injury, Age Group, Sex, Road User, Counterparty, Count of Cases, Bed Days, Hospitalisations | 2011–2021 (Annual) |
| `state-and-territory-hospitalisation-injury-publication-2023.xlsx` | State & Territory Breakdown (1,372 summary rows) | Jurisdiction (NSW, VIC, QLD, SA, WA, TAS, NT, ACT), Road User Counts, Bed Days | 2011–2021 (Annual) |
| `First-Nations-hospitalised-injuries-2023.xlsx` | Indigenous Status Comparison (352 summary rows) | First Nations vs. Non-Indigenous Australians, Age, Remoteness, Counterparty | 2011–2021 (Annual) |
| `hospitalised-injury-data-dictionary-september-2023.pdf` | Metadata Reference Guide (6 pages) | ICD-10-AM definitions, principal diagnosis range (`S00–T98`), external transport cause codes (`V00–V99`) | Static Metadata |

#### Data Governance, Quality & Limitations
- **Privacy & Ethics:** The datasets consist exclusively of publicly released, de-identified aggregate statistical tables. No personal identifiers or confidential patient health records are included.
- **Absolute Counts vs. Per-Capita Rates:** Raw counts reflect total hospitalisation volume rather than population-normalised rates or travel-exposure risk. Direct comparisons between jurisdictions with vastly different population sizes must account for this context.
- **Interrupted Time Series:** Administrative changes in emergency department and hospital admission reporting practices in **New South Wales (from June 2017)** and **Victoria** create structural breaks in historical comparability that are explicitly noted in our narrative.

---

### 3. Data Processing & Exploratory Data Analysis (KNIME)

Data inspection, cleaning, filtering, aggregation, and validation were performed using the **KNIME Analytics Platform**:

1. **Import & Inspection:** Imported 117,919 raw national records across 13 attributes. Inspected missing/suppressed values using the *Statistics* node (`Count of cases`, `Died_cases`, and `Died_bed_days` contained nulls due to reporting suppression rules, whereas `Hospitalisations` and `Bed days` had zero missing values in filtered records).
2. **Filtering:** Used a *Value Counter* and *Row Filter* node (`Cause of injury = Traffic`) to isolate on-road traffic crash injuries from non-traffic and other trauma events, yielding **86,140 valid records**.
3. **Transformation & Aggregation:** Applied multiple *GroupBy* and *Sorter* nodes to compute:
   - Annual national hospitalisations and bed days (2011–2021).
   - Annual hospitalisations broken down by the 12 road-user categories (132 observations).
   - Cumulative hospitalisations by road-user category across the 11-year study period.
4. **Validation:** Cross-checked KNIME aggregated outputs against official BITRE published summary tables, confirming an exact match across all 11 annual totals and the cumulative total of **410,884 hospitalisations**.

#### Key Preliminary Findings
- **Upward Long-Term Trajectory:** National road traffic hospitalisations increased by **16.1%** from 2011 (`34,033`) to 2021 (`39,505`), peaking in 2019 (`39,866`) before a temporary **4.8% dip in 2020** (`37,966`) coinciding with COVID-19 mobility restrictions.
- **Hospital Bed-Day Burden:** Hospital bed days peaked in 2016 at **219,157 days** and reached **198,934 days** in 2021, illustrating that stay duration and admission counts do not always move in lockstep.
- **Road-User Concentration:** Three road-user groups accounted for **73.7%** of all traffic hospitalisations between 2011 and 2021:
  1. **Car Drivers:** 135,063 (32.9%)
  2. **Motorcyclists:** 92,322 (22.5%)
  3. **Pedal Cyclists:** 75,362 (18.3%)
  - Followed by *Car Passengers* (53,241) and *Pedestrians* (28,532).

---

### 4. Project Stand-Up 1 Status

#### Milestones Completed
- [x] Established the COS30045 GitHub Classroom team repository and team communication channels.
- [x] Drafted **Section 1.0 (Introduction)** covering background, motivation, target audiences, and visualisation purpose.
- [x] Collected all BITRE hospitalised injury datasets (National, State/Territory, First Nations) and documented data sources, ICD-10-AM definitions, and governance/quality considerations (**Section 2.1**).
- [x] Built and validated the primary **KNIME workflow** for the National Hospitalised Injuries dataset (**Section 2.2**).
- [x] Completed initial **Exploratory Data Analysis (EDA)** on national longitudinal trends and road-user breakdowns (**Section 2.3**).

#### Current Challenges & Blockers
- **Multi-Table Workbook Structures:** The State/Territory and First Nations Excel workbooks contain complex multi-table layouts that require careful extraction in KNIME to avoid merging summary headers with raw observations.
- **Suppressed & Missing Values:** Handling suppressed cells in smaller demographic/geographic breakdowns without introducing artificial zeros.
- **Reporting Discontinuities:** Communicating the mid-2017 NSW reporting break and lack of per-capita normalisation clearly within visual encodings.

#### Next Steps
1. Extend the KNIME data processing workflow to extract, clean, and validate the **State & Territory** and **First Nations** datasets.
2. Conduct further exploratory analysis across **ABS Remoteness Areas**, **Age Groups**, and **Biological Sex**.
3. Complete the **Project Design Book** (wireframes, visual encoding choices, interaction design, and narrative flow).
4. Initialize the **D3.js** web application architecture and export cleaned CSV/JSON summary datasets from KNIME for interactive charting.

