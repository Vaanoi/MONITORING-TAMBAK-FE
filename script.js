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

// Fungsi Logout
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
// HELPER FUNCTIONS
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
// 1. AMBIL DATA TERBARU
// =========================
async function fetchLatestData() {
  try {
    showLoading();
    console.log(`🔄 Mengambil data dari: ${API_BASE}/api/sensor/latest`);

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

    if (!data || typeof data !== 'object') {
      throw new Error("Data tidak valid dari server");
    }

    updateUIElements(data);

  } catch (err) {
    console.error("❌ Error fetchLatestData:", err);
    hideLoading();
    showAlertMessages([
      "Gagal mengambil data terbaru dari server.",
      `Error: ${err.message}`,
      "Pastikan backend berjalan dan koneksi internet stabil."
    ]);
    setStatus(tempStatusEl, "Error", "status-danger");
    setStatus(levelStatusEl, "Error", "status-danger");
    setStatus(ntuStatusEl, "Error", "status-danger");
  }
}

// =========================
// 2. AMBIL HISTORY UNTUK CHART
// =========================
async function fetchHistoryData() {
  try {
    console.log(`🔄 Mengambil history dari: ${API_BASE}/api/sensor/history`);

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

// =========================
// 3. FUNGSI CHART
// =========================
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

// Fungsi untuk chart kosong jika data tidak ada
function createEmptyChart() {
  if (chart) {
    chart.destroy();
  }

  const now = new Date();
  const timeString = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

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
// 4. AUTO-REFRESH & INISIALISASI
// =========================
document.addEventListener('DOMContentLoaded', function() {
  console.log("🚀 Frontend initialized, connecting to:", API_BASE);
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
// 5. FUNGSI TEST KONEKSI
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
