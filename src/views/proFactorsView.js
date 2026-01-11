// src/views/proFactorsView.js
let _mounted = false;

function loadClassicScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = [...document.scripts].find(s => s.src && s.src.includes(src));
    if (existing) return resolve();

    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

export async function initProFactorsView() {
  const root = document.getElementById("proFactorsRoot");
  if (!root) return;

  // DOM (ID UNIQUE)
  if (!_mounted) {
    root.innerHTML = `
      <main class="container">
        <section class="card">
          
          <svg id="pro-chart" width="1100" height="600"></svg>
        </section>
      </main>
    `;

    // rendre d3 extensible
    const d3mod = window.d3;
    if (!d3mod) {
      console.error("[pro] window.d3 is missing.");
      return;
    }
    const d3ext = Object.assign({}, d3mod);
    window.d3 = d3ext;

    // d3-sankey
    const sankeyPkg = await import("https://cdn.jsdelivr.net/npm/d3-sankey@0.12.3/+esm");
    window.d3.sankey = sankeyPkg.sankey;
    window.d3.sankeyLinkHorizontal = sankeyPkg.sankeyLinkHorizontal;

    // scripts
    await loadClassicScriptOnce("src/pro/data.js");
    await loadClassicScriptOnce("src/pro/script.js");

    _mounted = true;
  }

  // ✅ IMPORTANT : re-render à chaque fois qu’on revient sur l’onglet
  if (typeof window.renderProSankey === "function") {
    window.renderProSankey("#pro-chart");
  } else {
    console.error("[pro] renderProSankey() not found. Check src/pro/script.js");
  }
}
