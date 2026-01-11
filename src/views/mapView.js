// src/views/mapView.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { loadAllData } from "../services/dataService.js";
import { subscribe, getState, updateState } from "../state.js";

const WIDTH = 900;
const HEIGHT = 520;

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

function normalizeCountryName(name) {
  return COUNTRY_NAME_MAP[name] || name;
}

function fmt(v) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(+v).toFixed(1)}`;
}

function median(values) {
  const a = values.slice().sort((x, y) => x - y);
  const n = a.length;
  if (!n) return null;
  const mid = Math.floor(n / 2);
  return n % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

export async function initMapView() {
  const { world, geo } = await loadAllData();
  let currentState = getState();

  const tooltip = d3.select("#tooltip");
  const selectionLabel = document.getElementById("selection-label");




const kpiYear = document.getElementById("kpi-year");
const kpiSex  = document.getElementById("kpi-sex");
const kpiAge  = document.getElementById("kpi-age");

  // UI refs (auto-explicatif)
  const chipYear = document.getElementById("chip-year");
  const chipSex  = document.getElementById("chip-sex");
  const chipAge  = document.getElementById("chip-age");
  const coverageChip = document.getElementById("coverage-chip");

  const kpiMax = document.getElementById("kpi-max");
  const kpiMaxCountry = document.getElementById("kpi-max-country");
  const kpiMedian = document.getElementById("kpi-median");
  const kpiMin = document.getElementById("kpi-min");
  const kpiMinCountry = document.getElementById("kpi-min-country");
  const top3List = document.getElementById("top3-list");


  // SVG
  const svg = d3.select("#map").append("svg").attr("width", "100%").attr("height", HEIGHT);
  const g = svg.append("g");

  const projection = d3.geoNaturalEarth1().scale(170).translate([WIDTH / 2, HEIGHT / 2]);
  const path = d3.geoPath().projection(projection);

  const zoom = d3.zoom().scaleExtent([1, 4]).on("zoom", (event) => g.attr("transform", event.transform));
  svg.call(zoom);

  // Data lookup
  const dataByKey = new Map();
  geo.forEach(d => {
    const key = `${d.country}|${d.year}|${d.sex}|${d.age_group}`;
    dataByKey.set(key, d.suicide_rate);
  });

  const allRates = geo.map(d => d.suicide_rate).filter(v => !isNaN(v));
  const colorScale = d3.scaleQuantile()
    .domain(allRates)
    .range(["#f7fbff","#deebf7","#c6dbef","#9ecae1","#6baed6","#4292c6","#2171b5","#084594"]);

  function getRate(countryName) {
    const csvName = normalizeCountryName(countryName);
    const key = `${csvName}|${currentState.year}|${currentState.sex}|${currentState.ageGroup}`;
    return dataByKey.has(key) ? dataByKey.get(key) : null;
  }

  function computeSlice() {
    const rows = [];
    for (const c of world) {
      const name = c.properties.name;
      const v = getRate(name);
      if (v != null && !Number.isNaN(v)) rows.push({ name, v });
    }
    rows.sort((a, b) => b.v - a.v);
    return rows;
  }

  let selectedTopoName = null;

  // Draw map
  const countryPaths = g.selectAll("path")
    .data(world)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .on("mousemove", (event, d) => {
      const name = d.properties.name;
      const value = getRate(name);

      tooltip
        .style("opacity", 1)
        .style("transform", "translateY(0)")
        .style("left", (event.clientX + 14) + "px")
        .style("top", (event.clientY - 18) + "px")
        .html(`
          <h3>${name}</h3><br/>
          <span style="font-size:11px;opacity:.9;">
            ${currentState.year} • ${currentState.sex} • ${currentState.ageGroup}
          </span><br/>
          ${
            value !== null
              ? `Taux de suicide : <b>${(+value).toFixed(1)}</b> / 100k`
              : `<span style="color:#d1d5db;"><i>Aucune donnée</i></span>`
          }
          <div style="opacity:.75;margin-top:6px;font-size:11px">Clique pour ouvrir les détails</div>
        `);
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0).style("transform", "translateY(-6px)");
    })
    .on("click", (_, d) => {
      const name = d.properties.name;
      selectCountry(name);
    });

  function selectCountry(name) {
    selectedTopoName = name;
    countryPaths.classed("selected", c => c.properties.name === name);

    updateState({ selectedCountry: name });

    const value = getRate(name);

    if (typeof window.openCountryModal === "function") {
      window.openCountryModal({
        title: name,
        subtitle: `Année : ${currentState.year} `
      });
    }

    if (selectionLabel) {
      selectionLabel.textContent =
        `${name} — ${value == null ? "pas de données" : (+value).toFixed(1) + " / 100k"} (${currentState.year}, ${currentState.sex}, ${currentState.ageGroup})`;
    }
  }

  function updateChipsAndInsights() {
    // chips
    chipYear && (chipYear.textContent = `Année: ${currentState.year}`);
    chipSex  && (chipSex.textContent  = `Sexe: ${currentState.sex}`);
    chipAge  && (chipAge.textContent  = `Âge: ${currentState.ageGroup}`);
    kpiYear && (kpiYear.textContent = currentState.year);
    kpiSex  && (kpiSex.textContent  = currentState.sex);
    kpiAge  && (kpiAge.textContent  = currentState.ageGroup);


    // slice
    const slice = computeSlice();
    const values = slice.map(d => d.v);

    const covered = slice.length;
    const total = world.length;
    const pct = total ? Math.round((covered / total) * 100) : 0;

    coverageChip && (coverageChip.textContent = `Couverture: ${covered}/${total} (${pct}%)`);

    // KPIs
    if (slice.length) {
      const max = slice[0];
      const min = slice[slice.length - 1];
      const med = median(values);

      kpiMax && (kpiMax.textContent = fmt(max.v));
      kpiMaxCountry && (kpiMaxCountry.textContent = max.name);

      kpiMin && (kpiMin.textContent = fmt(min.v));
      kpiMinCountry && (kpiMinCountry.textContent = min.name);

      kpiMedian && (kpiMedian.textContent = fmt(med));
    } else {
      kpiMax && (kpiMax.textContent = "—");
      kpiMaxCountry && (kpiMaxCountry.textContent = "—");
      kpiMin && (kpiMin.textContent = "—");
      kpiMinCountry && (kpiMinCountry.textContent = "—");
      kpiMedian && (kpiMedian.textContent = "—");
    }

    // Top 5 list
  //   if (top5List) {
  //     top5List.innerHTML = "";
  //     const top = slice.slice(0, 5);

  //     if (!top.length) {
  //       top5List.innerHTML = `<div class="muted">Aucune donnée pour cette combinaison.</div>`;
  //     } else {
  //       for (const d of top) {
  //         const item = document.createElement("div");
  //         item.className = "topitem";
  //         item.innerHTML = `
  //           <div class="topitem-name">${d.name}</div>
  //           <div class="topitem-val">${fmt(d.v)}</div>
  //         `;
  //         item.addEventListener("click", () => selectCountry(d.name));
  //         top5List.appendChild(item);
  //       }
  //     }
  //   }
  // }

    // Top 3 list
    if (top3List) {
      top3List.innerHTML = "";
      const top = slice.slice(0, 3);

      if (!top.length) {
        top3List.innerHTML = `<div class="muted">Aucune donnée pour cette combinaison.</div>`;
      } else {
        top.forEach((d, i) => {
          const item = document.createElement("div");
          item.className = "top3-item";
          item.innerHTML = `
            <div class="top3-rank">${i + 1}</div>
            <div class="top3-name">${d.name}</div>
            <div class="top3-val">${fmt(d.v)}</div>
          `;
          item.addEventListener("click", () => selectCountry(d.name));
          top3List.appendChild(item);
        });
      }
    }
  } // ✅ <-- IMPORTANT : fermeture de updateChipsAndInsights()



  function updateMap() {
    // default label
    if (selectionLabel && !currentState.selectedCountry) {
      selectionLabel.textContent = `Survolez un pays pour voir la valeur • Cliquez pour ouvrir les détails`;
    }

    // recolor
    countryPaths
      .transition()
      .duration(380)
      .attr("fill", d => {
        const v = getRate(d.properties.name);
        if (v == null || isNaN(v)) return "#f3f4f6";
        return colorScale(v);
      })
      .attr("class", d => {
        const v = getRate(d.properties.name);
        const base = v == null ? "country no-data" : "country";
        if (selectedTopoName && d.properties.name === selectedTopoName) return base + " selected";
        return base;
      });

    updateChipsAndInsights();
  }

  // Legend
  drawLegend(colorScale);

  // initial
  updateMap();

  // subscribe
  subscribe((newState) => {
    currentState = newState;
    updateMap();

    if (currentState.selectedCountry) {
      selectedTopoName = currentState.selectedCountry;
      countryPaths.classed("selected", c => c.properties.name === selectedTopoName);
    }
  });
}

function drawLegend(colorScale) {
  const svg = d3.select("#legend-svg");
  const w = +svg.attr("width") - 40;
  const colors = colorScale.range();
  const n = colors.length;
  const boxW = w / n;

  svg.selectAll("*").remove();

  svg.append("text")
    .attr("x", 20)
    .attr("y", 18)
    .text("Taux de suicide (par 100 000 hab.)");

  colors.forEach((c, i) => {
    svg.append("rect")
      .attr("x", 20 + i * boxW)
      .attr("y", 30)
      .attr("width", boxW)
      .attr("height", 14)
      .attr("fill", c)
      .attr("stroke", "#e5e7eb");
  });

  const domain = colorScale.domain();
  const scale = d3.scaleLinear()
    .domain([domain[0], domain[domain.length - 1]])
    .range([20, 20 + w]);

  svg.append("g")
    .attr("transform", "translate(0, 50)")
    .call(d3.axisBottom(scale).ticks(5).tickSize(3))
    .selectAll("text")
    .style("font-size", "10px");
}
