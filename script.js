// =========================
// KONFIGURASI BACKEND API
// =========================
const API_BASE = "https://vaanoimonitoringtambak.vercel.app";

// =========================
// CEK LOGIN
// =========================
if (!localStorage.getItem("loggedIn")) {
  window.location.href = "index.html";
}

// Biar bisa dipanggil dari HTML (onclick)
window.logout = function () {
  localStorage.removeItem("loggedIn");
  window.location.href = "index.html";
};

// =========================
// ELEMENT HTML
// =========================
const tempEl = document.getElementById("temp");
const tempStatusEl = document.getElementById("tempStatus");
const levelEl = document.getElementById("level");
const levelStatusEl = document.getElementById("levelStatus");
const ntuEl = document.getElementById("ntu");
const ntuStatusEl = document.getElementById("ntuStatus");
const loadingEl = document.getElementById("loading");
const alertsEl = document.getElementById("alerts");
const ctx = document.getElementById("chart").getContext("2d");

let chart = null;

// =========================
// HELPER FUNCTIONS - DIPERBAIKI
// =========================
function setStatus(el, text, cls) {
  if (el) {
    el.textContent = text;
    el.className = cls;
  }
}

function showAlertMessages(messages) {
  if (alertsEl) {
    alertsEl.innerHTML = "";
    if (messages && messages.length > 0) {
      messages.forEach((msg) => {
        const div = document.createElement("div");
        div.className = "alert alert-danger alert-custom";
        div.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${msg}`;
        alertsEl.appendChild(div);
      });
    }
  }
}

function hideLoading() {
  if (loadingEl) loadingEl.style.display = "none";
}

function showLoading() {
  if (loadingEl) loadingEl.style.display = "inline-block";
}

// =========================
// 1. AMBIL DATA TERBARU - DIPERBAIKI
// =========================
async function fetchLatestData() {
  try {
    showLoading();
    
    console.log("🔄 Mengambil data dari:", `${API_BASE}/api/sensor/latest`);
    
    // Tambah timeout dan error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(`${API_BASE}/api/sensor/latest`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    console.log("📡 Response status:", res.status);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    console.log("✅ Data diterima:", data);
    
    hideLoading();

    // Validasi data - DIPERBAIKI
    if (!data || typeof data !== 'object') {
      throw new Error("Data tidak valid dari server");
    }

    // Update angka dengan default values
    const temperature = parseFloat(data.temperature) || 0;
    const levelPercent = parseFloat(data.levelPercent) || 0;
    const ntu = parseFloat(data.ntu) || 0;
    const levelStatus = data.levelStatus;
    const turbStatus = data.turbStatus;

    // Update UI elements dengan pengecekan null
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

    // Status level air - gunakan data dari Firebase jika ada
    if (levelStatus && levelStatus !== "Tidak Terdeteksi" && levelStatus !== "NO DATA") {
      setStatus(levelStatusEl, levelStatus, 
        levelStatus.includes("KOSONG") ? "status-danger" : 
        levelStatus.includes("Rendah") ? "status-warning" : "status-good");
    } else {
      if (levelPercent < 10) {
        setStatus(levelStatusEl, "Air Kurang - Perlu Ditambah", "status-danger");
      } else if (levelPercent <= 70) {
        setStatus(levelStatusEl, "Stabil", "status-good");
      } else {
        setStatus(levelStatusEl, "Risiko Meluap", "status-warning");
      }
    }

    // Status NTU - gunakan data dari Firebase jika ada
    if (turbStatus && turbStatus !== "Tidak Terdeteksi" && turbStatus !== "NO DATA") {
      setStatus(ntuStatusEl, turbStatus,
        turbStatus.includes("EKSTREM") ? "status-danger" :
        turbStatus.includes("Keruh") ? "status-warning" : "status-good");
    } else {
      if (ntu < 200) {
        setStatus(ntuStatusEl, "Jernih", "status-good");
      } else if (ntu <= 1000) {
        setStatus(ntuStatusEl, "Agak Keruh", "status-warning");
      } else {
        setStatus(ntuStatusEl, "Sangat Keruh - Perlu Sirkulasi", "status-danger");
      }
    }

    // Alert otomatis
    const alerts = [];
    if (temperature < 25 || temperature > 30) {
      alerts.push(`Suhu di luar rentang ideal (25-30°C). Saat ini: ${temperature}°C`);
    }
    if (levelPercent < 10) {
      alerts.push(`Level air sangat rendah (${levelPercent}%), segera tambahkan air.`);
    } else if (levelPercent > 80) {
      alerts.push(`Level air tinggi (${levelPercent}%), waspadai risiko meluap.`);
    }
    if (ntu > 1000) {
      alerts.push(`Kekeruhan sangat tinggi (${ntu} NTU), kualitas air buruk.`);
    }

    showAlertMessages(alerts);

  } catch (err) {
    console.error("❌ Error fetchLatestData:", err);
    hideLoading();
    showAlertMessages([
      "Gagal mengambil data terbaru dari server.", 
      `Error: ${err.message}`,
      "Pastikan backend berjalan dan koneksi internet stabil."
    ]);
    
    // Set default values saat error
    if (tempEl) tempEl.textContent = "0.0 °C";
    if (levelEl) levelEl.textContent = "0.0%";
    if (ntuEl) ntuEl.textContent = "0.0";
    setStatus(tempStatusEl, "Error", "status-danger");
    setStatus(levelStatusEl, "Error", "status-danger");
    setStatus(ntuStatusEl, "Error", "status-danger");
  }
}

// =========================
// 2. AMBIL HISTORY UNTUK CHART - DIPERBAIKI
// =========================
async function fetchHistoryData() {
  try {
    console.log("🔄 Mengambil history dari:", `${API_BASE}/api/sensor/history`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(`${API_BASE}/api/sensor/history`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    console.log("📡 History response status:", res.status);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const list = await res.json();
    console.log("✅ History data diterima:", list);

    if (!Array.isArray(list) || list.length === 0) {
      console.warn("ℹ️ History kosong");
      createEmptyChart();
      return;
    }

    // Urutkan berdasarkan timestamp
    const sortedList = [...list].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const labels = sortedList.map((item) => {
      const timestamp = item.timestamp || Date.now();
      const d = new Date(timestamp);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    });

    const tempData = sortedList.map((item) => parseFloat(item.temperature) || 0);
    const levelData = sortedList.map((item) => parseFloat(item.levelPercent) || 0);
    const ntuData = sortedList.map((item) => parseFloat(item.ntu) || 0);

    createChart(labels, tempData, levelData, ntuData);

  } catch (err) {
    console.error("❌ Error fetchHistoryData:", err);
    showAlertMessages(["Gagal mengambil data history dari server."]);
    createEmptyChart();
  }
}

// Fungsi untuk membuat chart
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

// Fungsi untuk chart kosong
function createEmptyChart() {
  if (chart) {
    chart.destroy();
  }

  const now = new Date();
  const timeString = now.getHours().toString().padStart(2, '0') + ':' + 
                     now.getMinutes().toString().padStart(2, '0');

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [timeString],
      datasets: [
        {
          label: "Suhu (°C)",
          data: [0],
          borderColor: "rgba(225, 112, 85, 0.5)",
          backgroundColor: "rgba(225, 112, 85, 0.1)",
        },
        {
          label: "Level Air (%)",
          data: [0],
          borderColor: "rgba(9, 132, 227, 0.5)",
          backgroundColor: "rgba(9, 132, 227, 0.1)",
        },
        {
          label: "Kekeruhan (NTU)",
          data: [0],
          borderColor: "rgba(0, 184, 148, 0.5)",
          backgroundColor: "rgba(0, 184, 148, 0.1)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    }
  });
}

// =========================
// 3. EXPOSE KE GLOBAL UNTUK TOMBOL
// =========================
window.updateData = fetchLatestData;
window.updateChart = fetchHistoryData;

// =========================
// 4. AUTO-REFRESH & INISIALISASI - DIPERBAIKI
// =========================
document.addEventListener('DOMContentLoaded', function() {
  console.log("🚀 Frontend initialized, connecting to:", API_BASE);
  
  // Tunggu sebentar sebelum load data pertama
  setTimeout(() => {
    fetchLatestData();
    fetchHistoryData();
  }, 1000);

  // Data terbaru auto refresh tiap 10 detik
  setInterval(fetchLatestData, 10000);
  
  // History refresh tiap 30 detik
  setInterval(fetchHistoryData, 30000);
});

// =========================
// 5. FUNGSI TEST KONEKSI - untuk debugging
// =========================
window.testConnection = async function() {
  try {
    const testResponse = await fetch(`${API_BASE}/api/debug`);
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log("✅ Backend test successful:", testData);
      alert("Koneksi berhasil! Backend berjalan normal.");
    } else {
      alert("Koneksi gagal! Status: " + testResponse.status);
    }
  } catch (error) {
    console.error("Test error:", error);
    alert("Error: " + error.message);
  }
};