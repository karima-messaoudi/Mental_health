(() => {
  /* ============================================================
     CONFIG
     ============================================================ */
  const margin = { top: 20, right: 30, bottom: 40, left: 120 };

  const fullWidth = 1300;
  const width = fullWidth - margin.left - margin.right;

  const barHeight = 24;
  const barGap = 12;
  const columnGap = 150;

  /* ============================================================
     TOOLTIP (singleton)
     ============================================================ */
  const tooltip = d3
    .select("body")
    .selectAll("div.tooltip")
    .data([null])
    .join("div")
    .attr("class", "tooltip");

  /* ============================================================
     CONTROLS (N only)
     ============================================================ */
  function renderControls() {
    const controls = d3.select("#supportControls");
    if (controls.empty()) return null;

    controls.selectAll("*").remove();

    controls.append("label").attr("for", "nSelect").text("N :");

    const nSelect = controls
      .append("select")
      .attr("id", "nSelect");

    nSelect
      .selectAll("option")
      .data([5, 10, 25])
      .join("option")
      .attr("value", d => d)
      .text(d => d);

    nSelect.property("value", "10");

    return { nSelect };
  }

  /* ============================================================
     DATA COMPUTATION
     ============================================================ */
  function computeDataset(data, n) {
    data.forEach(d => {
      d.country = (d.Country || "").trim();
      d.support = (d.HasMentalHealthSupport || "").trim();
    });

    const filtered = data.filter(d => d.country && d.support);

    const grouped = d3.rollups(
      filtered,
      v => {
        const total = v.length;
        const yes = v.filter(x => x.support === "Yes").length;
        const yesPct = total ? (yes / total) * 100 : 0;
        return {
          yesCount: yes,
          noCount: total - yes,
          yesPct,
          noPct: 100 - yesPct,
          total
        };
      },
      d => d.country
    );

    const full = grouped.map(([country, v]) => ({ country, ...v }));

    const top = [...full]
      .sort((a, b) => d3.descending(a.yesPct, b.yesPct))
      .slice(0, n)
      .map(d => ({ ...d, group: "top" }));

    const bottom = [...full]
      .sort((a, b) => d3.ascending(a.yesPct, b.yesPct))
      .slice(0, n)
      .map(d => ({ ...d, group: "bottom" }));

    return [...top, ...bottom];
  }

  /* ============================================================
     RENDER
     ============================================================ */
  function render(dataset) {
    d3.select("#chart").selectAll("svg").remove();

    const top = dataset.filter(d => d.group === "top");
    const bottom = dataset.filter(d => d.group === "bottom");

    const columnWidth = (width - columnGap) / 2;
    const totalPlotsWidth = columnWidth * 2 + columnGap;
    const centerOffset = (width - totalPlotsWidth) / 2;

    const height =
      Math.max(top.length, bottom.length) * (barHeight + barGap);

    const svg = d3
      .select("#chart")
      .append("svg")
      .attr("viewBox", `0 0 ${fullWidth} ${height + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("max-width", "1400px")
      .style("display", "block")
      .style("margin", "0 auto");


    const g = svg
      .append("g")
      .attr(
        "transform",
        `translate(${margin.left},${margin.top})`
      );

    const x = d3.scaleLinear().domain([0, 100]).range([0, columnWidth]);
    const xAxis = d3.axisBottom(x).ticks(5).tickFormat(d => d + "%");

    /* ================= TITLES ================= */
    g.append("text")
      .attr("x", centerOffset)
      .attr("y", -8)
      .attr("font-size", 14)
      .attr("font-weight", 700)
      .text("Highest access to mental health support");

    g.append("text")
      .attr("x", centerOffset + columnWidth + columnGap)
      .attr("y", -8)
      .attr("font-size", 14)
      .attr("font-weight", 700)
      .text("Lowest access to mental health support");

    /* ================= AXES ================= */
    g.append("g")
      .attr(
        "transform",
        `translate(${centerOffset},${height})`
      )
      .call(xAxis);

    g.append("g")
      .attr(
        "transform",
        `translate(${centerOffset + columnWidth + columnGap},${height})`
      )
      .call(xAxis);

    /* ================= COLUMN DRAWER ================= */
    function drawColumn(data, offsetX) {
      const y = d3
        .scaleBand()
        .domain(data.map(d => d.country))
        .range([0, height])
        .paddingInner(0.38);

      g.append("g")
        .attr("transform", `translate(${offsetX},0)`)
        .call(d3.axisLeft(y).tickSize(0));

      const col = g
        .append("g")
        .attr("transform", `translate(${offsetX},0)`);

      const rows = col
        .selectAll(".row")
        .data(data, d => d.country)
        .join("g")
        .attr("class", "row")
        .attr(
          "transform",
          d => `translate(0,${y(d.country)})`
        );

      rows.append("rect")
        .attr("class", "bar-yes")
        .attr("height", barHeight)
        .attr("width", d => x(d.yesPct))
        .attr("rx", barHeight / 2);

      rows.append("rect")
        .attr("class", "bar-no")
        .attr("x", d => x(d.yesPct))
        .attr("height", barHeight)
        .attr("width", d => x(d.noPct))
        .attr("rx", barHeight / 2);

      rows.append("text")
        .attr("class", "label label-yes")
        .attr("x", d => {
          const w = x(d.yesPct);
          return w < 45 ? w + 8 : w / 2;
        })
        .attr("y", barHeight / 2)
        .attr("text-anchor", d =>
          x(d.yesPct) < 45 ? "start" : "middle"
        )
        .text(d => `Yes • ${d.yesPct.toFixed(0)}%`);

      rows.append("text")
        .attr("class", "label label-no")
        .attr("x", d => x(d.yesPct) + x(d.noPct) / 2)
        .attr("y", barHeight / 2)
        .attr("text-anchor", "middle")
        .text(d => `No • ${d.noPct.toFixed(0)}%`);

      rows
        .on("mouseenter", function (event, d) {
          rows.classed("bar-dimmed", true);
          d3.select(this)
            .classed("bar-dimmed", false)
            .classed("bar-active", true);

          tooltip
            .html(`
              <div class="tooltip-title">${d.country}</div>
              <div class="tooltip-row"><span>Yes</span><span>${d.yesCount} (${d.yesPct.toFixed(1)}%)</span></div>
              <div class="tooltip-row"><span>No</span><span>${d.noCount} (${d.noPct.toFixed(1)}%)</span></div>
              <div class="tooltip-total">Total : ${d.total}</div>
            `)
            .style("opacity", 1);
        })
        .on("mousemove", event => {
          tooltip
            .style("left", event.pageX + 15 + "px")
            .style("top", event.pageY - 20 + "px");
        })
        .on("mouseleave", function () {
          rows
            .classed("bar-dimmed", false)
            .classed("bar-active", false);
          tooltip.style("opacity", 0);
        });
    }

    drawColumn(top, centerOffset);
    drawColumn(bottom, centerOffset + columnWidth + columnGap);
  }

  /* ============================================================
     INIT
     ============================================================ */
  const ui = renderControls();
  if (!ui) return;

  const nSelect = d3.select("#nSelect");

  d3.csv("data/mental_health_workplace_survey_synthetic.csv").then(data => {
    function rerender() {
      const n = parseInt(nSelect.property("value"), 10);
      render(computeDataset(data, n));
    }

    nSelect.on("change", rerender);
    rerender();
  });
})();
