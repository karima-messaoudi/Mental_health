// src/views/supportMount.js
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

export async function initSupportView() {
  if (_mounted) return;

  const root = document.getElementById("supportRoot");
  if (!root) {
    console.warn("[support] #supportRoot introuvable (check index.html).");
    return;
  }

  /**
   * IMPORTANT:
   * - On n'ajoute PLUS une .card ici
   * - Parce que ta page a déjà une card par vue
   */
  root.innerHTML = `
    <div class="support-card-header">
      <div class="card-title-block">
      </div>

      <div id="supportControls" class="support-controls"></div>
    </div>

    <div id="chart"></div>
  `;

  if (!window.d3) {
    console.error("[support] window.d3 manquant (check index.html).");
    return;
  }

  window.d3 = Object.assign({}, window.d3);

  await loadClassicScriptOnce("src/support/script.js");
  _mounted = true;
}