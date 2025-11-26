// =========================
// KONFIGURASI APLIKASI
// =========================
const API_BASE = "https://vaanoimonitoringtambak.vercel.app";

// Cek login
if (!localStorage.getItem("loggedIn")) {
    window.location.href = "index.html";
}

// Element references
const elements = {
    temp: document.getElementById("temp"),
    tempStatus: document.getElementById("tempStatus"),
    level: document.getElementById("level"),
    levelStatus: document.getElementById("levelStatus"),
    ntu: document.getElementById("ntu"),
    ntuStatus: document.getElementById("ntuStatus"),
    loading: document.getElementById("loading"),
    alerts: document.getElementById("alerts")
};

// Chart setup
let chart = null;
const chartCanvas = document.getElementById("chart");
const chartCtx = chartCanvas ? chartCanvas.getContext("2d") : null;

// Storage untuk data history lokal
let localHistory = [];

// =========================
// FUNGSI UTILITAS WAKTU - FIXED FORMAT
// =========================
function showLoading(show) {
    if (elements.loading) {
        elements.loading.style.display = show ? "inline-block" : "none";
    }
}

function showAlert(message, isError = true) {
    console.log(isError ? "❌ " : "✅ ", message);
    if (elements.alerts) {
        const alertClass = isError ? "alert-danger" : "alert-success";
        elements.alerts.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
        
        setTimeout(() => {
            if (elements.alerts) elements.alerts.innerHTML = "";
        }, 5000);
    }
}

function setStatus(element, text, className) {
    if (element) {
        element.textContent = text;
        element.className = className;
    }
}

// FUNGSI WAKTU YANG DIPERBAIKI - FORMAT INDONESIA
function formatTime(timestamp) {
    const date = new Date(timestamp);
    
    // Format manual untuk konsistensi: HH:MM:SS
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return {
        time: `${hours}:${minutes}:${seconds}`,
        full: `${hours}:${minutes}:${seconds}`,
        date: date.toLocaleDateString('id-ID')
    };
}

// FUNGSI BARU: Dapatkan waktu sekarang dalam format Indonesia
function getCurrentIndonesiaTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// FUNGSI BARU: Buat timestamp dengan offset WIB (UTC+7)
function createWIBTimestamp() {
    const now = new Date();
    // WIB = UTC + 7 hours
    const wibOffset = 7 * 60 * 60 * 1000; // 7 jam dalam milidetik
    return now.getTime() + wibOffset;
}

// FUNGSI BARU: Convert ke WIB time
function toWIBTime(timestamp) {
    const wibOffset = 7 * 60 * 60 * 1000;
    return new Date(timestamp + wibOffset);
}

// =========================
// FUNGSI CHART - FORMAT WAKTU FIXED
// =========================
function initializeChart() {
    if (!chartCtx) {
        console.error("❌ Chart context tidak tersedia");
        return;
    }

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Suhu (°C)',
                    data: [],
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Level Air (%)',
                    data: [],
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Kekeruhan (NTU)',
                    data: [],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    display: true,
                    title: { display: true, text: 'Waktu' },
                    ticks: {
                        maxTicksLimit: 6,
                        callback: function(value, index, values) {
                            if (values.length <= 6) return this.getLabelForValue(value);
                            return index % Math.ceil(values.length / 6) === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: {
                    display: true,
                    title: { display: true, text: 'Nilai' },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: { display: true, position: 'top' }
            }
        }
    });

    console.log("✅ Chart initialized");
}

function updateChartFromLocalHistory() {
    if (!chart || localHistory.length === 0) return;

    try {
        // Ambil data terbaru (maksimal 8 data untuk readability)
        const recentData = localHistory.slice(-8);
        
        console.log("📊 Updating chart with:", recentData.length, "data points");
        console.log("🕒 Current time:", getCurrentIndonesiaTime());
        
        // Format labels dengan waktu yang benar
        const labels = recentData.map(item => {
            return formatTime(item.timestamp).time;
        });

        const tempData = recentData.map(item => item.temperature);
        const levelData = recentData.map(item => item.levelPercent);
        const ntuData = recentData.map(item => item.ntu);

        // Debug: Tampilkan data waktu
        console.log("🏷️ Chart labels:", labels);
        if (recentData.length > 0) {
            const latest = recentData[recentData.length - 1];
            console.log("🕒 Latest data timestamp:", new Date(latest.timestamp).toString());
        }

        // Update chart
        chart.data.labels = labels;
        chart.data.datasets[0].data = tempData;
        chart.data.datasets[1].data = levelData;
        chart.data.datasets[2].data = ntuData;
        
        chart.update('active');
        
        console.log(`✅ Chart updated at ${getCurrentIndonesiaTime()}`);
        
    } catch (error) {
        console.error("❌ Error updating chart from local history:", error);
    }
}

// =========================
// FUNGSI DATA HANDLING - GUNAKAN WAKTU SEKARANG
// =========================
async function fetchLatestData() {
    console.log("🔄 Fetching latest data...");
    console.log("🕒 Current time:", getCurrentIndonesiaTime());
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE}/api/sensor/latest?t=${Date.now()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log("✅ Latest data received:", data);
        
        // Update UI
        updateUI(data);
        
        // Tambahkan ke local history dengan timestamp sekarang
        addToLocalHistory(data);
        
        // Update chart dengan data real-time
        updateChartFromLocalHistory();
        
    } catch (error) {
        console.error("❌ Error fetching latest data:", error);
        showAlert("Gagal mengambil data terbaru: " + error.message);
    } finally {
        showLoading(false);
    }
}

function addToLocalHistory(data) {
    try {
        // GUNAKAN WAKTU SEKARANG - jangan pakai timestamp dari Firebase
        const currentTimestamp = Date.now();
        
        console.log("🕒 Using current timestamp:", new Date(currentTimestamp).toString());

        const historyItem = {
            timestamp: currentTimestamp, // Gunakan waktu sekarang
            temperature: parseFloat(data.temperature) || 0,
            levelPercent: parseFloat(data.levelPercent) || 0,
            ntu: parseFloat(data.ntu) || 0,
            levelStatus: data.levelStatus || "",
            turbStatus: data.turbStatus || ""
        };

        // Selalu tambahkan data baru (kita akan filter duplikat nanti)
        localHistory.push(historyItem);
        
        // Filter data duplikat (dalam 5 detik terakhir dianggap duplikat)
        const now = Date.now();
        localHistory = localHistory.filter(item => {
            return (now - item.timestamp) < 5000 || 
                   localHistory.indexOf(item) === localHistory.length - 1;
        });

        // Simpan ke localStorage
        if (localHistory.length > 20) {
            localHistory = localHistory.slice(-20);
        }
        
        localStorage.setItem('sensorHistory', JSON.stringify(localHistory));
        console.log("📝 Added to local history at:", formatTime(currentTimestamp).time);
        
    } catch (error) {
        console.error("❌ Error adding to local history:", error);
    }
}

function loadLocalHistory() {
    try {
        const saved = localStorage.getItem('sensorHistory');
        if (saved) {
            localHistory = JSON.parse(saved);
            console.log("📂 Loaded local history:", localHistory.length, "items");
            
            if (localHistory.length > 0) {
                const lastTime = formatTime(localHistory[localHistory.length - 1].timestamp);
                console.log("🕒 Last data time:", lastTime.full);
            }
        }
    } catch (error) {
        console.error("❌ Error loading local history:", error);
        localHistory = [];
    }
}

function updateUI(data) {
    try {
        // Update values
        if (elements.temp) elements.temp.textContent = (parseFloat(data.temperature) || 0).toFixed(1) + " °C";
        if (elements.level) elements.level.textContent = (parseFloat(data.levelPercent) || 0).toFixed(1) + "%";
        if (elements.ntu) elements.ntu.textContent = (parseFloat(data.ntu) || 0).toFixed(1);

        // Update status
        updateStatus(data);
        
        // Update last update time display
        updateLastUpdateTime();
        
    } catch (error) {
        console.error("❌ Error updating UI:", error);
    }
}

function updateLastUpdateTime() {
    const timeString = getCurrentIndonesiaTime();
    console.log("🕒 Data updated at:", timeString);
}

function updateStatus(data) {
    const temp = parseFloat(data.temperature) || 0;
    const level = parseFloat(data.levelPercent) || 0;
    const ntu = parseFloat(data.ntu) || 0;

    // Temperature status
    if (temp >= 25 && temp <= 30) {
        setStatus(elements.tempStatus, "Ideal (25-30°C)", "status-good");
    } else if (temp < 25) {
        setStatus(elements.tempStatus, "Terlalu Dingin", "status-warning");
    } else {
        setStatus(elements.tempStatus, "Terlalu Panas", "status-warning");
    }

    // Water level status
    if (data.levelStatus) {
        const statusClass = data.levelStatus.includes("KOSONG") ? "status-danger" : 
                          data.levelStatus.includes("Rendah") ? "status-warning" : "status-good";
        setStatus(elements.levelStatus, data.levelStatus, statusClass);
    } else {
        if (level < 10) {
            setStatus(elements.levelStatus, "Air Kurang - Perlu Ditambah", "status-danger");
        } else if (level <= 70) {
            setStatus(elements.levelStatus, "Stabil", "status-good");
        } else {
            setStatus(elements.levelStatus, "Risiko Meluap", "status-warning");
        }
    }

    // Turbidity status
    if (data.turbStatus) {
        const statusClass = data.turbStatus.includes("EKSTREM") ? "status-danger" : 
                          data.turbStatus.includes("Keruh") ? "status-warning" : "status-good";
        setStatus(elements.ntuStatus, data.turbStatus, statusClass);
    } else {
        if (ntu < 200) {
            setStatus(elements.ntuStatus, "Jernih", "status-good");
        } else if (ntu <= 1000) {
            setStatus(elements.ntuStatus, "Agak Keruh", "status-warning");
        } else {
            setStatus(elements.ntuStatus, "Sangat Keruh - Perlu Sirkulasi", "status-danger");
        }
    }
}

// =========================
// EVENT HANDLERS & GLOBAL FUNCTIONS
// =========================
window.logout = function() {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("sensorHistory");
    window.location.href = "index.html";
};

window.updateData = fetchLatestData;

window.debugTime = function() {
    console.log("🕒 Time Debug Info:");
    console.log("- Current time:", getCurrentIndonesiaTime());
    console.log("- Browser time:", new Date().toString());
    console.log("- Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log("- Local history length:", localHistory.length);
    
    if (localHistory.length > 0) {
        console.log("- All timestamps in history:");
        localHistory.forEach((item, index) => {
            const timeInfo = formatTime(item.timestamp);
            console.log(`  ${index + 1}. ${timeInfo.time} - ${new Date(item.timestamp).toString()}`);
        });
    }
};

window.fixTimeIssue = function() {
    console.log("🛠️ Fixing time issue...");
    
    // Hapus semua history lama
    localHistory = [];
    localStorage.removeItem('sensorHistory');
    
    // Restart chart
    initializeChart();
    
    // Load data baru
    fetchLatestData();
    
    showAlert("Time issue fixed! Chart reset dengan waktu yang benar.", false);
};

// =========================
// INITIALIZATION
// =========================
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 DOM Loaded - Initializing Real-time Monitoring...");
    console.log("🕒 Current time:", getCurrentIndonesiaTime());
    console.log("🌏 Browser Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    // Load existing history
    loadLocalHistory();
    
    // Initialize chart
    initializeChart();
    
    // Jika ada history, update chart
    if (localHistory.length > 0) {
        updateChartFromLocalHistory();
    }
    
    // Load data pertama kali
    setTimeout(() => {
        fetchLatestData();
    }, 1000);
    
    // Auto-refresh setiap 5 detik
    setInterval(fetchLatestData, 5000);
    
    console.log("✅ Real-time monitoring initialized (5s interval)");
});

// Global error handler
window.addEventListener('error', function(e) {
    console.error("💥 Global Error:", e.error);
});