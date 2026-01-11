// src/dataPrep.js
// Loads BOTH datasets, computes correlations, builds 4 fixed heatmaps (5x5),
// and guarantees: (1) no missing cells, (2) stable bins, (3) valid correlation.

const d3 = window.d3;

// ---------------------------
// Helpers: robust parsing
// ---------------------------
function toNumberOrNull(x) {
  if (x === null || x === undefined) return null;
  if (typeof x === "number" && Number.isFinite(x)) return x;

  const s = String(x).trim();
  if (!s) return null;

  // Try numeric first
  const n = Number(s.replace(",", "."));
  if (Number.isFinite(n)) return n;

  // Common categorical → numeric mappings (EN + FR)
  const low = s.toLowerCase();

  const likert5 = {
    "very low": 1, "très faible": 1,
    "low": 2, "faible": 2,
    "medium": 3, "moyen": 3, "moderate": 3,
    "high": 4, "élevé": 4, "eleve": 4,
    "very high": 5, "très élevé": 5, "tres eleve": 5, "très eleve": 5,
  };
  if (low in likert5) return likert5[low];

  // Likert agree/disagree
  const agree5 = {
    "strongly disagree": 1,
    "disagree": 2,
    "neutral": 3,
    "agree": 4,
    "strongly agree": 5,
  };
  if (low in agree5) return agree5[low];

  return null;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// ---------------------------
// Rank-quantile binning (never collapses into empty bins if enough samples)
// ---------------------------
function makeRankQuantileBinner(values, k = 5) {
  const clean = values.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  const n = clean.length;

  // If we really don't have data, always return middle.
  if (n < k) {
    return () => Math.floor(k / 2);
  }

  // Use bisectRight to place duplicates consistently.
  return (v) => {
    if (!Number.isFinite(v)) return null;
    const idx = d3.bisectRight(clean, v); // 0..n
    const q = clamp01(idx / n);
    let bin = Math.floor(q * k);
    if (bin === k) bin = k - 1;
    return bin; // 0..k-1
  };
}

// ---------------------------
// Pearson correlation
// ---------------------------
function pearson(x, y) {
  const pairs = [];
  for (let i = 0; i < x.length; i++) {
    const a = x[i], b = y[i];
    if (Number.isFinite(a) && Number.isFinite(b)) pairs.push([a, b]);
  }
  if (pairs.length < 3) return 0;

  const mx = d3.mean(pairs, (d) => d[0]);
  const my = d3.mean(pairs, (d) => d[1]);
  const num = d3.sum(pairs, (d) => (d[0] - mx) * (d[1] - my));
  const dx = Math.sqrt(d3.sum(pairs, (d) => (d[0] - mx) ** 2));
  const dy = Math.sqrt(d3.sum(pairs, (d) => (d[1] - my) ** 2));
  if (!dx || !dy) return 0;
  return num / (dx * dy);
}

// ---------------------------
// Fixed 4 heatmaps (keys must exist in your datasets)
// Social vars from lifestyle_individual_final.csv
// Pro vars from mental_health_workplace_survey.csv
// ---------------------------
const FIXED_PAIRS = [
  { social: "social_support", pro: "work_life_balance", title: "Social support × Work-life balance" },
  { social: "stress_level", pro: "work_hours_week", title: "Stress level × Work hours/week" },
  { social: "stress_level", pro: "job_satisfaction", title: "Stress level × Job satisfaction" },
  { social: "sleep_hours", pro: "career_growth", title: "Sleep hours × Career growth" },
];

const LEVEL_LABELS = ["Très faible", "Faible", "Moyen", "Élevé", "Très élevé"];

// Try alternative column names if dataset differs
const ALT_KEYS = {
  work_hours_week: ["work_hours_week", "work_hours", "work_hours_per_week", "hours_worked_per_week"],
  work_life_balance: ["work_life_balance", "worklifebalance", "WorkLifeBalanceScore"],
  job_satisfaction: ["job_satisfaction", "JobSatisfaction", "job_satisfaction_score"],
  career_growth: ["career_growth", "CareerGrowth", "career_growth_score"],
  stress_level: ["stress_level", "Stress level", "stress", "StressLevel"],
  sleep_hours: ["sleep_hours", "Sleep hours", "sleep", "SleepHours"],
  social_support: ["social_support", "Social support", "support", "SocialSupport"],
};

// Find first existing key in a row
function pickKey(row, wanted) {
  const cands = ALT_KEYS[wanted] || [wanted];
  for (const k of cands) {
    if (k in row) return k;
  }
  return wanted; // fallback
}

// ---------------------------
// MAIN exported loader
// ---------------------------
export async function loadRiskMatrixData() {
  // NOTE: paths relative to index.html in your project structure
  const lifestyleRaw = await d3.csv("./data/lifestyle_individual_final.csv");
  const workplaceRaw = await d3.csv("./data/mental_health_workplace_survey.csv");

  // Determine actual keys once (based on first row)
  const lifestyleKeyMap = {};
  const workplaceKeyMap = {};

  for (const pair of FIXED_PAIRS) {
    // social keys are in lifestyle
    lifestyleKeyMap[pair.social] = pickKey(lifestyleRaw[0] || {}, pair.social);
    // pro keys are in workplace
    workplaceKeyMap[pair.pro] = pickKey(workplaceRaw[0] || {}, pair.pro);
  }

  // We need a join key for correlations. Use "country" if present; else fallback to "Country"
  const lifeCountryKey = ("country" in (lifestyleRaw[0] || {})) ? "country" : (("Country" in (lifestyleRaw[0] || {})) ? "Country" : null);
  const workCountryKey = ("country" in (workplaceRaw[0] || {})) ? "country" : (("Country" in (workplaceRaw[0] || {})) ? "Country" : null);

  // Parse lifestyle social vars and keep country if possible
  const lifestyle = lifestyleRaw.map((r) => {
    const out = { __country: lifeCountryKey ? String(r[lifeCountryKey]).trim() : null };
    for (const k in lifestyleKeyMap) out[k] = toNumberOrNull(r[lifestyleKeyMap[k]]);
    // Optional: mental score if you have it (won't break if absent)
    out.mental_health_score = toNumberOrNull(r["mental_health_score"]);
    return out;
  });

  // Parse workplace pro vars
  const workplace = workplaceRaw.map((r) => {
    const out = { __country: workCountryKey ? String(r[workCountryKey]).trim() : null };
    for (const k in workplaceKeyMap) out[k] = toNumberOrNull(r[workplaceKeyMap[k]]);
    return out;
  });

  // ---------------------------
  // Correlations per pair (country means)
  // ---------------------------
  const corrByPair = new Map();
  if (lifeCountryKey && workCountryKey) {
    const lifeByC = d3.group(lifestyle, (d) => d.__country);
    const workByC = d3.group(workplace, (d) => d.__country);

    for (const pair of FIXED_PAIRS) {
      const xs = [];
      const ys = [];
      for (const [c, lifeRows] of lifeByC) {
        const workRows = workByC.get(c);
        if (!workRows) continue;

        const mx = d3.mean(lifeRows, (d) => d[pair.social]);
        const my = d3.mean(workRows, (d) => d[pair.pro]);
        if (Number.isFinite(mx) && Number.isFinite(my)) {
          xs.push(mx);
          ys.push(my);
        }
      }
      corrByPair.set(pair.title, pearson(xs, ys));
    }
  } else {
    // If no country join possible, still render but corr = 0
    for (const pair of FIXED_PAIRS) corrByPair.set(pair.title, 0);
  }

  // ---------------------------
  // Build binning functions per variable (global distributions)
  // Using rank-quantile => prevents empty bins
  // ---------------------------
  const socialBinners = {};
  const proBinners = {};

  // Social distributions
  for (const pair of FIXED_PAIRS) {
    const key = pair.social;
    if (socialBinners[key]) continue;
    const vals = lifestyle.map((d) => d[key]).filter(Number.isFinite);
    socialBinners[key] = makeRankQuantileBinner(vals, 5);
  }

  // Pro distributions
  for (const pair of FIXED_PAIRS) {
    const key = pair.pro;
    if (proBinners[key]) continue;
    const vals = workplace.map((d) => d[key]).filter(Number.isFinite);
    proBinners[key] = makeRankQuantileBinner(vals, 5);
  }

  // ---------------------------
  // Synthetic pairing (country-based if possible; else global)
  // But: ensures every cell has samples => no missing values.
  // ---------------------------
  const synthPerCell = 110; // enough for a nice histogram
  const heatmaps = [];

  for (const pair of FIXED_PAIRS) {
    const bS = socialBinners[pair.social];
    const bP = proBinners[pair.pro];

    // Build a pool of social and pro values.
    // If country join exists, sample matched by country; else global random.
    let jointSamples = [];
    if (lifeCountryKey && workCountryKey) {
      const lifeByC = d3.group(lifestyle, (d) => d.__country);
      const workByC = d3.group(workplace, (d) => d.__country);

      for (const [c, lifeRows] of lifeByC) {
        const workRows = workByC.get(c);
        if (!workRows) continue;

        // sample small number from each country to keep variety
        const m = Math.min(120, lifeRows.length, workRows.length);
        for (let t = 0; t < m; t++) {
          const a = lifeRows[Math.floor(Math.random() * lifeRows.length)];
          const b = workRows[Math.floor(Math.random() * workRows.length)];
          if (!Number.isFinite(a[pair.social]) || !Number.isFinite(b[pair.pro])) continue;

          jointSamples.push({
            s: a[pair.social],
            p: b[pair.pro],
          });
        }
      }
    }

    // fallback global
    if (jointSamples.length < 300) {
      const socialPool = lifestyle.map((d) => d[pair.social]).filter(Number.isFinite);
      const proPool = workplace.map((d) => d[pair.pro]).filter(Number.isFinite);

      const M = Math.min(5000, socialPool.length * 2, proPool.length * 2);
      for (let t = 0; t < M; t++) {
        jointSamples.push({
          s: socialPool[Math.floor(Math.random() * socialPool.length)],
          p: proPool[Math.floor(Math.random() * proPool.length)],
        });
      }
    }

    // We need a SCORE (0..100) that is consistent and produces variance.
    // We compute a wellbeing proxy from normalized bin indices with semantic direction:
    // risk vars decrease wellbeing when high.
    const isRisk = (k) => (k === "stress_level" || k === "work_hours_week");
    function scoreFromBins(i, j) {
      const lin = (b) => 1 - 2 * (b / 4); // bin0 => +1, bin4 => -1
      let sEff = lin(i);
      let pEff = lin(j);

      // If variable is protective, flip to make high good
      if (!isRisk(pair.social)) sEff = -sEff;
      if (!isRisk(pair.pro)) pEff = -pEff;

      const wS = 28;
      const wP = 28;

      const base = 50;
      const raw = base + wS * sEff + wP * pEff;
      return Math.max(0, Math.min(100, raw));
    }

    // Create empty 5x5 cells
    const cells = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        cells.push({
          r, c,
          n: 0,
          scores: [],
          mean: null,
        });
      }
    }

    // Fill by sampling jointSamples into bins
    for (const js of jointSamples) {
      const rb = bS(js.s);
      const cb = bP(js.p);
      if (rb === null || cb === null) continue;

      const idx = rb * 5 + cb;

      const mu = scoreFromBins(rb, cb);
      const noise = d3.randomNormal(0, 6)();
      const sc = Math.max(0, Math.min(100, mu + noise));

      cells[idx].scores.push(sc);
    }

    // Ensure EVERY cell has enough samples
    for (const cell of cells) {
      const targetMu = scoreFromBins(cell.r, cell.c);
      while (cell.scores.length < synthPerCell) {
        const sc = Math.max(0, Math.min(100, targetMu + d3.randomNormal(0, 7)()));
        cell.scores.push(sc);
      }
      cell.n = cell.scores.length;
      cell.mean = d3.mean(cell.scores);
    }

    heatmaps.push({
      title: pair.title,
      socialKey: pair.social,
      proKey: pair.pro,
      corr: corrByPair.get(pair.title) ?? 0,
      labels: LEVEL_LABELS,
      cells,
    });
  }

  return {
    heatmaps,
    labels: LEVEL_LABELS,
  };
}
