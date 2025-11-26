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
// FUNGSI UTILITAS WAKTU - FIXED FOR WIB
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

// FUNGSI WAKTU YANG DIPERBAIKI - PAKAI WAKTU LOKAL BROWSER (WIB)
function formatTime(timestamp) {
    const date = new Date(timestamp);
    
    // Gunakan toLocaleTimeString dengan locale Indonesia untuk WIB
    const timeString = date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jakarta' // Force WIB timezone
    });
    
    return {
        time: timeString,
        full: date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        date: date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })
    };
}

// FUNGSI BARU: Dapatkan waktu sekarang dalam WIB
function getCurrentWIBTime() {
    return new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// FUNGSI BARU: Buat timestamp WIB yang benar
function createWIBTimestamp() {
    const now = new Date();
    // Convert ke WIB timezone
    return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })).getTime();
}

// =========================
// FUNGSI CHART - DIPERBAIKI UNTUK WIB
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
                    title: { display: true, text: 'Waktu (WIB)' },
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
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const dataIndex = tooltipItems[0].dataIndex;
                            const label = tooltipItems[0].chart.data.labels[dataIndex];
                            return `Waktu: ${label} WIB`;
                        }
                    }
                }
            }
        }
    });

    console.log("✅ Chart initialized for WIB timezone");
}

function updateChartFromLocalHistory() {
    if (!chart || localHistory.length === 0) return;

    try {
        // Ambil maksimal 12 data terbaru
        const recentData = localHistory.slice(-12);
        
        console.log("📊 Updating chart with:", recentData.length, "data points");
        console.log("🕒 Current WIB time:", getCurrentWIBTime());
        
        // Format labels dengan waktu WIB
        const labels = recentData.map(item => {
            const timeInfo = formatTime(item.timestamp);
            return timeInfo.time;
        });

        const tempData = recentData.map(item => item.temperature);
        const levelData = recentData.map(item => item.levelPercent);
        const ntuData = recentData.map(item => item.ntu);

        // Update chart
        chart.data.labels = labels;
        chart.data.datasets[0].data = tempData;
        chart.data.datasets[1].data = levelData;
        chart.data.datasets[2].data = ntuData;
        
        chart.update('active');
        
        console.log(`✅ Chart updated at ${getCurrentWIBTime()} WIB`);
        
    } catch (error) {
        console.error("❌ Error updating chart from local history:", error);
    }
}

// =========================
// FUNGSI DATA HANDLING - GUNAKAN WAKTU WIB
// =========================
async function fetchLatestData() {
    console.log("🔄 Fetching latest data...");
    console.log("🕒 Current WIB:", getCurrentWIBTime());
    
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
        
        // Tambahkan ke local history dengan timestamp WIB
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
        // GUNAKAN WAKTU SEKARANG DALAM WIB - abaikan timestamp dari Firebase
        const wibTimestamp = createWIBTimestamp();
        
        console.log("🕒 Using WIB timestamp:", formatTime(wibTimestamp).full);

        const historyItem = {
            timestamp: wibTimestamp, // Gunakan waktu WIB sekarang
            temperature: parseFloat(data.temperature) || 0,
            levelPercent: parseFloat(data.levelPercent) || 0,
            ntu: parseFloat(data.ntu) || 0,
            levelStatus: data.levelStatus || "",
            turbStatus: data.turbStatus || ""
        };

        // Cek apakah data benar-benar baru (minimal 10 detik dari data terakhir)
        const isNewData = localHistory.length === 0 || 
                         (wibTimestamp - localHistory[localHistory.length - 1].timestamp) > 10000;

        if (isNewData) {
            localHistory.push(historyItem);
            
            // Simpan ke localStorage
            if (localHistory.length > 25) {
                localHistory = localHistory.slice(-25);
            }
            
            localStorage.setItem('sensorHistory', JSON.stringify(localHistory));
            console.log("📝 Added to local history at WIB:", formatTime(wibTimestamp).time);
        } else {
            console.log("⏭️ Skipping duplicate data");
            // Tapi update data terakhir dengan nilai terbaru
            if (localHistory.length > 0) {
                const lastIndex = localHistory.length - 1;
                localHistory[lastIndex] = historyItem;
                localStorage.setItem('sensorHistory', JSON.stringify(localHistory));
            }
        }
        
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
                console.log("🕒 Last data time (WIB):", lastTime.full);
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

// FUNGSI BARU: Tampilkan waktu update terakhir dalam WIB
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { 
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    console.log("🕒 Data updated at (WIB):", timeString);
    
    // Optional: Tambahkan elemen untuk menampilkan waktu update
    // Contoh: document.getElementById('lastUpdate').textContent = `Terakhir update: ${timeString} WIB`;
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

    // Water level status - gunakan status dari Firebase jika ada
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

    // Turbidity status - gunakan status dari Firebase jika ada
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
    console.log("🕒 WIB Time Debug Info:");
    console.log("- Current WIB time:", getCurrentWIBTime());
    console.log("- Browser timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log("- Local history length:", localHistory.length);
    
    if (localHistory.length > 0) {
        console.log("- Latest 3 data points (WIB):");
        localHistory.slice(-3).forEach((item, index) => {
            const timeInfo = formatTime(item.timestamp);
            console.log(`  ${index + 1}. ${timeInfo.time} - Temp: ${item.temperature}°C`);
        });
    }
};

window.fixChartTime = function() {
    // Fungsi untuk memperbaiki waktu chart dengan timestamp WIB sekarang
    console.log("🛠️ Fixing chart times with WIB...");
    
    if (localHistory.length > 0) {
        // Update semua timestamp dengan waktu WIB yang sesuai
        const now = createWIBTimestamp();
        const timeInterval = 60000; // 1 menit per data
        
        localHistory.forEach((item, index) => {
            const dataIndex = localHistory.length - 1 - index;
            item.timestamp = now - (dataIndex * timeInterval);
        });
        
        localStorage.setItem('sensorHistory', JSON.stringify(localHistory));
        updateChartFromLocalHistory();
        showAlert("Waktu chart telah diperbaiki ke WIB!", false);
    }
};

// =========================
// INITIALIZATION - DENGAN WIB
// =========================
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 DOM Loaded - Initializing WIB Real-time Monitoring...");
    console.log("🕒 Current WIB Time:", getCurrentWIBTime());
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
    
    console.log("✅ WIB Real-time monitoring initialized (5s interval)");
});

// Global error handler
window.addEventListener('error', function(e) {
    console.error("💥 Global Error:", e.error);
});