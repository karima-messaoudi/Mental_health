// src/state.js

const state = {
  year: 2000,
  sex: "Both sexes",
  ageGroup: "15-19",
  selectedCountry: null
};

const listeners = new Set();

export function getState() {
  return { ...state }; // copie protégée
}

export function updateState(patch) {
  Object.assign(state, patch);
  listeners.forEach((cb) => cb(getState()));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener); // pour se désabonner si besoin
}





