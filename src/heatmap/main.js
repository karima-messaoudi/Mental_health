// src/main.js
import { loadRiskMatrixData } from "./dataPrep.js";
import { HeatmapRiskView } from "./heatmapRiskView.js";

const mount = document.querySelector("#risk-matrix-container");

async function boot() {
  mount.innerHTML = "";

  try {
    const data = await loadRiskMatrixData();
    const view = new HeatmapRiskView(mount, data);
    view.render();
  } catch (e) {
    console.error(e);
    mount.innerHTML = `
      <div class="errorBox">
        <div class="errorTitle">Erreur chargement</div>
        <div class="errorMsg">${String(e.message || e)}</div>
        <div class="errorHint">Vérifie que les CSV sont bien dans <b>/data</b> et que tu ouvres via un serveur (Live Server).</div>
      </div>
    `;
  }
}

boot();
