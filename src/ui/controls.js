// src/ui/controls.js
import { getState, updateState, subscribe } from "../state.js";

let playInterval = null;
let isPlaying = false;

export function initControls() {
  const container = document.getElementById("controls-panel");

  container.innerHTML = `
    <div class="control-group">
      <label>Année : <span id="year-value" class="pill"></span></label>
      <div style="display:flex;align-items:center;gap:10px;">
        <input type="range" id="year-slider" min="1990" max="2019" step="1" />
        <button id="play-btn" class="play-btn">
          ▶ Animer
        </button>
      </div>
    </div>

    <div class="control-group">
      <label>Sexe</label>
      <select id="sex-select">
        <option value="Both sexes">Both sexes</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </select>
    </div>

    <div class="control-group">
      <label>Groupe d'âge</label>
      <select id="age-select">
        <option value="15-19">15-19</option>
        <option value="20-24">20-24</option>
        <option value="25-29">25-29</option>
        <option value="30-34">30-34</option>
        <option value="35-39">35-39</option>
        <option value="40-44">40-44</option>
        <option value="45-49">45-49</option>
        <option value="50-69">50-69</option>
        <option value="70+">70+</option>
      </select>
    </div>
  `;

  const yearSlider = document.getElementById("year-slider");
  const yearValue  = document.getElementById("year-value");
  const playBtn    = document.getElementById("play-btn");
  const sexSelect  = document.getElementById("sex-select");
  const ageSelect  = document.getElementById("age-select");

  const s = getState();
  yearSlider.value    = s.year;
  yearValue.textContent = s.year;
  sexSelect.value     = s.sex;
  ageSelect.value     = s.ageGroup;
  yearSlider.max      =2017;

  // Slider année
  yearSlider.addEventListener("input", (e) => {
    const newYear = +e.target.value;
    updateState({ year: newYear });
  });

  // Play / Pause animation
  playBtn.addEventListener("click", () => {
    if (!isPlaying) {
      startAnimation(yearSlider, playBtn);
    } else {
      stopAnimation(playBtn);
    }
  });

  // Sexe
  sexSelect.addEventListener("change", (e) => {
    updateState({ sex: e.target.value });
  });

  // Tranche d'âge
  ageSelect.addEventListener("change", (e) => {
    updateState({ ageGroup: e.target.value });
  });

  // Quand le state change -> mettre à jour le texte de l'année
  subscribe((st) => {
    yearSlider.value = st.year;
    yearValue.textContent = st.year;
  });
}

function startAnimation(yearSlider, button) {
  const minYear = Number(yearSlider.min);
  const maxYear = Number(yearSlider.max);

  isPlaying = true;
  button.classList.add("active");
  button.textContent = "⏸ Pause";

  playInterval = setInterval(() => {
    const current = getState().year;
    let next = current + 1;
    if (next > maxYear) next = minYear;
    updateState({ year: next });
  }, 700); // vitesse de défilement (ms)
}

function stopAnimation(button) {
  isPlaying = false;
  button.classList.remove("active");
  button.textContent = "▶ Animer";

  if (playInterval) {
    clearInterval(playInterval);
    playInterval = null;
  }
}
