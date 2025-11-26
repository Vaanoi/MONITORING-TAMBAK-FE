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

// Firebase Database Reference (Path yang sesuai dengan Firebase Anda)
const dataRef = ref(db, 'Tambak/DataTerbaru'); // Pastikan path ini benar sesuai dengan data di Firebase

// Firebase Listener untuk mengambil data secara real-time
onValue(dataRef, (snapshot) => {
  const data = snapshot.val();  // Mengambil data dari Firebase

  if (data) {
    console.log("Data diterima:", data);  // Log data yang diterima dari Firebase

    // Data untuk Chart (hanya satu titik data, jadi gunakan "Now" sebagai label)
    const labels = ["Now"];
    const tempData = [parseFloat(data.temperature) || 0];
    const levelData = [parseFloat(data.levelPercent) || 0];
    const ntuData = [parseFloat(data.ntu) || 0];

    // Update chart dengan data terbaru
    createChart(labels, tempData, levelData, ntuData);

    // Update elemen UI
    updateUIElements(data);
  } else {
    console.log("Data tidak ada atau tidak valid.");
  }
}, (error) => {
  console.error("Error Firebase:", error);  // Log error jika ada masalah dengan Firebase
});

// Fungsi untuk memperbarui elemen UI
function updateUIElements(data) {
  const temperature = parseFloat(data.temperature) || 0;
  const levelPercent = parseFloat(data.levelPercent) || 0;
  const ntu = parseFloat(data.ntu) || 0;

  // Perbarui elemen UI
  if (tempEl) tempEl.textContent = temperature.toFixed(1) + " °C";
  if (levelEl) levelEl.textContent = levelPercent.toFixed(1) + "%";
  if (ntuEl) ntuEl.textContent = ntu.toFixed(1);

  // Status suhu
  if (temperature >= 25 && temperature <= 30) {
    setStatus(tempStatusEl, "Ideal (25-30°C)", "status-good");
  } else if (temperature < 25) {
    setStatus(tempStatusEl, "Terlalu Dingin", "status-warning");
  } else {
    setStatus(tempStatusEl, "Terlalu Panas", "status-warning");
  }

  // Status level air
  if (levelPercent < 10) {
    setStatus(levelStatusEl, "Air Kurang - Perlu Ditambah", "status-danger");
  } else if (levelPercent <= 70) {
    setStatus(levelStatusEl, "Stabil", "status-good");
  } else {
    setStatus(levelStatusEl, "Risiko Meluap", "status-warning");
  }

  // Status NTU
  if (ntu < 200) {
    setStatus(ntuStatusEl, "Jernih", "status-good");
  } else if (ntu <= 1000) {
    setStatus(ntuStatusEl, "Agak Keruh", "status-warning");
  } else {
    setStatus(ntuStatusEl, "Sangat Keruh - Perlu Sirkulasi", "status-danger");
  }
}

// Fungsi untuk membuat chart
function createChart(labels, tempData, levelData, ntuData) {
  if (chart) {
    chart.destroy();  // Hapus chart lama untuk update dengan data baru
  }

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,  // Label berdasarkan waktu
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

// Fungsi untuk mengatur status (warna dan pesan)
function setStatus(el, text, cls) {
  if (el) {
    el.textContent = text;
    el.className = cls;
  }
}
