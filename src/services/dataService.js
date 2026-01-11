// src/services/dataService.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

let cache = null;

export async function loadAllData() {
  if (cache) return cache;

  const [worldTopo, geo, demographic, lifestyle] = await Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    d3.csv("data/geo_time_metrics.csv", d => ({
      country: d.country,
      year: +d.year,
      sex: d.sex,
      age_group: d.age_group,
      suicide_rate: +d.suicide_rate
    })),
    d3.csv("data/demographic_metrics.csv"),
    d3.csv("data/lifestyle_individual_final.csv") 
  ]);

  const world = feature(worldTopo, worldTopo.objects.countries).features;

  cache = { world, geo, demographic, lifestyle };
  return cache;
}
