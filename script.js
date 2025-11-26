// =========================
// KONFIGURASI FIREBASE
// =========================
import { getDatabase, ref, onValue } from "firebase/database";

// Inisialisasi database Firebase
const db = getDatabase();
const dataRef = ref(db, 'sensor-data'); // Sesuaikan dengan path data yang ada di Firebase

// =========================
// 1. AMBIL DATA TERBARU DARI FIREBASE (Real-time)
// =========================
async function fetchLatestData() {
  try {
    showLoading();
    console.log("🔄 Mengambil data dari Firebase...");

    // Mendengarkan perubahan data real-time
    onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      console.log("📡 Data realtime diterima:", data);

      if (!data) {
        hideLoading();
        return;
      }

      // Format data menjadi array untuk chart
      const labels = Object.keys(data).map((timestamp) => {
        const d = new Date(parseInt(timestamp));
        return `${d.getHours()}:${d.getMinutes()}`;
      });

      const tempData = Object.values(data).map(item => parseFloat(item.temperature) || 0);
      const levelData = Object.values(data).map(item => parseFloat(item.levelPercent) || 0);
      const ntuData = Object.values(data).map(item => parseFloat(item.ntu) || 0);

      // Update chart
      createChart(labels, tempData, levelData, ntuData);

      // Update UI Elements
      updateUIElements(data);
    });

  } catch (err) {
    console.error("❌ Error fetchLatestData:", err);
    hideLoading();
    showAlertMessages(["Gagal mengambil data terbaru dari Firebase."]);
  }
}

// Fungsi untuk memperbarui elemen UI dengan data terbaru
function updateUIElements(data) {
  const latestData = Object.values(data).pop(); // Ambil data terakhir

  // Perbarui elemen UI dengan data terbaru
  const temperature = parseFloat(latestData.temperature) || 0;
  const levelPercent = parseFloat(latestData.levelPercent) || 0;
  const ntu = parseFloat(latestData.ntu) || 0;

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

// =========================
// 2. UPDATE CHART
// =========================
function createChart(labels, tempData, levelData, ntuData) {
  if (chart) {
    chart.destroy(); // Hapus chart sebelumnya sebelum membuat chart baru
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

// =========================
// 3. EXPOSE KE GLOBAL UNTUK TOMBOL
// =========================
window.updateData = fetchLatestData;
window.updateChart = fetchLatestData; // update chart berdasarkan data terbaru

// =========================
// 4. AUTO-REFRESH & INISIALISASI
// =========================
document.addEventListener('DOMContentLoaded', function() {
  console.log("🚀 Frontend initialized, connecting to Firebase...");
  fetchLatestData(); // Ambil data pertama kali ketika halaman dimuat

  // Data terbaru auto-refresh tiap 10 detik
  setInterval(fetchLatestData, 10000); // Pembaruan data setiap 10 detik
});
