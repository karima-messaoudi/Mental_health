(() => {
  const margin = { top: 10, right: 30, bottom: 30, left: 170 };
  const width = 1050 - margin.left - margin.right;

  const barHeight = 24;
  const barGap = 12;

  // Tooltip (une seule fois)
  const tooltip = d3
    .select("body")
    .selectAll("div.tooltip")
    .data([null])
    .join("div")
    .attr("class", "tooltip");

  function renderControls() {
    const controls = d3.select("#supportControls");
    if (controls.empty()) return null;

    controls.selectAll("*").remove();

    controls.append("label").attr("for", "modeSelect").text("Afficher :");

    const modeSelect = controls
      .append("select")
      .attr("id", "modeSelect");

    modeSelect
      .selectAll("option")
      .data([
        { value: "top", label: "Top (meilleurs)" },
        { value: "bottom", label: "Lowest (plus faibles)" },
      ])
      .join("option")
      .attr("value", d => d.value)
      .text(d => d.label);

    controls.append("label").attr("for", "nSelect").text("N :");

    const nSelect = controls
      .append("select")
      .attr("id", "nSelect");

    nSelect
      .selectAll("option")
      .data([5, 10, 25])
      .join("option")
      .attr("value", d => String(d))
      .text(d => `${d}`);

    // default
    modeSelect.property("value", "top");
    nSelect.property("value", "5");

    return { modeSelect, nSelect };
  }

  function computeDataset(data, mode, n) {
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
          total,
        };
      },
      d => d.country
    );

    const full = grouped.map(([country, v]) => ({ country, ...v }));

    if (mode === "top") {
      full.sort((a, b) => d3.descending(a.yesPct, b.yesPct));
      return full.slice(0, n);
    } else {
      full.sort((a, b) => d3.ascending(a.yesPct, b.yesPct));
      return full.slice(0, n);
    }
  }

  function render(dataset) {
    d3.select("#chart").selectAll("svg").remove();

    const height = dataset.length * (barHeight + barGap);

    const svg = d3
      .select("#chart")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, 100]).range([0, width]);

    const y = d3
      .scaleBand()
      .domain(dataset.map(d => d.country))
      .range([0, height])
      .paddingInner(0.38);

    g.append("g").attr("class", "axis").call(d3.axisLeft(y).tickSize(0));

    g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => d + "%"));

    const rows = g
      .selectAll(".row")
      .data(dataset, d => d.country)
      .join("g")
      .attr("class", "row")
      .attr("transform", d => `translate(0,${y(d.country)})`);

    rows
      .append("rect")
      .attr("class", "bar-yes")
      .attr("height", barHeight)
      .attr("width", d => x(d.yesPct))
      .attr("rx", barHeight / 2);

    rows
      .append("rect")
      .attr("class", "bar-no")
      .attr("x", d => x(d.yesPct))
      .attr("height", barHeight)
      .attr("width", d => x(d.noPct))
      .attr("rx", barHeight / 2);

    // label yes (si trop petit -> à droite)
    rows
      .append("text")
      .attr("class", "label label-yes")
      .attr("x", d => {
        const w = x(d.yesPct);
        return w < 55 ? w + 8 : w / 2;
      })
      .attr("y", barHeight / 2)
      .attr("text-anchor", d => (x(d.yesPct) < 55 ? "start" : "middle"))
      .text(d => `Yes • ${d.yesPct.toFixed(0)}%`);

    rows
      .append("text")
      .attr("class", "label label-no")
      .attr("x", d => x(d.yesPct) + x(d.noPct) / 2)
      .attr("y", barHeight / 2)
      .attr("text-anchor", "middle")
      .text(d => `No • ${d.noPct.toFixed(0)}%`);

    rows
      .on("mouseenter", function (event, d) {
        rows.classed("bar-dimmed", true);
        d3.select(this).classed("bar-dimmed", false).classed("bar-active", true);

        tooltip
          .html(
            `
            <div class="tooltip-title">${d.country}</div>
            <div class="tooltip-row"><span>Yes</span><span>${d.yesCount} (${d.yesPct.toFixed(1)}%)</span></div>
            <div class="tooltip-row"><span>No</span><span>${d.noCount} (${d.noPct.toFixed(1)}%)</span></div>
            <div class="tooltip-total">Total : ${d.total}</div>
          `
          )
          .style("opacity", 1);
      })
      .on("mousemove", event => {
        tooltip.style("left", event.pageX + 15 + "px").style("top", event.pageY - 20 + "px");
      })
      .on("mouseleave", function () {
        rows.classed("bar-dimmed", false).classed("bar-active", false);
        tooltip.style("opacity", 0);
      });
  }

  const ui = renderControls();
  if (!ui) return;

  const modeSelect = d3.select("#modeSelect");
  const nSelect = d3.select("#nSelect");

  d3.csv("data/mental_health_workplace_survey_synthetic.csv").then(data => {
    function rerender() {
      const mode = modeSelect.property("value");
      const n = parseInt(nSelect.property("value"), 10);
      render(computeDataset(data, mode, n));
    }

    modeSelect.on("change", rerender);
    nSelect.on("change", rerender);

    rerender();
  });
})();
