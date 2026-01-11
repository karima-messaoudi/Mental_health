// src/data/loadGeoTimeMetrics.js
const d3 = window.d3;

export async function loadGeoTimeMetrics(url) {
  const raw = await d3.csv(url, d3.autoType);
  return raw;
}
