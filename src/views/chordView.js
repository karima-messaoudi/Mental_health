// src/views/chordView.js
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
function normalizeCountryName(name) {
  return COUNTRY_NAME_MAP[name] || name;
}

const AGE_GROUPS = [
  { label: "18–25", raw: "18-25" },
  { label: "26–35", raw: "26-35" },
  { label: "36–50", raw: "36-50" },
  { label: "50+", raw: "50+" }
];

function parseMentalTokens(value) {
  if (!value) return [];
  return value
    .toString()
    .toLowerCase()
    .split(/[,;|]/)
    .map((d) => d.trim())
    .filter((d) => d.length > 0 && d !== "none" && d !== "no");
}
function prettyLabel(token) {
  if (!token) return "";
  return token.charAt(0).toUpperCase() + token.slice(1);
}
function clampLabel(s, n = 16) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function median(arr) {
  const a = [...arr].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export async function initChordView() {
  const { lifestyle } = await loadAllData();
  let currentState = getState();

  // Clean dataset
  const cleaned = lifestyle
    .map((d) => ({
      country: d.country,
      age_group_raw: d.age_group,
      mh_tokens: parseMentalTokens(d.mental_health_condition)
    }))
    .filter((d) => d.age_group_raw && d.mh_tokens.length > 0);

  const container = d3.select("#chord");
  const tooltip = d3.select("#tooltip");

  // Tooltip safety (souvent le tooltip est “derrière” le modal)
  tooltip.style("z-index", 99999);

  container.selectAll("*").remove();

  // --- Meta + “how to read”
  const meta = container.append("div").attr("class", "viz-meta").text("—");

  

  const pills = container.append("div").attr("class", "viz-mini-legend");
  pills.append("span").attr("class", "pill pill-age").text("Âges (bleu)");
  pills.append("span").attr("class", "pill pill-dis").text("Troubles (gris, Top 4)");

  // --- Stage (ne jamais le supprimer -> sinon la chord “disparaît” après filtre)
  const stage = container
    .append("div")
    .attr("class", "chord-stage")
    // ✅ donne une vraie hauteur dispo dans le modal (sinon rect.height = 0/instable)
    .style("width", "92%")
    .style("height", "520px")
    .style("max-height", "calc(100vh - 260px)");

  // message overlay (au lieu de supprimer le SVG)
  const emptyOverlay = stage
    .append("div")
    .attr("class", "chord-empty")
    .style("display", "none")
    .style("padding", "14px")
    .style("border-radius", "12px")
    .style("border", "1px solid rgba(226,232,240,1)")
    .style("background", "rgba(248,250,252,0.9)")
    .style("color", "#64748b")
    .style("font-size", "13px");

  // SVG (toujours présent)
  const svg = stage
    .append("svg")
    .attr("class", "chord-svg")
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g");

  const groupLayer = g.append("g");
  const ribbonLayer = g.append("g").attr("fill-opacity", 0.58);

  // Layout + shapes
  const chordLayout = d3.chord().padAngle(0.065).sortSubgroups(d3.descending);
  let arc = null;
  let ribbon = null;

  // palette cohérente (bleus + gris)
  const colorAge = d3
    .scaleOrdinal()
    .domain(AGE_GROUPS.map((d) => d.label))
    .range(["#1d4ed8", "#2563eb", "#60a5fa", "#93c5fd"]);

  const GREYS = ["#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

  function buildTopDisorders(rows, TOP_N = 6) {
    const disorderCount = new Map();
    rows.forEach((d) =>
      d.mh_tokens.forEach((tok) => disorderCount.set(tok, (disorderCount.get(tok) || 0) + 1))
    );

    return Array.from(disorderCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([key]) => ({ key, label: prettyLabel(key) }));
  }

  function buildMatrix(rows, disorders) {
    const labels = [...AGE_GROUPS.map((d) => d.label), ...disorders.map((d) => d.label)];
    const nAges = AGE_GROUPS.length;
    const nDis = disorders.length;
    const N = nAges + nDis;

    const matrix = Array.from({ length: N }, () => new Array(N).fill(0));

    rows.forEach((r) => {
      const age = AGE_GROUPS.find((a) => a.raw === r.age_group_raw);
      if (!age) return;
      const ageIndex = AGE_GROUPS.indexOf(age);

      disorders.forEach((m, i) => {
        if (r.mh_tokens.includes(m.key)) {
          const disIndex = nAges + i;
          matrix[ageIndex][disIndex] += 1;
          matrix[disIndex][ageIndex] += 1;
        }
      });
    });

    return { matrix, labels, nAges };
  }

  // --- Responsive sizing (fix “chord coupée”)
  function computeSize() {
    const stageEl = stage.node();
    const modalBody = document.querySelector(".mh-modal__body");
    const rect = stageEl?.getBoundingClientRect();

    const w = rect?.width || 560;

    // ✅ hauteur dispo : on prend la hauteur réelle du body du modal si possible
    const bodyH = modalBody?.getBoundingClientRect()?.height;
    const h = Math.max(420, Math.min(rect?.height || 520, bodyH ? bodyH - 40 : 520));

    // carré qui tient
    const size = Math.floor(Math.min(w, h));

    // limite pour éviter que ça déborde avec les labels
    return Math.max(360, Math.min(size, 640));
  }

  let lockedIndex = null;

  function clearFocus(ribbons, groupPath) {
    ribbons.attr("opacity", 0.58);
    groupPath.attr("opacity", 1);
    tooltip.style("opacity", 0);
  }

  function updateChord() {
    currentState = getState();

    // --- data scope (monde entier ou pays)
    let rows = cleaned;
    let subtitle = "Monde entier";

    if (currentState.selectedCountry) {
      const c = normalizeCountryName(currentState.selectedCountry);
      const filtered = cleaned.filter((d) => d.country === c);
      if (filtered.length >= 5) {
        rows = filtered;
        subtitle = currentState.selectedCountry;
      }
    }

    // top disorders within scope
    const disorders = buildTopDisorders(rows, 6);

    const colorDisorder = d3
      .scaleOrdinal()
      .domain(disorders.map((d) => d.label))
      .range(GREYS);

    // build matrix
    const { matrix, labels, nAges } = buildMatrix(rows, disorders);

    // meta
    meta.text("");

    // clear layers (mais on ne supprime jamais le SVG!)
    groupLayer.selectAll("*").remove();
    ribbonLayer.selectAll("*").remove();
    lockedIndex = null;
    tooltip.style("opacity", 0);

    const total = d3.sum(matrix.flat());

    if (!total) {
      emptyOverlay
        .style("display", "block")
        .text("Pas assez de données pour afficher les relations âge ↔ troubles mentaux pour cette sélection.");
      return;
    }
    emptyOverlay.style("display", "none");

    // --- responsive geometry
    const size = computeSize();

    // ✅ padding pour labels autour (adaptatif pour éviter de couper)
    const labelPad = Math.max(64, Math.min(92, Math.floor(size * 0.16)));
    const outerRadius = size / 2 - labelPad;
    const innerRadius = outerRadius - 18;

    arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
    ribbon = d3.ribbon().radius(innerRadius);

    svg.attr("viewBox", `0 0 ${size} ${size}`);
    g.attr("transform", `translate(${size / 2}, ${size / 2})`);

    // chords
    const chords = chordLayout(matrix);

    // --- groups
    const group = groupLayer
      .selectAll(".group")
      .data(chords.groups)
      .enter()
      .append("g")
      .attr("class", "group");

    const groupPath = group
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => (d.index < nAges ? colorAge(labels[d.index]) : colorDisorder(labels[d.index])))
      .attr("stroke", "rgba(226,232,240,0.95)")
      .attr("stroke-width", 1);

    // labels
    group
      .append("text")
      .each((d) => (d.angle = (d.startAngle + d.endAngle) / 2))
      .attr("dy", "0.35em")
      .attr("transform", (d) => {
        const rotate = (d.angle * 180) / Math.PI - 90;
        const translate = outerRadius + 18;
        return `rotate(${rotate}) translate(${translate}) ${d.angle > Math.PI ? "rotate(180)" : ""}`;
      })
      .attr("text-anchor", (d) => (d.angle > Math.PI ? "end" : "start"))
      .attr("class", "chord-label")
      .style("font-size", "12px")
      .style("font-weight", 600)
      .style("fill", "#0f172a")
      .text((d) => clampLabel(labels[d.index], 18));

    // --- ribbons
    const ribbons = ribbonLayer
      .selectAll(".ribbon")
      .data(chords)
      .enter()
      .append("path")
      .attr("class", "chord-ribbon")
      .attr("d", ribbon)
      .attr("fill", (d) => {
        const idx = d.source.index;
        return idx < nAges ? colorAge(labels[idx]) : colorDisorder(labels[idx]);
      })
      .attr("stroke", "rgba(226,232,240,0.85)")
      .attr("stroke-width", 1);

    // value scale for tooltip extras
    const values = chords.map((c) => c.source.value).filter((v) => !isNaN(v));
    const vMed = values.length ? median(values) : 0;

    // --- interactions
    ribbons
      .on("mousemove", (event, d) => {
        if (lockedIndex != null) return;

        const a = labels[d.source.index];
        const b = labels[d.target.index];
        const v = d.source.value;

        ribbons.attr("opacity", 0.08);
        d3.select(event.currentTarget).attr("opacity", 0.92);

        tooltip
          .style("opacity", 1)
          .style("left", event.clientX + 14 + "px")
          .style("top", event.clientY - 10 + "px")
          .html(`
            <div style="font-weight:700;margin-bottom:4px;">${a} ↔ ${b}</div>
            <div>Fréquence : <b>${v}</b></div>
            <div style="margin-top:4px;font-size:11px;opacity:.9;">
              ${subtitle} • médiane liens: ${vMed.toFixed(0)}
            </div>
          `);
      })
      .on("mouseleave", () => {
        if (lockedIndex != null) return;
        clearFocus(ribbons, groupPath);
      });

    group
      .on("mousemove", (event, d) => {
        if (lockedIndex != null) return;

        ribbons.attr("opacity", (r) =>
          r.source.index === d.index || r.target.index === d.index ? 0.92 : 0.06
        );
        groupPath.attr("opacity", (gg) => (gg.index === d.index ? 1 : 0.55));

        tooltip
          .style("opacity", 1)
          .style("left", event.clientX + 14 + "px")
          .style("top", event.clientY - 18 + "px")
          .html(`
            <div style="font-weight:700;margin-bottom:4px;">${labels[d.index]}</div>
            <div style="font-size:11px;opacity:.9;">Cliquez pour verrouiller le focus</div>
          `);
      })
      .on("mouseleave", () => {
        if (lockedIndex != null) return;
        clearFocus(ribbons, groupPath);
      });

    group.on("click", (event, d) => {
      // stop propagation so svg click doesn't immediately reset
      event.stopPropagation();

      lockedIndex = lockedIndex === d.index ? null : d.index;

      if (lockedIndex == null) {
        clearFocus(ribbons, groupPath);
        return;
      }
      ribbons.attr("opacity", (r) =>
        r.source.index === lockedIndex || r.target.index === lockedIndex ? 0.92 : 0.06
      );
      groupPath.attr("opacity", (gg) => (gg.index === lockedIndex ? 1 : 0.55));

      tooltip.style("opacity", 0);
    });

    // click vide = reset
    svg.on("click", () => {
      lockedIndex = null;
      clearFocus(ribbons, groupPath);
    });

    clearFocus(ribbons, groupPath);
  }

  // rerender on resize (important for modal sizing)
  const ro = new ResizeObserver(() => updateChord());
  if (stage.node()) ro.observe(stage.node());

  subscribe(updateChord);
  updateChord();
}
