// src/views/timeSeriesView.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { loadAllData } from "../services/dataService.js";
import { subscribe, getState } from "../state.js";

const COUNTRY_NAME_MAP = {
  "United States of America": "United States",
  "Russian Federation": "Russia",
  "Dem. Rep. Congo": "Democratic Republic of Congo",
  "Côte d'Ivoire": "Cote d'Ivoire",
  "Czechia": "Czech Republic",
  "Central African Rep.": "Central African Republic",
  "W. Sahara": "Morocco",
  "S. Sudan": "South Sudan"
};
function normalizeCountryName(name) { return COUNTRY_NAME_MAP[name] || name; }

const fmt1 = d3.format(".1f");

function nearestByYear(series, year) {
  if (!series?.length) return null;
  let best = series[0];
  let dist = Math.abs(series[0].year - year);
  for (const p of series) {
    const d = Math.abs(p.year - year);
    if (d < dist) { dist = d; best = p; }
  }
  return best;
}

export async function initTimeSeriesView() {
  const { geo } = await loadAllData();
  let currentState = getState();

  const container = d3.select("#timeseries");
  const tooltip = d3.select("#tooltip");

  container.selectAll("*").remove();

  // ===== Header =====
  const header = container.append("div").attr("class", "viz-header");
  header.append("div").attr("class", "viz-title").text("Évolution du taux de suicide");
  header.append("div")
    .attr("class", "viz-subtitle")
    .text("Comparaison Male vs Female (suicide rate) • Survolez pour lire les valeurs.");

  // ===== KPI row (SIMPLE) =====
  const insights = container.append("div").attr("class", "viz-insights");

  const kMale = insights.append("div").attr("class", "viz-kpi kpi-strong");
  kMale.append("div").attr("class", "viz-kpi-label").text("Taux (Male)");
  kMale.append("div").attr("class", "viz-kpi-value").attr("id", "ts-male").text("—");
  //kMale.append("div").attr("class", "viz-kpi-sub").attr("id", "ts-male-sub").text("—");

  const kFemale = insights.append("div").attr("class", "viz-kpi");
  kFemale.append("div").attr("class", "viz-kpi-label").text("Taux (Female)");
  kFemale.append("div").attr("class", "viz-kpi-value").attr("id", "ts-female").text("—");
  //kFemale.append("div").attr("class", "viz-kpi-sub").attr("id", "ts-female-sub").text("—");

  const kAge = insights.append("div").attr("class", "viz-kpi");
  kAge.append("div").attr("class", "viz-kpi-label").text("Âge sélectionné");
  kAge.append("div").attr("class", "viz-kpi-value").attr("id", "ts-age").text("—");
  //kAge.append("div").attr("class", "viz-kpi-sub").attr("id", "ts-age-sub").text("—");

  // ===== Chart sizing =====
  const margin = { top: 30, right: 26, bottom: 46, left: 58 };
  const width = 720;
  const height = 430;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("class", "ts-svg")
    .attr("width", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().range([0, innerWidth]);
  const y = d3.scaleLinear().range([innerHeight, 0]);

  const gridG = g.append("g").attr("class", "ts-grid");
  const xAxisG = g.append("g").attr("transform", `translate(0,${innerHeight})`);
  const yAxisG = g.append("g");

  function drawGrid() {
    gridG.selectAll("*").remove();

    gridG.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(7).tickSize(-innerHeight).tickFormat(""))
      .call(gg => gg.select(".domain").remove())
      .call(gg => gg.selectAll("line").attr("opacity", 0.08));

    gridG.append("g")
      .call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(""))
      .call(gg => gg.select(".domain").remove())
      .call(gg => gg.selectAll("line").attr("opacity", 0.08));
  }

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", -innerHeight / 2)
    .attr("y", -48)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Décès / 100 000 hab.");

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 38)
    .attr("text-anchor", "middle")
    .text("Année");

  const line = d3.line()
    .defined(d => d.value != null && !Number.isNaN(d.value))
    .x(d => x(d.year))
    .y(d => y(d.value));

  // Colors
  const C_MALE = "#1d4ed8";
  const C_FEMALE = "#7c3aed";

  const pathMale = g.append("path").attr("class", "ts-line ts-line-male").attr("stroke", C_MALE);
  const pathFemale = g.append("path").attr("class", "ts-line ts-line-female").attr("stroke", C_FEMALE);

  // Legend
  const legend = g.append("g").attr("transform", "translate(0,-12)");
  [
    { label: "Male", color: C_MALE },
    { label: "Female", color: C_FEMALE }
  ].forEach((item, i) => {
    const grp = legend.append("g").attr("transform", `translate(${i * 120},0)`);
    grp.append("line")
      .attr("x1", 0).attr("x2", 18).attr("y1", 0).attr("y2", 0)
      .attr("stroke", item.color)
      .attr("stroke-width", 4)
      .attr("stroke-linecap", "round");
    grp.append("text")
      .attr("x", 24).attr("y", 4)
      .attr("class", "viz-legend-text")
      .text(item.label);
  });

  // Selected year line
  const selLine = g.append("line")
    .attr("class", "ts-sel-year")
    .attr("y1", 0).attr("y2", innerHeight)
    .style("opacity", 0);

  // hover
  const overlay = g.append("rect")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "transparent");

  const vline = g.append("line")
    .attr("class", "ts-vline")
    .attr("y1", 0).attr("y2", innerHeight)
    .style("opacity", 0);

  const dotsG = g.append("g").style("opacity", 0);
  const dM = dotsG.append("circle").attr("r", 4.5).attr("fill", C_MALE);
  const dF = dotsG.append("circle").attr("r", 4.5).attr("fill", C_FEMALE);

  function clear() {
    pathMale.attr("d", null);
    pathFemale.attr("d", null);
    selLine.style("opacity", 0);
    vline.style("opacity", 0);
    dotsG.style("opacity", 0);
    tooltip.style("opacity", 0);

    d3.select("#ts-male").text("—");
    d3.select("#ts-male-sub").text("Cliquez sur un pays sur la carte.");
    d3.select("#ts-female").text("—");
    d3.select("#ts-female-sub").text("—");
    d3.select("#ts-age").text("—");
    d3.select("#ts-age-sub").text("—");
  }

  function updateTimeSeries(state) {
    currentState = state;

    const selected = state.selectedCountry;
    const age = state.ageGroup;

    // KPI "âge sélectionné" : toujours affiché
    d3.select("#ts-age").text(age || "—");
    d3.select("#ts-age-sub").text("tranche d’âge active");

    if (!selected) { clear(); return; }

    const csvName = normalizeCountryName(selected);

    const dataMale = geo
      .filter(d => d.country === csvName && d.age_group === age && d.sex === "Male" && !isNaN(d.suicide_rate))
      .map(d => ({ year: +d.year, value: +d.suicide_rate }))
      .sort((a, b) => a.year - b.year);

    const dataFemale = geo
      .filter(d => d.country === csvName && d.age_group === age && d.sex === "Female" && !isNaN(d.suicide_rate))
      .map(d => ({ year: +d.year, value: +d.suicide_rate }))
      .sort((a, b) => a.year - b.year);

    const merged = [...dataMale, ...dataFemale];
    if (!merged.length) {
      clear();
      d3.select("#ts-male-sub").text(`Pas de données pour ${selected}.`);
      return;
    }

    x.domain(d3.extent(merged, d => d.year));
    const ymax = d3.max(merged, d => d.value) || 0;
    y.domain([0, ymax * 1.15]);

    drawGrid();
    xAxisG.call(d3.axisBottom(x).ticks(7).tickFormat(d3.format("d")));
    yAxisG.call(d3.axisLeft(y).ticks(6));

    pathMale.datum(dataMale).attr("d", line);
    pathFemale.datum(dataFemale).attr("d", line);

    // Year marker
    const selYear = +state.year;
    selLine.attr("x1", x(selYear)).attr("x2", x(selYear)).style("opacity", 1);

    // ===== KPI Male/Female = valeur à l'année sélectionnée (ou la plus proche) =====
    const pm = nearestByYear(dataMale, selYear);
    const pf = nearestByYear(dataFemale, selYear);

    d3.select("#ts-male").text(pm ? `${fmt1(pm.value)}` : "—");
    d3.select("#ts-male-sub").text(pm ? `année: ${pm.year} • /100k` : "pas de donnée");

    d3.select("#ts-female").text(pf ? `${fmt1(pf.value)}` : "—");
    d3.select("#ts-female-sub").text(pf ? `année: ${pf.year} • /100k` : "pas de donnée");

    // ===== hover interaction =====
    overlay
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const year = Math.round(x.invert(mx));

        const pMale = nearestByYear(dataMale, year);
        const pFem = nearestByYear(dataFemale, year);

        const base = pMale || pFem;
        if (!base) return;

        const cx = x(base.year);
        vline.attr("x1", cx).attr("x2", cx).style("opacity", 1);
        dotsG.style("opacity", 1);

        if (pMale) dM.attr("cx", x(pMale.year)).attr("cy", y(pMale.value));
        if (pFem)  dF.attr("cx", x(pFem.year)).attr("cy", y(pFem.value));

        tooltip
          .style("opacity", 1)
          .style("left", (event.clientX + 14) + "px")
          .style("top", (event.clientY - 18) + "px")
          .html(`
            <strong>${selected}</strong><br/>
            <span style="font-size:11px;opacity:.9;">${age} • ${base.year}</span><br/>
            <span style="color:${C_MALE};font-weight:800;">Male:</span> <b>${pMale ? fmt1(pMale.value) : "—"}</b> /100k<br/>
            <span style="color:${C_FEMALE};font-weight:800;">Female:</span> <b>${pFem ? fmt1(pFem.value) : "—"}</b> /100k
          `);
      })
      .on("mouseleave", () => {
        vline.style("opacity", 0);
        dotsG.style("opacity", 0);
        tooltip.style("opacity", 0);
      });
  }

  subscribe(updateTimeSeries);
  updateTimeSeries(currentState);
}
