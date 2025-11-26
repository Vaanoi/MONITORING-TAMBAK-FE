// script.js
import { db } from './firebase-config.js';
import { ref, onValue } from "firebase/database";

// DOM Elements
const tempEl = document.getElementById("temp");
const levelEl = document.getElementById("level");
const ntuEl = document.getElementById("ntu");
const tempStatusEl = document.getElementById("tempStatus");
const levelStatusEl = document.getElementById("levelStatus");
const ntuStatusEl = document.getElementById("ntuStatus");
const ctx = document.getElementById("chart").getContext("2d");

let chart = null;

// Firebase Database Reference
const dataRef = ref(db, 'Tambak/DataTerbaru'); // Path data Firebase

// Firebase Listener for Real-Time Data
onValue(dataRef, (snapshot) => {
  const data = snapshot.val();
  if (data) {
    console.log("Data diterima:", data);

    const labels = ["Now"];
    const tempData = [parseFloat(data.temperature) || 0];
    const levelData = [parseFloat(data.levelPercent) || 0];
    const ntuData = [parseFloat(data.ntu) || 0];

    createChart(labels, tempData, levelData, ntuData);
    updateUIElements(data);
  } else {
    console.log("Data tidak ada atau tidak valid.");
  }
}, (error) => {
  console.error("Error Firebase:", error);
});

// Update UI with Data
function updateUIElements(data) {
  const temperature = parseFloat(data.temperature) || 0;
  const levelPercent = parseFloat(data.levelPercent) || 0;
  const ntu = parseFloat(data.ntu) || 0;

  if (tempEl) tempEl.textContent = temperature.toFixed(1) + " °C";
  if (levelEl) levelEl.textContent = levelPercent.toFixed(1) + "%";
  if (ntuEl) ntuEl.textContent = ntu.toFixed(1);

  if (temperature >= 25 && temperature <= 30) {
    setStatus(tempStatusEl, "Ideal (25-30°C)", "status-good");
  } else if (temperature < 25) {
    setStatus(tempStatusEl, "Terlalu Dingin", "status-warning");
  } else {
    setStatus(tempStatusEl, "Terlalu Panas", "status-warning");
  }

  if (levelPercent < 10) {
    setStatus(levelStatusEl, "Air Kurang - Perlu Ditambah", "status-danger");
  } else if (levelPercent <= 70) {
    setStatus(levelStatusEl, "Stabil", "status-good");
  } else {
    setStatus(levelStatusEl, "Risiko Meluap", "status-warning");
  }

  if (ntu < 200) {
    setStatus(ntuStatusEl, "Jernih", "status-good");
  } else if (ntu <= 1000) {
    setStatus(ntuStatusEl, "Agak Keruh", "status-warning");
  } else {
    setStatus(ntuStatusEl, "Sangat Keruh - Perlu Sirkulasi", "status-danger");
  }
}

// Create Chart
function createChart(labels, tempData, levelData, ntuData) {
  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Suhu (°C)",
          data: tempData,
          borderColor: "rgba(225, 112, 85, 1)",
          backgroundColor: "rgba(225, 112, 85, 0.1)",
          tension: 0.4,
          borderWidth: 2,
          fill: true
        },
        {
          label: "Level Air (%)",
          data: levelData,
          borderColor: "rgba(9, 132, 227, 1)",
          backgroundColor: "rgba(9, 132, 227, 0.1)",
          tension: 0.4,
          borderWidth: 2,
          fill: true
        },
        {
          label: "Kekeruhan (NTU)",
          data: ntuData,
          borderColor: "rgba(0, 184, 148, 1)",
          backgroundColor: "rgba(0, 184, 148, 0.1)",
          tension: 0.4,
          borderWidth: 2,
          fill: true
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000
      },
      scales: {
        x: {
          ticks: { autoSkip: true, maxTicksLimit: 10 },
        },
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

// Set Status
function setStatus(el, text, cls) {
  if (el) {
    el.textContent = text;
    el.className = cls;
  }
}
