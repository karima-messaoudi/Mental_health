// src/heatmapRiskView.js
const d3 = window.d3;

export class HeatmapRiskView {
  constructor(root, data) {
    this.root = root;
    this.data = data;
    this.state = { pinned: null };
  }

  render() {
    this.root.innerHTML = `
      <div class="rm-layout">
        <div class="rm-left">
          <div class="rm-grid"></div>
        </div>

        <aside class="rm-right">
          <div class="detailCard">
            <div class="detailHead">
              <div>
                <h2 class="detailTitle">Détail</h2>
                <p class="detailHint">Survole une case pour un aperçu. Clique pour figer.</p>
              </div>
              <button class="btn" id="btnClose" type="button">Fermer</button>
            </div>

            <div class="kpis">
              <div class="kpi">
                <div class="kpiLabel">Score</div>
                <div class="kpiValue" id="metricScore">—</div>
              </div>
              <div class="kpi">
                <div class="kpiLabel">Effectif</div>
                <div class="kpiValue" id="metricN">—</div>
              </div>
            </div>

            <div class="box" id="selectionBox">
              <p class="selLine">Clique sur une case pour afficher le détail.</p>
            </div>

            <div class="dynamicText" id="dynSentence">
              Clique sur une case pour afficher une phrase explicative.
            </div>

            <div class="box">
              <div class="distTitle">Distribution (case)</div>
              <svg id="distSvg" width="360" height="200" ></svg>
            </div>

            <div class="legend">
              <div class="legendItem"><span class="dot risk"></span><span>risque</span></div>
              <div class="legendItem"><span class="dot neutral"></span><span>neutre</span></div>
              <div class="legendItem"><span class="dot protect"></span><span>protecteur</span></div>
            </div>
          </div>
        </aside>
      </div>
    `;

    this.grid = this.root.querySelector(".rm-grid");

    this.root.querySelector("#btnClose").addEventListener("click", () => {
      this.state.pinned = null;
      this._renderDetail(null);
      this._refreshPinnedStyles();
    });

    this._renderHeatmaps();
    this._renderDetail(null);
  }

  _splitLabel(label) {
    const parts = String(label).split(" ");
    if (parts.length >= 2) return [parts[0], parts.slice(1).join(" ")];
    return [label];
  }

  _renderHeatmaps() {
    this.grid.innerHTML = "";

    for (const hm of this.data.heatmaps) {
      const card = document.createElement("section");
      card.className = "hmCard";

      card.innerHTML = `
        <div class="hmHead">
          <h3 class="hmTitle">${hm.title}</h3>
        </div>
        <div class="hmWrap"></div>
      `;

      const wrap = card.querySelector(".hmWrap");

      const inner = 320;
      // ⬇️ on garde la structure, mais on laisse un peu plus de marge en bas
      // pour afficher le label de l’axe X
      const pad = { top: 44, right: 44, bottom: 40, left: 108 };
      const W = inner + pad.left + pad.right;
      const H = inner + pad.top + pad.bottom;

      // Nom des axes depuis le titre "Social × Pro"
      const parts = String(hm.title).split("×");
      const socialAxisName = (parts[0] || "").trim();
      const proAxisName = (parts[1] || "").trim();

      const svg = d3.select(wrap)
        .append("svg")
        .attr("viewBox", `0 0 ${W} ${H}`)
        .attr("preserveAspectRatio", "xMinYMin meet");

      const g = svg.append("g").attr("transform", `translate(${pad.left},${pad.top})`);

      const labels = hm.labels;

      const x = d3.scaleBand().domain(d3.range(5)).range([0, inner]).paddingInner(0.18);
      const y = d3.scaleBand().domain(d3.range(5)).range([0, inner]).paddingInner(0.18);

      const vMin = d3.min(hm.cells, (d) => d.mean);
      const vMax = d3.max(hm.cells, (d) => d.mean);
      const mid = (vMin + vMax) / 2;

      const color = d3.scaleLinear()
        .domain([vMin, mid, vMax])
        .range(["#ef8f8f", "#dfe6f2", "#4e86f7"]);

      // Labels colonnes (Très faible..)
      const xLab = g.selectAll(".xLab")
        .data(labels)
        .enter()
        .append("text")
        .attr("class", "axisLab")
        .attr("x", (_, i) => x(i) + x.bandwidth() / 2)
        .attr("y", -18)
        .attr("text-anchor", "middle");

      xLab.each((lab, i, nodes) => {
        const t = d3.select(nodes[i]);
        const lines = this._splitLabel(lab);
        t.selectAll("tspan")
          .data(lines)
          .enter()
          .append("tspan")
          .attr("x", x(i) + x.bandwidth() / 2)
          .attr("dy", (_, li) => (li === 0 ? 0 : 12))
          .text((d) => d);
      });

      // Labels lignes (Très faible..)
      const yLab = g.selectAll(".yLab")
        .data(labels)
        .enter()
        .append("text")
        .attr("class", "axisLab")
        .attr("x", -14)
        .attr("y", (_, i) => y(i) + y.bandwidth() / 2 - 2)
        .attr("text-anchor", "end");

      yLab.each((lab, i, nodes) => {
        const t = d3.select(nodes[i]);
        const lines = this._splitLabel(lab);
        t.selectAll("tspan")
          .data(lines)
          .enter()
          .append("tspan")
          .attr("x", -14)
          .attr("dy", (_, li) => (li === 0 ? 0 : 12))
          .text((d) => d);
      });

      // ✅ AJOUT : labels d’axes (Y social / X pro)
      // Axe X (en bas, centré)
      g.append("text")
        .attr("class", "axisTitle")
        .attr("x", inner / 2)
        .attr("y", inner + 30)
        .attr("text-anchor", "middle")
        .text(proAxisName ? `${proAxisName} (axe X)` : "Axe X");

      // Axe Y (à gauche, vertical)
      g.append("text")
        .attr("class", "axisTitle")
        .attr("transform", `translate(${-78}, ${inner / 2}) rotate(-90)`)
        .attr("text-anchor", "middle")
        .text(socialAxisName ? `${socialAxisName} (axe Y)` : "Axe Y");

      const cell = g.selectAll(".cell")
        .data(hm.cells.map((d) => ({ ...d, hm })))
        .enter()
        .append("g")
        .attr("class", "cell")
        .attr("transform", (d) => `translate(${x(d.c)},${y(d.r)})`);

      cell.append("rect")
        .attr("rx", 16)
        .attr("ry", 16)
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", (d) => color(d.mean))
        .attr("stroke", "rgba(15,23,42,.10)")
        .attr("stroke-width", 1);

      cell.append("text")
        .attr("class", "cellVal")
        .attr("x", x.bandwidth() / 2)
        .attr("y", y.bandwidth() / 2 + 6)
        .attr("text-anchor", "middle")
        .text((d) => Math.round(d.mean));

      cell
        .on("mouseenter", (_, d) => {
          if (!this.state.pinned) this._renderDetail(d);
        })
        .on("mouseleave", () => {
          if (!this.state.pinned) this._renderDetail(null);
        })
        .on("click", (_, d) => {
          this.state.pinned = d;
          this._renderDetail(d);
          this._refreshPinnedStyles();
        });

      this.grid.appendChild(card);
    }
  }

  _refreshPinnedStyles() {
    const pinned = this.state.pinned;

    d3.select(this.root)
      .selectAll(".cell rect")
      .attr("stroke-width", 1)
      .attr("stroke", "rgba(15,23,42,.10)");

    if (!pinned) return;

    d3.select(this.root)
      .selectAll(".cell")
      .filter((d) => d.hm.title === pinned.hm.title && d.r === pinned.r && d.c === pinned.c)
      .select("rect")
      .attr("stroke-width", 3)
      .attr("stroke", "rgba(15,23,42,.55)");
  }

  _renderDetail(d) {
    const scoreEl = this.root.querySelector("#metricScore");
    const nEl = this.root.querySelector("#metricN");
    const selBox = this.root.querySelector("#selectionBox");
    const sentenceEl = this.root.querySelector("#dynSentence");

    if (!d) {
      scoreEl.textContent = "—";
      nEl.textContent = "—";
      selBox.innerHTML = `<p class="selLine">Clique sur une case pour afficher le détail.</p>`;
      sentenceEl.textContent = "Clique sur une case pour afficher une phrase explicative.";
      this._renderDist(null);
      return;
    }

    scoreEl.textContent = d.mean.toFixed(1);
    nEl.textContent = String(d.n);

    const rowLab = d.hm.labels[d.r];
    const colLab = d.hm.labels[d.c];

    const socialName = d.hm.title.split("×")[0].trim();
    const proName = d.hm.title.split("×")[1].trim();
    const category = (d.mean >= 67) ? "protecteur" : (d.mean <= 33) ? "à risque" : "neutre";

    selBox.innerHTML = `
      <p class="selLine">
        <strong>Sélection :</strong><br/>
        ${socialName} : ${rowLab}<br/>
        ${proName}: ${colLab}<br/>
      </p>
    `;

    sentenceEl.textContent =
      `La combinaison observée aboutit à un happiness score de ${d.mean.toFixed(1)}, ` +
      `signalant une situation ${category}.`;

    this._renderDist(d);
  }

  _renderDist(d) {
    const svg = d3.select(this.root.querySelector("#distSvg"));
    svg.selectAll("*").remove();

    const W = 360, H = 200;

    const margin = { top: 18, right: 22, bottom: 28, left: 46 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    if (!d) {
      g.append("text")
        .attr("x", 0)
        .attr("y", 30)
        .attr("fill", "rgba(15,23,42,.55)")
        .text("Sélectionne une case (clic) pour voir la distribution.");
      return;
    }

    const scores = d.scores.slice();
    const mean = d3.mean(scores);

    const x = d3.scaleLinear().domain([0, 100]).range([0, w]);
    const targetBins = Math.max(22, Math.min(18, Math.round(w / 14)));
    const bins = d3.bin().domain(x.domain()).thresholds(targetBins)(scores);

    const y = d3.scaleLinear()
      .domain([0, d3.max(bins, (b) => b.length) || 1])
      .nice()
      .range([h, 0]);

    const xAxis = g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(5));

    const yAxis = g.append("g")
      .call(d3.axisLeft(y).ticks(4));

    xAxis.selectAll("text").style("font-weight", 700);
    yAxis.selectAll("text").style("font-weight", 700);

    g.selectAll("rect.bar")
      .data(bins)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (b) => x(b.x0) + 1)
      .attr("y", (b) => y(b.length))
      .attr("width", (b) => Math.max(0, x(b.x1) - x(b.x0) - 2))
      .attr("height", (b) => h - y(b.length))
      .attr("rx", 10)
      .attr("ry", 10);

    const meanX = x(mean);
    g.append("line")
      .attr("x1", meanX)
      .attr("x2", meanX)
      .attr("y1", 0)
      .attr("y2", h)
      .attr("stroke-width", 3)
      .attr("class", "meanLine");

    const padText = 8;
    const label = `moyenne ≈ ${mean.toFixed(1)}`;

    let anchor = "start";
    let textX = meanX + padText;

    if (meanX > w - 85) {
      anchor = "end";
      textX = meanX - padText;
    }

    g.append("text")
      .attr("x", textX)
      .attr("y", 14)
      .attr("text-anchor", anchor)
      .attr("class", "meanLabel")
      .style("font-weight", 800)
      .text(label);
  }
}
