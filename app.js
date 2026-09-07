(() => {
  "use strict";

  const STORAGE_KEY = "runplan.sessions.v1";
  const SETTINGS_KEY = "runplan.settings.v1";

  const TYPE_LABELS = {
    endurance: "Endurance",
    fractionne: "Fractionné",
    repos: "Repos",
    course: "Course (objectif)",
    autre: "Autre",
  };

  const MONTHS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];

  // ---------- State ----------
  let sessions = loadSessions();
  let settings = loadSettings();
  let viewYear, viewMonth; // current calendar view (0-indexed month)
  let activeDateKey = null; // date currently open in the sheet
  let sheetMode = "view"; // "view" | "edit" | "create"

  const today = new Date();
  viewYear = today.getFullYear();
  viewMonth = today.getMonth();

  // ---------- Storage ----------
  function loadSessions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error("Erreur de lecture des séances", e);
      return {};
    }
  }

  function saveSessions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : { raceName: "", raceDate: "" };
    } catch (e) {
      return { raceName: "", raceDate: "" };
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  // ---------- Helpers ----------
  function dateKey(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function todayKey() {
    return dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  }

  function formatDateLabel(key) {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const weekday = date.toLocaleDateString("fr-FR", { weekday: "long" });
    return `${capitalize(weekday)} ${d} ${MONTHS_FR[m - 1]}`;
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function computePace(distanceKm, durationMin) {
    if (!distanceKm || !durationMin) return null;
    const paceMin = durationMin / distanceKm;
    const min = Math.floor(paceMin);
    const sec = Math.round((paceMin - min) * 60);
    return `${min}:${String(sec).padStart(2, "0")}`;
  }

  // ---------- Calendar rendering ----------
  const gridEl = document.getElementById("calendar-grid");
  const monthLabelEl = document.getElementById("month-label");

  function renderCalendar() {
    monthLabelEl.textContent = `${MONTHS_FR[viewMonth]} ${viewYear}`;
    gridEl.innerHTML = "";

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    // Monday-first offset
    let startOffset = firstOfMonth.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const tKey = todayKey();
    const raceKey = settings.raceDate || null;

    for (let i = 0; i < startOffset; i++) {
      const empty = document.createElement("div");
      empty.className = "day-cell empty";
      gridEl.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(viewYear, viewMonth, d);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "day-cell";
      if (key === tKey) cell.classList.add("today");
      if (key === raceKey) cell.classList.add("race");

      const num = document.createElement("span");
      num.className = "day-num";
      num.textContent = d;
      cell.appendChild(num);

      const session = sessions[key];
      if (session && key !== raceKey) {
        const dot = document.createElement("span");
        dot.className = `day-dot type-${session.type}`;
        cell.appendChild(dot);
        if (session.completed) cell.classList.add("done");
      } else if (key === raceKey) {
        const flag = document.createElement("span");
        flag.style.fontSize = "14px";
        flag.textContent = "🏁";
        cell.appendChild(flag);
      }

      cell.addEventListener("click", () => openSheet(key));
      gridEl.appendChild(cell);
    }
  }

  document.getElementById("prev-month").addEventListener("click", () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  });
  document.getElementById("next-month").addEventListener("click", () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  });

  // ---------- Header (race name + countdown) ----------
  function renderHeader() {
    const nameEl = document.getElementById("race-name");
    const countdownEl = document.getElementById("race-countdown");
    nameEl.textContent = settings.raceName || "Mon Plan de Course";

    if (settings.raceDate) {
      const race = new Date(settings.raceDate + "T00:00:00");
      const diffDays = Math.ceil((race - new Date(new Date().toDateString())) / 86400000);
      if (diffDays > 1) countdownEl.textContent = `J-${diffDays} avant la course`;
      else if (diffDays === 1) countdownEl.textContent = "C'est demain !";
      else if (diffDays === 0) countdownEl.textContent = "C'est aujourd'hui ! Bonne course 🏁";
      else countdownEl.textContent = "Course passée";
    } else {
      countdownEl.textContent = "Configure ta date de course dans les réglages ⚙️";
    }
  }

  // ---------- Today / next session card ----------
  function renderTodayCard() {
    const card = document.getElementById("today-card");
    const body = document.getElementById("today-card-body");
    const keys = Object.keys(sessions).filter(k => k >= todayKey()).sort();
    const nextKey = keys[0];

    if (!nextKey) { card.hidden = true; return; }

    const s = sessions[nextKey];
    card.hidden = false;
    const pace = s.pace || computePace(s.distance, s.duration);
    body.innerHTML = `
      <div class="row"><span class="label">Date</span><span>${formatDateLabel(nextKey)}</span></div>
      <div class="row"><span class="label">Type</span><span class="type-badge type-${s.type}">${TYPE_LABELS[s.type]}</span></div>
      ${s.distance ? `<div class="row"><span class="label">Distance</span><span>${s.distance} km</span></div>` : ""}
      ${s.duration ? `<div class="row"><span class="label">Temps</span><span>${s.duration} min</span></div>` : ""}
      ${pace ? `<div class="row"><span class="label">Allure</span><span>${pace} /km</span></div>` : ""}
      ${s.description ? `<div class="desc">${escapeHtml(s.description)}</div>` : ""}
    `;
    body.parentElement.querySelector("h3").textContent =
      nextKey === todayKey() ? "Séance du jour" : "Prochaine séance";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Sheet (view/edit session) ----------
  const overlay = document.getElementById("sheet-overlay");
  const viewMode = document.getElementById("sheet-view-mode");
  const viewContent = document.getElementById("sheet-view-content");
  const form = document.getElementById("sheet-form");
  const dateLabelEl = document.getElementById("sheet-date-label");

  function openSheet(key) {
    activeDateKey = key;
    dateLabelEl.textContent = formatDateLabel(key);
    const existing = sessions[key];
    sheetMode = existing ? "view" : "create";
    renderSheet();
    overlay.hidden = false;
  }

  function closeSheet() {
    overlay.hidden = true;
    activeDateKey = null;
  }

  function renderSheet() {
    const existing = activeDateKey ? sessions[activeDateKey] : null;

    if (sheetMode === "view" && existing) {
      viewMode.hidden = false;
      form.hidden = true;
      const pace = existing.pace || computePace(existing.distance, existing.duration);
      viewContent.innerHTML = `
        <div class="row"><span class="label">Type</span><span class="type-badge type-${existing.type}">${TYPE_LABELS[existing.type]}</span></div>
        ${existing.distance ? `<div class="row"><span class="label">Distance</span><span>${existing.distance} km</span></div>` : ""}
        ${existing.duration ? `<div class="row"><span class="label">Temps</span><span>${existing.duration} min</span></div>` : ""}
        ${pace ? `<div class="row"><span class="label">Allure</span><span>${pace} /km</span></div>` : ""}
        <div class="row"><span class="label">Effectuée</span><span>${existing.completed ? "✅ Oui" : "⏳ Non"}</span></div>
        ${existing.description ? `<div class="desc">${escapeHtml(existing.description)}</div>` : ""}
      `;
    } else {
      viewMode.hidden = true;
      form.hidden = false;
      document.getElementById("field-type").value = existing ? existing.type : "endurance";
      document.getElementById("field-distance").value = existing ? existing.distance || "" : "";
      document.getElementById("field-duration").value = existing ? existing.duration || "" : "";
      document.getElementById("field-pace").value = existing ? existing.pace || "" : "";
      document.getElementById("field-description").value = existing ? existing.description || "" : "";
      document.getElementById("field-completed").checked = existing ? !!existing.completed : false;
    }
  }

  document.getElementById("sheet-close").addEventListener("click", closeSheet);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeSheet(); });

  document.getElementById("sheet-edit-btn").addEventListener("click", () => {
    sheetMode = "edit";
    renderSheet();
  });

  document.getElementById("sheet-delete-btn").addEventListener("click", () => {
    if (!activeDateKey) return;
    if (confirm("Supprimer cette séance ?")) {
      delete sessions[activeDateKey];
      saveSessions();
      closeSheet();
      renderCalendar();
      renderTodayCard();
    }
  });

  document.getElementById("form-cancel-btn").addEventListener("click", () => {
    if (sessions[activeDateKey]) {
      sheetMode = "view";
      renderSheet();
    } else {
      closeSheet();
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!activeDateKey) return;
    const distance = parseFloat(document.getElementById("field-distance").value) || null;
    const duration = parseFloat(document.getElementById("field-duration").value) || null;
    let pace = document.getElementById("field-pace").value.trim();
    if (!pace) pace = computePace(distance, duration) || "";

    sessions[activeDateKey] = {
      type: document.getElementById("field-type").value,
      distance,
      duration,
      pace: pace || null,
      description: document.getElementById("field-description").value.trim(),
      completed: document.getElementById("field-completed").checked,
    };
    saveSessions();
    sheetMode = "view";
    renderSheet();
    renderCalendar();
    renderTodayCard();
  });

  document.getElementById("fab-add").addEventListener("click", () => {
    openSheet(todayKey());
  });

  // ---------- Settings sheet ----------
  const settingsOverlay = document.getElementById("settings-overlay");

  function openSettings() {
    document.getElementById("settings-race-name").value = settings.raceName || "";
    document.getElementById("settings-race-date").value = settings.raceDate || "";
    settingsOverlay.hidden = false;
  }
  function closeSettings() { settingsOverlay.hidden = true; }

  document.getElementById("settings-btn").addEventListener("click", openSettings);
  document.getElementById("settings-close").addEventListener("click", closeSettings);
  document.getElementById("settings-cancel-btn").addEventListener("click", closeSettings);
  settingsOverlay.addEventListener("click", (e) => { if (e.target === settingsOverlay) closeSettings(); });

  document.getElementById("settings-form").addEventListener("submit", (e) => {
    e.preventDefault();
    settings.raceName = document.getElementById("settings-race-name").value.trim();
    settings.raceDate = document.getElementById("settings-race-date").value;
    saveSettings();
    renderHeader();
    renderCalendar();
    closeSettings();
  });

  document.getElementById("export-btn").addEventListener("click", () => {
    const data = JSON.stringify({ sessions, settings }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plan-course.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById("import-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.sessions) sessions = data.sessions;
        if (data.settings) settings = data.settings;
        saveSessions();
        saveSettings();
        renderHeader();
        renderCalendar();
        renderTodayCard();
        alert("Import réussi !");
      } catch (err) {
        alert("Fichier invalide.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // ---------- Init ----------
  renderHeader();
  renderCalendar();
  renderTodayCard();

  // ---------- Service worker (offline / installable) ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((err) => {
        console.warn("Service worker registration failed", err);
      });
    });
  }
})();
