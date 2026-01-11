// src/views/socialFactorsView.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export async function initSocialFactorsView() {
  const root = d3.select("#socialFactorsRoot");
  root.selectAll("*").remove();

  // ===== CONFIG =====
  const CSV_PATH = "data/lifestyle_individual_final.csv";
  const P_QUANTILE = 0.20;
  const MIN_N = 50;
  const TOP_N = 5;

  // ===== Layout =====
  const wrap = root.append("div").attr("class", "sf-wrap");

  // Filters (ONLY: Gender + Age)
  const filters = wrap.append("div").attr("class", "sf-filters");

  const fg = filters.append("div").attr("class", "sf-filter");
  fg.append("div").attr("class", "sf-filter-label").text("Gender");
  const selGender = fg.append("select").attr("class", "sf-select").attr("id", "sfGender");

  const fa = filters.append("div").attr("class", "sf-filter");
  fa.append("div").attr("class", "sf-filter-label").text("Age group");
  const selAge = fa.append("select").attr("class", "sf-select").attr("id", "sfAge");

  // Insights row
  const insights = wrap.append("div").attr("class", "sf-insights");

  const kpiGrid = insights.append("div").attr("class", "sf-kpi-grid");

  function kpiCard(label, valueId, subId) {
    const k = kpiGrid.append("div").attr("class", "sf-kpi");
    k.append("div").attr("class", "sf-kpi-label").text(label);
    k.append("div").attr("class", "sf-kpi-value").attr("id", valueId).text("—");
    k.append("div").attr("class", "sf-kpi-sub").attr("id", subId).text("—");
  }

  kpiCard("Top factor", "sf-kpi-top", "sf-kpi-top-sub");
  kpiCard("Δ (Protective − Risk)", "sf-kpi-delta", "sf-kpi-delta-sub");
  kpiCard("Baseline", "sf-kpi-base", "sf-kpi-base-sub");

  const how = insights.append("div").attr("class", "sf-how");
  how.html(`
    <div class="sf-how-title">How to read</div>
    <div class="sf-how-row"><span class="sf-dot sf-dot-risk"></span><b>Risk</b> group</div>
    <div class="sf-how-row"><span class="sf-dot sf-dot-prot"></span><b>Protective</b> group</div>
  `);

  // Chart card
  const card = wrap.append("div").attr("class", "sf-card");
  const chart = card.append("div").attr("class", "sf-chart");

  const legend = card.append("div").attr("class", "sf-legend");
  legend.html(`
    <span class="sf-chip sf-chip-soft">Δ = Protective − Risk</span>
    <span class="sf-chip sf-chip-soft">baseline = moyenne hapiness score pour la polulation sélectioné </span>
  `);

  const tooltip = card.append("div").attr("class", "sf-tooltip").style("opacity", 0);

  // ===== Helpers =====
  const fmt2 = d3.format(".2f");

  function toNum(x) {
    const v = +x;
    return Number.isFinite(v) ? v : NaN;
  }

  // ✅ FIX: only Male/Female accepted, everything else is ignored (null)
  function normalizeGender(x) {
    const g = (x ?? "").toString().trim().toLowerCase();
    if (["m", "male", "man"].includes(g) || (g.includes("male") && !g.includes("female"))) return "Male";
    if (["f", "female", "woman"].includes(g) || g.includes("female")) return "Female";
    return null; // ✅ no "Other", no "Unknown"
  }

  function activityCat(x) {
    const v = (x ?? "").toString().trim().toLowerCase();
    if (!v) return "Unknown";
    if (v.includes("low")) return "Low";
    if (v.includes("moderate")) return "Moderate";
    if (v.includes("high")) return "High";
    return "Unknown";
  }

  function sleepCat(h) {
    if (!Number.isFinite(h)) return "Unknown";
    if (h < 6) return "Short (<6h)";
    if (h <= 8) return "Normal (6–8h)";
    return "Long (>8h)";
  }

  function safeMean(arr) {
    let s = 0, n = 0;
    for (const v of arr) if (Number.isFinite(v)) { s += v; n++; }
    return n ? s / n : NaN;
  }

  function quantileThreshold(values, q) {
    const v = values.filter(Number.isFinite).sort(d3.ascending);
    if (!v.length) return NaN;
    return d3.quantile(v, q);
  }

  // ===== Factors =====
  const FACTORS = [
    {
      id: "activity",
      label: "Physical activity (low vs high)",
      kind: "category",
      riskLabel: "Risk: low activity",
      protLabel: "Protective: high activity",
      buildGroups: (df) => ({
        risk: df.filter(d => d.activity_cat === "Low"),
        prot: df.filter(d => d.activity_cat === "High"),
        qLow: NaN, qHigh: NaN
      })
    },
    {
      id: "sleep",
      label: "Sleep (short vs normal)",
      kind: "category",
      riskLabel: "Risk: short sleep (<6h)",
      protLabel: "Protective: normal sleep (6–8h)",
      buildGroups: (df) => ({
        risk: df.filter(d => d.sleep_cat === "Short (<6h)"),
        prot: df.filter(d => d.sleep_cat === "Normal (6–8h)"),
        qLow: NaN, qHigh: NaN
      })
    },
    {
      id: "stress",
      label: "Stress (high vs low)",
      kind: "quantile",
      riskLabel: `Risk: top ${(P_QUANTILE * 100) | 0}% stress`,
      protLabel: `Protective: bottom ${(P_QUANTILE * 100) | 0}% stress`,
      buildGroups: (df) => {
        const vals = df.map(d => d.stress_level);
        const qLow = quantileThreshold(vals, P_QUANTILE);
        const qHigh = quantileThreshold(vals, 1 - P_QUANTILE);
        return {
          risk: df.filter(d => Number.isFinite(d.stress_level) && Number.isFinite(qHigh) && d.stress_level >= qHigh),
          prot: df.filter(d => Number.isFinite(d.stress_level) && Number.isFinite(qLow) && d.stress_level <= qLow),
          qLow, qHigh
        };
      }
    },
    {
      id: "support",
      label: "Social support (low vs high)",
      kind: "quantile",
      riskLabel: `Risk: bottom ${(P_QUANTILE * 100) | 0}% support`,
      protLabel: `Protective: top ${(P_QUANTILE * 100) | 0}% support`,
      buildGroups: (df) => {
        const vals = df.map(d => d.social_support);
        const qLow = quantileThreshold(vals, P_QUANTILE);
        const qHigh = quantileThreshold(vals, 1 - P_QUANTILE);
        return {
          risk: df.filter(d => Number.isFinite(d.social_support) && Number.isFinite(qLow) && d.social_support <= qLow),
          prot: df.filter(d => Number.isFinite(d.social_support) && Number.isFinite(qHigh) && d.social_support >= qHigh),
          qLow, qHigh
        };
      }
    },
    {
      id: "screen",
      label: "Screen time (high vs low)",
      kind: "quantile",
      riskLabel: `Risk: top ${(P_QUANTILE * 100) | 0}% screen`,
      protLabel: `Protective: bottom ${(P_QUANTILE * 100) | 0}% screen`,
      buildGroups: (df) => {
        const vals = df.map(d => d.screen_time_hours);
        const qLow = quantileThreshold(vals, P_QUANTILE);
        const qHigh = quantileThreshold(vals, 1 - P_QUANTILE);
        return {
          risk: df.filter(d => Number.isFinite(d.screen_time_hours) && Number.isFinite(qHigh) && d.screen_time_hours >= qHigh),
          prot: df.filter(d => Number.isFinite(d.screen_time_hours) && Number.isFinite(qLow) && d.screen_time_hours <= qLow),
          qLow, qHigh
        };
      }
    }
  ];

  // ===== Load =====
  const raw = await d3.csv(CSV_PATH);
  const data = raw
    .map(d => {
      const sleep = toNum(d.sleep_hours);
      return {
        age_group: (d.age_group ?? "Unknown").toString().trim() || "Unknown",
        gender: normalizeGender(d.gender),
        stress_level: toNum(d.stress_level),
        social_support: toNum(d.social_support),
        screen_time_hours: toNum(d.screen_time_hours),
        sleep_cat: sleepCat(sleep),
        activity_cat: activityCat(d.physical_activity),
        mental_health_score: toNum(d.mental_health_score),
      };
    })
    .filter(d => Number.isFinite(d.mental_health_score))
    .filter(d => d.gender); // ✅ only Male/Female rows kept

  // Populate filters
  const ages = Array.from(new Set(data.map(d => d.age_group))).sort(d3.ascending);

  // ✅ FIX: force only 3 options
  selGender.selectAll("option").remove();
  selGender.append("option").attr("value", "All").text("All");
  ["Female", "Male"].forEach(g => selGender.append("option").attr("value", g).text(g));

  selAge.selectAll("option").remove();
  selAge.append("option").attr("value", "All").text("All");
  ages.forEach(a => selAge.append("option").attr("value", a).text(a));

  selGender.property("value", "All");
  selAge.property("value", "All");

  // ===== Chart =====
  const margin = { top: 20, right: 22, bottom: 44, left: 320 };
  const width = 1100;
  const rowH = 64;

  const svg = chart.append("svg")
    .attr("class", "sf-svg")
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto");

  const gMain = svg.append("g");
  const gGrid = gMain.append("g").attr("class", "sf-grid");
  const gAxisX = gMain.append("g").attr("class", "sf-axis");
  const gRows = gMain.append("g").attr("class", "sf-rows");

  function getFiltered() {
    const g = selGender.property("value");
    const a = selAge.property("value");
    let out = data;
    if (g !== "All") out = out.filter(d => d.gender === g);
    if (a !== "All") out = out.filter(d => d.age_group === a);
    return out;
  }

  function computeRows(df) {
    const out = [];
    for (const f of FACTORS) {
      const { risk, prot, qLow, qHigh } = f.buildGroups(df);

      const riskScores = risk.map(d => d.mental_health_score).filter(Number.isFinite);
      const protScores = prot.map(d => d.mental_health_score).filter(Number.isFinite);

      if (riskScores.length < MIN_N || protScores.length < MIN_N) continue;

      const meanRisk = safeMean(riskScores);
      const meanProt = safeMean(protScores);
      if (!Number.isFinite(meanRisk) || !Number.isFinite(meanProt)) continue;

      const delta = meanProt - meanRisk;
      out.push({
        id: f.id,
        label: f.label,
        kind: f.kind,
        riskLabel: f.riskLabel,
        protLabel: f.protLabel,
        qLow, qHigh,
        nRisk: riskScores.length,
        nProt: protScores.length,
        meanRisk, meanProt,
        delta,
        absDelta: Math.abs(delta)
      });
    }
    out.sort((a, b) => d3.descending(a.absDelta, b.absDelta));
    return out.slice(0, TOP_N);
  }

  function showTooltip(event, d) {
    const rect = card.node().getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const extra = d.kind === "quantile"
      ? `<div class="sf-tt-muted">Thresholds: low ≤ <b>${fmt2(d.qLow)}</b> • high ≥ <b>${fmt2(d.qHigh)}</b></div>`
      : `<div class="sf-tt-muted">Category-based comparison</div>`;

    tooltip
      .style("opacity", 1)
      .style("left", (x + 12) + "px")
      .style("top", (y + 12) + "px")
      .html(`
        <div class="sf-tt-title">${d.label}</div>
        <div class="sf-tt-row"><span class="sf-dot sf-dot-risk"></span>
          <span class="sf-tt-muted">${d.riskLabel}</span>
          <span class="sf-tt-val"><b>${fmt2(d.meanRisk)}</b></span>
        </div>
        <div class="sf-tt-row"><span class="sf-dot sf-dot-prot"></span>
          <span class="sf-tt-muted">${d.protLabel}</span>
          <span class="sf-tt-val"><b>${fmt2(d.meanProt)}</b></span>
        </div>
        <div class="sf-tt-delta">Δ = <b>${d.delta >= 0 ? "+" : ""}${fmt2(d.delta)}</b></div>
        ${extra}
      `);
  }
  function hideTooltip() { tooltip.style("opacity", 0); }

  function render() {
    const df = getFiltered();
    const baseline = safeMean(df.map(d => d.mental_health_score));
    const rows = computeRows(df);

    const top = rows[0];

    d3.select("#sf-kpi-top").text(top ? top.label : "—");
    d3.select("#sf-kpi-delta").text(top ? `${top.delta >= 0 ? "+" : ""}${fmt2(top.delta)}` : "—");
    d3.select("#sf-kpi-base").text(Number.isFinite(baseline) ? fmt2(baseline) : "—");

    d3.select("#sf-kpi-top-sub").text("");
    d3.select("#sf-kpi-delta-sub").text("");
    d3.select("#sf-kpi-base-sub").text("");

    gRows.selectAll("*").remove();
    gGrid.selectAll("*").remove();
    gAxisX.selectAll("*").remove();

    if (!rows.length) {
      svg.attr("viewBox", `0 0 ${width} 240`);
      gRows.append("text")
        .attr("class", "sf-empty")
        .attr("x", margin.left)
        .attr("y", 90)
        .text("Not enough data for this filter. Try All / All.");
      return;
    }

    const height = margin.top + margin.bottom + rows.length * rowH;
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const means = rows.flatMap(r => [r.meanRisk, r.meanProt]).filter(Number.isFinite);
    let xMin = d3.min(means), xMax = d3.max(means);
    const pad = (xMax - xMin) * 0.18 || 1;
    xMin -= pad; xMax += pad;

    const x = d3.scaleLinear().domain([xMin, xMax]).range([margin.left, width - margin.right]).nice();
    const y = (i) => margin.top + i * rowH + rowH / 2;

    const ticks = x.ticks(6);
    gGrid.selectAll("line")
      .data(ticks)
      .enter()
      .append("line")
      .attr("x1", d => x(d)).attr("x2", d => x(d))
      .attr("y1", margin.top).attr("y2", height - margin.bottom);

    gAxisX.attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(6));

    const base = gMain.selectAll("g.sf-baseline").data([baseline]).join("g").attr("class", "sf-baseline");
    base.selectAll("*").remove();
    base.append("line")
      .attr("class", "sf-baseline-line")
      .attr("x1", x(baseline)).attr("x2", x(baseline))
      .attr("y1", margin.top).attr("y2", height - margin.bottom);

    base.append("text")
      .attr("class", "sf-baseline-label")
      .attr("x", x(baseline) + 6)
      .attr("y", margin.top - 8)
      .text(`baseline: ${fmt2(baseline)}`);

    const row = gRows.selectAll("g.sf-row")
      .data(rows, d => d.id)
      .enter()
      .append("g")
      .attr("class", "sf-row")
      .attr("transform", (d, i) => `translate(0,${y(i)})`);

    row.append("text")
      .attr("class", "sf-row-label")
      .attr("x", margin.left - 16)
      .attr("y", -10)
      .attr("text-anchor", "end")
      .text(d => d.label);

    row.append("text")
      .attr("class", "sf-row-meta")
      .attr("x", margin.left - 16)
      .attr("y", 12)
      .attr("text-anchor", "end")
      .text(d => `Δ=${(d.delta >= 0 ? "+" : "")}${fmt2(d.delta)} `);

    row.append("line")
      .attr("class", "sf-link-line")
      .attr("x1", d => x(d.meanRisk))
      .attr("x2", d => x(d.meanProt))
      .attr("y1", 0).attr("y2", 0);

    row.append("circle")
      .attr("class", "sf-pt sf-pt-risk")
      .attr("r", 7)
      .attr("cx", d => x(d.meanRisk));

    row.append("circle")
      .attr("class", "sf-pt sf-pt-prot")
      .attr("r", 7)
      .attr("cx", d => x(d.meanProt));

    row.append("text")
      .attr("class", "sf-delta")
      .attr("x", d => (x(d.meanRisk) + x(d.meanProt)) / 2)
      .attr("y", -18)
      .attr("text-anchor", "middle")
      .text(d => (d.delta >= 0 ? "+" : "") + fmt2(d.delta));

    row.append("rect")
      .attr("x", margin.left)
      .attr("y", -rowH / 2 + 8)
      .attr("width", width - margin.left - margin.right)
      .attr("height", rowH - 16)
      .attr("fill", "transparent")
      .on("mousemove", (event, d) => showTooltip(event, d))
      .on("mouseleave", hideTooltip)
      .on("mouseenter", function () { d3.select(this.parentNode).classed("is-hover", true); })
      .on("mouseout", function () { d3.select(this.parentNode).classed("is-hover", false); });
  }

  selGender.on("change", render);
  selAge.on("change", render);

  render();
}
