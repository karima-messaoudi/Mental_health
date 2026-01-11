// src/pro/script.js

const width = 1100;
const height = 600;

/* ================= MARGES ================= */
const margin = {
  top: 55,
  right: 40,
  bottom: 18,
  left: 40
};

let svg = null;
let tooltip = null;

/* ================= PALETTE (FONCÉE) ================= */
const colorMap = {
  /* CONTEXTE */
  "Tech Sector": "#3B6FA8",
  "Large Company": "#5E8FC6",
  "Non-Tech Sector": "#4F86B5",
  "Small / Medium Company": "#6F96C4",

  /* STRESS */
  "Poor Work-Life Balance": "#C86FA0",
  "High Workload": "#B85D96",
  "Lack of Managerial Support": "#9E6FAF",
  "Job Insecurity": "#D08AA8",

  /* RÉACTIONS */
  "Seeks Support": "#6F96C4",
  "Social Isolation": "#4F86B5",
  "Fear of Career Impact": "#9E6FAF",
  "Difficulty Talking to Manager": "#B85D96",

  /* BURNOUT */
  "Low Burnout Risk": "#5E8FC6",
  "Moderate Burnout Risk": "#3B6FA8",
  "High Burnout Risk": "#244C78",

  /* IMPACTS */
  "Healthy & Engaged": "#5E8FC6",
  "Reduced Productivity": "#3B6FA8",
  "Absenteeism": "#244C78",
  "Turnover Risk": "#173556"
};

/* ================= SANKEY ================= */
const sankey = d3
  .sankey()
  .nodeId((d) => d.id)
  .nodeWidth(18)
  .nodePadding(22)
  .extent([
    [margin.left, margin.top],
    [width - margin.right, height - margin.bottom]
  ]);

/* ================= HEADERS ================= */
const columnTitles = [
  ["Contexte", " organisationnel"],
  ["Stress", "professionnels"],
  ["Réactions", "psychologiques"],
  ["Niveau", "burnout"],
  ["Impacts", " humains & business"]
];

/* ================= TOOLTIP (PRO ONLY) ================= */
function ensureTooltip() {
  let t = document.getElementById("pro-tooltip");

  if (!t) {
    t = document.createElement("div");
    t.id = "pro-tooltip";
    document.body.appendChild(t);
  }

  t.style.position = "absolute";
  t.style.zIndex = "99999";
  t.style.pointerEvents = "none";
  t.style.opacity = "0";
  t.style.display = "none";
  t.style.padding = "10px 12px";
  t.style.borderRadius = "12px";
  t.style.background = "rgba(15, 23, 42, 0.92)";
  t.style.color = "white";
  t.style.fontSize = "13px";
  t.style.lineHeight = "1.35";
  t.style.boxShadow = "0 12px 30px rgba(0,0,0,0.25)";
  t.style.maxWidth = "280px";

  tooltip = d3.select(t);
}

function moveTooltip(event) {
  if (!tooltip) return;
  tooltip
    .style("left", event.pageX + 14 + "px")
    .style("top", event.pageY + 14 + "px");
}

function showTooltip(html, event) {
  if (!tooltip) return;
  tooltip.style("display", "block").style("opacity", 1).html(html);
  moveTooltip(event);
}

function hideTooltip() {
  if (!tooltip) return;
  tooltip.style("opacity", 0).style("display", "none");
}

/* ================= RENDER ================= */
function render() {
  if (!svg || svg.empty()) {
    console.error("[pro] SVG not initialized. Call renderProSankey('#pro-chart') first.");
    return;
  }
  if (typeof nodes === "undefined" || typeof links === "undefined") {
    console.error("[pro] nodes/links not found. Check src/pro/data.js loading order.");
    return;
  }

  svg.selectAll("*").remove();

  const graph = sankey({
    nodes: nodes.map((d) => ({ ...d })),
    links: links.map((d) => ({ ...d }))
  });

  const outgoingTotals = d3.rollup(
    graph.links,
    (v) => d3.sum(v, (d) => d.value),
    (d) => d.source.id
  );

  /* ---------- LINKS ---------- */
  const linkSelection = svg
    .append("g")
    .selectAll(".link")
    .data(graph.links)
    .join("path")
    .attr("class", "link")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", (d) => colorMap[d.source.id] || "#CBD5E1")
    .attr("stroke-width", (d) => Math.max(1, d.width));

  linkSelection
    .on("mouseenter", function (event, d) {
      const total = outgoingTotals.get(d.source.id) || d.value;
      const pct = ((d.value / total) * 100).toFixed(1);

      showTooltip(
        `
          <div style="font-weight:800;margin-bottom:4px;">
            ${d.source.id} → ${d.target.id}
          </div>
          <div style="opacity:.9;">Valeur : <b>${d.value}</b></div>
          <div style="opacity:.9;">Part du flux source : <b>${pct}%</b></div>
        `,
        event
      );

      linkSelection.classed("fade", (l) => l !== d);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", function () {
      hideTooltip();
      linkSelection.classed("fade", false);
    });

  /* ---------- NODES ---------- */
  const nodeSelection = svg
    .append("g")
    .selectAll(".node")
    .data(graph.nodes)
    .join("g")
    .attr("class", "node");

  nodeSelection
    .append("rect")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("fill", (d) => colorMap[d.id] || "#CBD5E1");

  nodeSelection
    .append("text")
    .attr("x", (d) => d.x0 - 6)
    .attr("y", (d) => (d.y0 + d.y1) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "end")
    .text((d) => d.id)
    .filter((d) => d.x0 < width / 2)
    .attr("x", (d) => d.x1 + 6)
    .attr("text-anchor", "start");

  nodeSelection
    .on("mouseenter", function (event, d) {
      const val = typeof d.value === "number" ? d.value.toFixed(0) : "—";
      showTooltip(
        `
          <div style="font-weight:800;margin-bottom:4px;">${d.id}</div>
          <div style="opacity:.9;">Flux total : <b>${val}</b></div>
        `,
        event
      );

      nodeSelection.classed("fade", (n) => n !== d);
      linkSelection.classed("fade", (l) => l.source !== d && l.target !== d);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", () => {
      hideTooltip();
      nodeSelection.classed("fade", false);
      linkSelection.classed("fade", false);
    });

  /* ---------- HEADERS ---------- */
  const columns = d3.groups(graph.nodes, (d) => d.depth);
  const headerGroup = svg.append("g");

  const titleY = margin.top - 34;
  const subY = margin.top - 16;
  const lineY = margin.top - 6;

  columns.forEach(([depth, colNodes]) => {
    const xCenter = d3.mean(colNodes, (d) => (d.x0 + d.x1) / 2);

    headerGroup
      .append("text")
      .attr("x", xCenter)
      .attr("y", titleY)
      .attr("text-anchor", "middle")
      .attr("class", "column-header title")
      .text(columnTitles[depth][0]);

    headerGroup
      .append("text")
      .attr("x", xCenter)
      .attr("y", subY)
      .attr("text-anchor", "middle")
      .attr("class", "column-header subtitle")
      .text(columnTitles[depth][1]);

    headerGroup
      .append("line")
      .attr("x1", xCenter - 40)
      .attr("x2", xCenter + 40)
      .attr("y1", lineY)
      .attr("y2", lineY)
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 1);
  });
}

/* ================= API (SPA) ================= */
window.renderProSankey = function (svgSelector) {
  svg = d3.select(svgSelector);

  if (svg.empty()) {
    console.error("[pro] SVG not found:", svgSelector);
    return;
  }

  // ✅ FIX PRINCIPAL : le SVG prend toute la largeur de la card
  // sans toucher au HTML
  svg
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")      // 👈 rempli la card
    .style("height", "auto");    // 👈 garde les proportions

  ensureTooltip();
  render();
};
