// src/main.js
import { initControls } from "./ui/controls.js";
import { initMapView } from "./views/mapView.js";
import { initTimeSeriesView } from "./views/timeSeriesView.js";
import { initChordView } from "./views/chordView.js";
import { initProFactorsView } from "./views/proFactorsView.js";
import { initHeatmapRiskView } from "./views/heatmapRiskMount.js";
import { initSupportView } from "./views/supportMount.js";

import { initSocialFactorsView } from "./views/socialFactorsView.js";

/**
 * Modal API
 */
function openCountryModal({ title, subtitle } = {}) {
  const modal = document.getElementById("country-modal");
  const t = document.getElementById("mh-modal-title");
  const sub = document.getElementById("mh-modal-subtitle");

  if (!modal || !t || !sub) {
    console.warn("[modal] Elements not found in DOM (check index.html IDs).");
    return;
  }

  t.textContent = title || "Pays";
  sub.textContent = subtitle || "";

  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCountryModal() {
  const modal = document.getElementById("country-modal");
  if (!modal) return;

  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function setupModalEvents() {
  const modal = document.getElementById("country-modal");
  const closeBtn = document.getElementById("mh-modal-close");

  if (!modal) {
    console.warn("[modal] #country-modal not found.");
    return;
  }

  closeBtn?.addEventListener("click", closeCountryModal);

  modal.addEventListener("click", (e) => {
    if (e.target?.dataset?.close === "true") closeCountryModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCountryModal();
  });
}

/**
 * Router ultra simple (hash):
 * #map (par défaut) ou #social
 */
function setActivePage(route) {
  const pages = document.querySelectorAll(".dash-page");
  pages.forEach((p) => {
    const isActive = p.dataset.page === route;
    p.classList.toggle("is-active", isActive);
    p.setAttribute("aria-hidden", isActive ? "false" : "true");
  });

  const tabs = document.querySelectorAll(".dash-tab");
  tabs.forEach((t) => t.classList.toggle("active", t.dataset.route === route));
}

// function getRouteFromHash() {
//   const h = (window.location.hash || "#map").replace("#", "").trim();
//   return h === "social" ? "social" : "map";
// }
function getRouteFromHash() {
  const h = (window.location.hash || "#map").replace("#", "").trim();
  if (h === "social") return "social";
  if (h === "pro") return "pro";
  if (h === "heatmap") return "heatmap";
  if (h === "support") return "support";

  return "map";
}


let socialInited = false;
let proInited = false;
let heatInited = false;
let supportInited = false;

function onRouteChange() {
  const route = getRouteFromHash();
  setActivePage(route);

  // Init lazy de la page sociale
  if (route === "social" && !socialInited) {
    initSocialFactorsView().catch((e) => console.error("[socialFactors init error]", e));
    socialInited = true;
  }
  if (route === "pro" && !proInited) {
    initProFactorsView().catch((e) => console.error("[pro init error]", e));
    proInited = true;
  }
  if (route === "heatmap" && !heatInited) {
    initHeatmapRiskView().catch((e) => console.error("[heatmap init error]", e));
    heatInited = true;
  }
  if (route === "support" && !supportInited) {
  initSupportView().catch((e) => console.error("[support init error]", e));
  supportInited = true;
}

}

async function bootstrap() {
  // Modal API global
  window.openCountryModal = openCountryModal;
  window.closeCountryModal = closeCountryModal;

  setupModalEvents();

  // Route init (avant les vues)
  window.addEventListener("hashchange", onRouteChange);
  onRouteChange();

  // Init UI + views MAP
  initControls();
  await initMapView();
  await initTimeSeriesView();
  await initChordView();
}

bootstrap().catch((err) => console.error("[bootstrap error]", err));
