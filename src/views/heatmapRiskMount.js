// src/views/heatmapRiskMount.js
let _mounted = false;

function loadModuleOnce(src) {
  // Charge un module via <script type="module"> sans le modifier
  return new Promise((resolve, reject) => {
    const existing = [...document.scripts].find(s => s.type === "module" && s.src && s.src.includes(src));
    if (existing) return resolve();

    const s = document.createElement("script");
    s.type = "module";
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load module ${src}`));
    document.body.appendChild(s);
  });
}

export async function initHeatmapRiskView() {
  if (_mounted) return;

  const root = document.getElementById("heatmapRoot");
  if (!root) {
    console.warn("[heatmap] #heatmapRoot introuvable (check index.html).");
    return;
  }

  // injecte exactement ce que le code original attend
  root.innerHTML = `<div id="risk-matrix-container"></div>`;

  // charge ton main original (inchangé)
  await loadModuleOnce("src/heatmap/main.js");

  _mounted = true;
}
