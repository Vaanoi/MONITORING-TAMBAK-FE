// =========================
// KONFIGURASI APLIKASI
// =========================
const API_BASE = "https://vaanoimonitoringtambak.vercel.app";
const REFRESH_INTERVALS = {
    LATEST: 10000,    // 10 detik
    HISTORY: 30000    // 30 detik
};

// =========================
// CEK STATUS LOGIN
// =========================
if (!localStorage.getItem("loggedIn")) {
    window.location.href = "index.html";
}

// =========================
// ELEMENT REFERENCES
// =========================
const elements = {
    temp: document.getElementById("temp"),
    tempStatus: document.getElementById("tempStatus"),
    level: document.getElementById("level"),
    levelStatus: document.getElementById("levelStatus"),
    ntu: document.getElementById("ntu"),
    ntuStatus: document.getElementById("ntuStatus"),
    loading: document.getElementById("loading"),
    alerts: document.getElementById("alerts"),
    chart: document.getElementById("chart")?.getContext("2d")
};

let chart = null;

// =========================
// FUNGSI UTILITAS
// =========================
const utils = {
    setStatus(element, text, className) {
        if (element) {
            element.textContent = text;
            element.className = className;
        }
    },

    showAlertMessages(messages) {
        if (!elements.alerts) return;
        
        elements.alerts.innerHTML = "";
        
        if (messages?.length > 0) {
            messages.forEach(msg => {
                const alertDiv = document.createElement("div");
                alertDiv.className = "alert alert-danger alert-custom";
                alertDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${msg}`;
                elements.alerts.appendChild(alertDiv);
            });
        }
    },

    toggleLoading(show) {
        if (elements.loading) {
            elements.loading.style.display = show ? "inline-block" : "none";
        }
    },

    createFetchConfig() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        return {
            config: {
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' }
            },
            timeoutId
        };
    }
};

// =========================
// FUNGSI STATUS HANDLING
// =========================
const statusHandlers = {
    handleTemperature(temperature) {
        if (temperature >= 25 && temperature <= 30) {
            utils.setStatus(elements.tempStatus, "Ideal (25-30°C)", "status-good");
        } else if (temperature < 25) {
            utils.setStatus(elements.tempStatus, "Terlalu Dingin", "status-warning");
        } else {
            utils.setStatus(elements.tempStatus, "Terlalu Panas", "status-warning");
        }
    },

    handleWaterLevel(levelPercent, levelStatus) {
        if (levelStatus && levelStatus !== "Tidak Terdeteksi" && levelStatus !== "NO DATA") {
            const statusClass = levelStatus.includes("KOSONG") ? "status-danger" : 
                              levelStatus.includes("Rendah") ? "status-warning" : "status-good";
            utils.setStatus(elements.levelStatus, levelStatus, statusClass);
        } else {
            if (levelPercent < 10) {
                utils.setStatus(elements.levelStatus, "Air Kurang - Perlu Ditambah", "status-danger");
            } else if (levelPercent <= 70) {
                utils.setStatus(elements.levelStatus, "Stabil", "status-good");
            } else {
                utils.setStatus(elements.levelStatus, "Risiko Meluap", "status-warning");
            }
        }
    },

    handleTurbidity(ntu, turbStatus) {
        if (turbStatus && turbStatus !== "Tidak Terdeteksi" && turbStatus !== "NO DATA") {
            const statusClass = turbStatus.includes("EKSTREM") ? "status-danger" : 
                              turbStatus.includes("Keruh") ? "status-warning" : "status-good";
            utils.setStatus(elements.ntuStatus, turbStatus, statusClass);
        } else {
            if (ntu < 200) {
                utils.setStatus(elements.ntuStatus, "Jernih", "status-good");
            } else if (ntu <= 1000) {
                utils.setStatus(elements.ntuStatus, "Agak Keruh", "status-warning");
            } else {
                utils.setStatus(elements.ntuStatus, "Sangat Keruh - Perlu Sirkulasi", "status-danger");
            }
        }
    },

    generateAlerts(temperature, levelPercent, ntu) {
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
        
        return alerts;
    }
};

// =========================
// FUNGSI CHART
// =========================
const chartManager = {
    createChart(labels, tempData, levelData, ntuData) {
        if (chart) {
            chart.destroy();
        }

        chart = new Chart(elements.chart, {
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
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1000 },
                scales: {
                    x: { ticks: { autoSkip: true, maxTicksLimit: 10 } },
                    y: { beginAtZero: true }
                }
            }
        });
    },

    createEmptyChart() {
        if (chart) {
            chart.destroy();
        }

        const now = new Date();
        const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        chart = new Chart(elements.chart, {
            type: "line",
            data: {
                labels: [timeString],
                datasets: [
                    {
                        label: "Suhu (°C)",
                        data: [0],
                        borderColor: "rgba(225, 112, 85, 0.5)",
                        backgroundColor: "rgba(225, 112, 85, 0.1)"
                    },
                    {
                        label: "Level Air (%)",
                        data: [0],
                        borderColor: "rgba(9, 132, 227, 0.5)",
                        backgroundColor: "rgba(9, 132, 227, 0.1)"
                    },
                    {
                        label: "Kekeruhan (NTU)",
                        data: [0],
                        borderColor: "rgba(0, 184, 148, 0.5)",
                        backgroundColor: "rgba(0, 184, 148, 0.1)"
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
};

// =========================
// FUNGSI API
// =========================
const apiService = {
    async fetchLatestData() {
        try {
            utils.toggleLoading(true);
            console.log("🔄 Mengambil data dari:", `${API_BASE}/api/sensor/latest`);
            
            const { config, timeoutId } = utils.createFetchConfig();
            const response = await fetch(`${API_BASE}/api/sensor/latest`, config);
            clearTimeout(timeoutId);
            
            console.log("📡 Response status:", response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("✅ Data diterima:", data);
            
            this.processLatestData(data);
            
        } catch (error) {
            console.error("❌ Error fetchLatestData:", error);
            this.handleDataError();
        } finally {
            utils.toggleLoading(false);
        }
    },

    processLatestData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error("Data tidak valid dari server");
        }

        // Parse data dengan default values
        const temperature = parseFloat(data.temperature) || 0;
        const levelPercent = parseFloat(data.levelPercent) || 0;
        const ntu = parseFloat(data.ntu) || 0;
        const levelStatus = data.levelStatus;
        const turbStatus = data.turbStatus;

        // Update UI elements
        if (elements.temp) elements.temp.textContent = `${temperature.toFixed(1)} °C`;
        if (elements.level) elements.level.textContent = `${levelPercent.toFixed(1)}%`;
        if (elements.ntu) elements.ntu.textContent = ntu.toFixed(1);

        // Handle status
        statusHandlers.handleTemperature(temperature);
        statusHandlers.handleWaterLevel(levelPercent, levelStatus);
        statusHandlers.handleTurbidity(ntu, turbStatus);

        // Generate alerts
        const alerts = statusHandlers.generateAlerts(temperature, levelPercent, ntu);
        utils.showAlertMessages(alerts);
    },

    async fetchHistoryData() {
        try {
            console.log("🔄 Mengambil history dari:", `${API_BASE}/api/sensor/history`);
            
            const { config, timeoutId } = utils.createFetchConfig();
            const response = await fetch(`${API_BASE}/api/sensor/history`, config);
            clearTimeout(timeoutId);
            
            console.log("📡 History response status:", response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const list = await response.json();
            console.log("✅ History data diterima:", list);
            
            this.processHistoryData(list);
            
        } catch (error) {
            console.error("❌ Error fetchHistoryData:", error);
            utils.showAlertMessages(["Gagal mengambil data history dari server."]);
            chartManager.createEmptyChart();
        }
    },

    processHistoryData(list) {
        if (!Array.isArray(list) || list.length === 0) {
            console.warn("ℹ️ History kosong");
            chartManager.createEmptyChart();
            return;
        }

        // Urutkan berdasarkan timestamp
        const sortedList = [...list].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        
        const labels = sortedList.map(item => {
            const timestamp = item.timestamp || Date.now();
            const date = new Date(timestamp);
            return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
        });

        const tempData = sortedList.map(item => parseFloat(item.temperature) || 0);
        const levelData = sortedList.map(item => parseFloat(item.levelPercent) || 0);
        const ntuData = sortedList.map(item => parseFloat(item.ntu) || 0);

        chartManager.createChart(labels, tempData, levelData, ntuData);
    },

    handleDataError() {
        utils.showAlertMessages([
            "Gagal mengambil data terbaru dari server.",
            "Pastikan backend berjalan dan koneksi internet stabil."
        ]);

        // Set default values saat error
        if (elements.temp) elements.temp.textContent = "0.0 °C";
        if (elements.level) elements.level.textContent = "0.0%";
        if (elements.ntu) elements.ntu.textContent = "0.0";
        
        utils.setStatus(elements.tempStatus, "Error", "status-danger");
        utils.setStatus(elements.levelStatus, "Error", "status-danger");
        utils.setStatus(elements.ntuStatus, "Error", "status-danger");
    }
};

// =========================
// EVENT HANDLERS & INITIALIZATION
// =========================
window.logout = function() {
    localStorage.removeItem("loggedIn");
    window.location.href = "index.html";
};

window.updateData = () => apiService.fetchLatestData();
window.updateChart = () => apiService.fetchHistoryData();

// Fungsi test koneksi untuk debugging
window.testConnection = async function() {
    try {
        const response = await fetch(`${API_BASE}/api/debug`);
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Backend test successful:", data);
            alert("Koneksi berhasil! Backend berjalan normal.");
        } else {
            alert("Koneksi gagal! Status: " + response.status);
        }
    } catch (error) {
        console.error("Test error:", error);
        alert("Error: " + error.message);
    }
};

// =========================
// INISIALISASI APLIKASI
// =========================
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Frontend initialized, connecting to:", API_BASE);
    
    // Tunggu sebentar sebelum load data pertama
    setTimeout(() => {
        apiService.fetchLatestData();
        apiService.fetchHistoryData();
    }, 1000);

    // Setup auto-refresh
    setInterval(apiService.fetchLatestData, REFRESH_INTERVALS.LATEST);
    setInterval(apiService.fetchHistoryData, REFRESH_INTERVALS.HISTORY);
});