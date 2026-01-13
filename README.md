# Mental Health Global Visualization Dashboard

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![D3.js](https://img.shields.io/badge/D3.js-F9A03C?style=flat&logo=d3.js&logoColor=white)](https://d3js.org/)

An **interactive data visualization dashboard** exploring global mental health trends, risk factors, and support systems. This project transforms complex, heterogeneous datasets into clear, explorable visualizations designed for both researchers and the general public.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Dashboard Demonstration (Muted)](#dashboard-demonstration-muted)
- [Architecture](#architecture)
- [Data Sources](#data-sources)
- [Installation and Setup](#installation-and-setup)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Team](#team)

---

## Overview

Mental health is a critical global public health issue with significant social, professional, and individual implications. This dashboard provides an **exploratory and visual approach** to understanding mental health phenomena worldwide through five complementary interactive visualizations.

---

## Key Features

### 1. Interactive World Map
- **Choropleth visualization** of suicide rates per 100,000 inhabitants
- **Dynamic filters** for year, sex, and age group
- **Temporal animation** to observe trends over time
- **Country detail pop-up** with gender-based evolution (time series), age distribution (chord diagram), and key statistics

### 2. Social Factors Analysis
- Comparison of **risk factors vs. protective factors**
- Baseline average with deviation visualization
- Clear color coding (risk: warm tones / protective: cool tones)
- Factors include: stress levels, sleep quality, social support, etc.

### 3. Professional Factors (Sankey Diagram)
- **Storytelling approach** to workplace mental health
- Flow visualization from work conditions to burnout risk
- Interactive hover for detailed pathway exploration
- Limited nodes for optimal readability

### 4. Risk Matrix (Heatmap)
- **Cross-analysis** of social and professional factors
- Intuitive color gradient from low to high risk
- Click-through for detailed cell information
- Clear legend with explicit interpretation guide

### 5. Mental Health Support Overview
- Country-by-country support availability
- **Top N ranking** of countries with best/worst coverage
- Proportion of employees with access to mental health support

---

## Dashboard Demonstration 

<video src="static/Dashboard.mp4" controls muted width="100%">
  Your browser does not support the video tag.
</video>

---

## Architecture

```
+-----------------------------------------------------------------------+
|                              index.html                               |
|                           (Main Entry Point)                          |
+-----------------------------------------------------------------------+
|                                                                       |
|   +-------------+      +-------------+      +-------------------+     |
|   |   main.js   | ---> |   Router    | ---> |      Views        |     |
|   | (Bootstrap) |      | (Hash-based)|      |   (Lazy Load)     |     |
|   +-------------+      +-------------+      +-------------------+     |
|                                                      |                |
+------------------------------------------------------+----------------+
|                           Views Layer                                 |
|                                                                       |
|   +-----------+  +-----------+  +-----------+  +-----------+          |
|   |  mapView  |  |  social   |  |    pro    |  |  heatmap  |          |
|   |           |  |  Factors  |  |  Factors  |  |   Risk    |          |
|   +-----------+  +-----------+  +-----------+  +-----------+          |
|                                                                       |
|   +-----------+  +-----------+  +-----------+                         |
|   |   chord   |  |   time    |  |  support  |                         |
|   |   View    |  |  Series   |  |   Mount   |                         |
|   +-----------+  +-----------+  +-----------+                         |
|                                                                       |
+-----------------------------------------------------------------------+
|                                                                       |
|   +-------------+                +-------------+                      |
|   |  Services   |                |    State    |                      |
|   | (Data Load) |                |  (Global)   |                      |
|   +-------------+                +-------------+                      |
|                                                                       |
+-----------------------------------------------------------------------+
```

### Technology Stack

| Component         | Technology                      |
|-------------------|---------------------------------|
| Visualization     | D3.js v7 (via CDN)              |
| Frontend          | Vanilla JavaScript (ES6 Modules)|
| Styling           | Modular CSS (component-based)   |
| Routing           | Hash-based SPA navigation       |
| Data Format       | CSV                             |

---

## Data Sources

| Dataset                              | Source        | Description                                         |
|--------------------------------------|---------------|-----------------------------------------------------|
| `geo_time_metrics.csv`               | IHME (2019)   | Global suicide rates by country, sex, age, and year |
| `lifestyle_individual_*.csv`         | Kaggle        | Social/behavioral factors (stress, sleep, support)  |
| `mental_health_workplace_survey.csv` | Kaggle/GitHub | Workplace mental health survey data                 |
| `demographic_metrics.csv`            | Aggregated    | Demographic indicators                              |

---

## Installation and Setup

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local HTTP server (required for ES6 modules)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/karima-messaoudi/Mental_health.git
   cd Mental_health
   ```

2. **Start a local server**

   Using Python 3:
   ```bash
   python3 -m http.server 8000
   ```

   Using VS Code:
   - Install the "Live Server" extension
   - Right-click on `index.html` and select "Open with Live Server"

3. **Open in browser**
   ```
   http://localhost:8000
   ```

---

## Usage

### Navigation

The dashboard uses **tab-based navigation** with the following sections:

| Tab                       | Description                                |
|---------------------------|--------------------------------------------|
| Carte (dashboard)         | Interactive world map with filters and KPIs|
| Facteurs sociaux          | Social factors risk/protective analysis    |
| Facteurs professionnels   | Workplace factors Sankey diagram           |
| Matrice de risque         | Cross-factor heatmap                       |
| Support en sante mentale  | Country-wise support availability          |

### Interacting with the Map

1. **Filter data** using the controls panel (year, sex, age)
2. **Hover** over countries to see quick statistics
3. **Click** on a country to open the detailed modal with time series evolution and chord diagram by age group
4. **Animate** through years to observe temporal trends

### Keyboard Shortcuts

| Key   | Action                     |
|-------|----------------------------|
| `Esc` | Close country detail modal |

---

## Project Structure

```
Mental_health/
|-- index.html                  Main HTML entry point
|-- README.md                   This file
|-- data/                       CSV datasets
|   |-- geo_time_metrics.csv
|   |-- lifestyle_individual_*.csv
|   |-- mental_health_workplace_survey.csv
|   +-- demographic_metrics.csv
|
|-- src/                        JavaScript source code
|   |-- main.js                 Application bootstrap and router
|   |-- state.js                Global state management
|   |-- views/                  Visualization components
|   |   |-- mapView.js
|   |   |-- chordView.js
|   |   |-- timeSeriesView.js
|   |   |-- socialFactorsView.js
|   |   |-- proFactorsView.js
|   |   |-- heatmapRiskMount.js
|   |   +-- supportMount.js
|   |-- services/               Data loading utilities
|   |-- ui/                     UI components (controls)
|   |-- heatmap/                Heatmap-specific modules
|   |-- pro/                    Professional factors modules
|   +-- support/                Support visualization modules
|
|-- styles/                     Component-based CSS
|   |-- dashboard.css
|   |-- map.css
|   |-- socialFactors.css
|   |-- proFactors.css
|   |-- heatmapRisk.css
|   |-- support.css
|   +-- timeSeries.css
|
+-- static/                     Static assets
    +-- Dashboard.mp4           Dashboard demo video
```

---


## Team

This project was developed collaboratively with contributions to:

| Visualization           | Contributor   |
|-------------------------|---------------|
| Interactive Map         | Team effort   |
| Social Factors          | Karima        |
| Professional Factors    | Yomna         |
| Risk Matrix             | Oulaiya       |
| Mental Health Support   | Mohamed Reda  |

---

*Built for better understanding of global mental health*
