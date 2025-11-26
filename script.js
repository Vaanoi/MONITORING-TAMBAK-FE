// =========================
// FUNGSI API - DIPERBAIKI
// =========================
const apiService = {
    async fetchLatestData() {
        try {
            utils.toggleLoading(true);
            console.log("🔄 Mengambil data terbaru dari:", `${API_BASE}/api/sensor/latest`);
            
            const { config, timeoutId } = utils.createFetchConfig();
            
            // TAMBAH CACHE BUSTER
            const url = `${API_BASE}/api/sensor/latest?t=${Date.now()}`;
            const response = await fetch(url, config);
            clearTimeout(timeoutId);
            
            console.log("📡 Response status:", response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("✅ Data terbaru diterima:", data);
            
            this.processLatestData(data);
            
        } catch (error) {
            console.error("❌ Error fetchLatestData:", error);
            this.handleDataError();
        } finally {
            utils.toggleLoading(false);
        }
    },

    async fetchHistoryData() {
        try {
            console.log("🔄 Mengambil history dari:", `${API_BASE}/api/sensor/history`);
            
            const { config, timeoutId } = utils.createFetchConfig();
            
            // TAMBAH CACHE BUSTER UNTUK HISTORY
            const url = `${API_BASE}/api/sensor/history?t=${Date.now()}`;
            const response = await fetch(url, config);
            clearTimeout(timeoutId);
            
            console.log("📡 History response status:", response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const list = await response.json();
            console.log("✅ History data diterima, jumlah data:", list.length);
            
            // DEBUG: Tampilkan data terbaru dari history
            if (list.length > 0) {
                const latest = list[list.length - 1];
                console.log("📊 Data terbaru di history:", {
                    temperature: latest.temperature,
                    levelPercent: latest.levelPercent,
                    ntu: latest.ntu,
                    timestamp: latest.timestamp,
                    waktu: new Date(latest.timestamp).toLocaleTimeString()
                });
            }
            
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

        // PERBAIKI: Urutkan berdasarkan timestamp dengan benar
        const sortedList = [...list].sort((a, b) => {
            const timeA = a.timestamp || 0;
            const timeB = b.timestamp || 0;
            return timeA - timeB; // Ascending (lama -> baru)
        });

        // DEBUG: Tampilkan range waktu
        if (sortedList.length > 0) {
            const first = new Date(sortedList[0].timestamp);
            const last = new Date(sortedList[sortedList.length - 1].timestamp);
            console.log("⏰ Range waktu data:", {
                pertama: first.toLocaleTimeString(),
                terakhir: last.toLocaleTimeString(),
                jumlahData: sortedList.length
            });
        }

        // PERBAIKI: Format label waktu yang lebih baik
        const labels = sortedList.map((item, index) => {
            const timestamp = item.timestamp || Date.now();
            const date = new Date(timestamp);
            
            // Untuk data banyak, tampilkan setiap 5 data atau max 10 label
            if (sortedList.length > 10 && index % Math.ceil(sortedList.length / 10) !== 0 && index !== sortedList.length - 1) {
                return '';
            }
            
            return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
        });

        const tempData = sortedList.map(item => parseFloat(item.temperature) || 0);
        const levelData = sortedList.map(item => parseFloat(item.levelPercent) || 0);
        const ntuData = sortedList.map(item => parseFloat(item.ntu) || 0);

        console.log("📈 Data chart siap:", {
            labels: labels.filter(l => l !== '').length + " label",
            suhu: tempData.length + " points",
            level: levelData.length + " points",
            ntu: ntuData.length + " points"
        });

        chartManager.createChart(labels, tempData, levelData, ntuData);
    }
};

// =========================
// CHART MANAGER - DIPERBAIKI
// =========================
const chartManager = {
    createChart(labels, tempData, levelData, ntuData) {
        // PERBAIKI: Pastikan chart benar-benar di-destroy
        if (chart) {
            console.log("♻️ Destroy chart sebelumnya");
            chart.destroy();
            chart = null;
        }

        // PERBAIKI: Tambahkan delay kecil untuk memastikan DOM siap
        setTimeout(() => {
            if (!elements.chart) {
                console.error("❌ Canvas chart tidak ditemukan");
                return;
            }

            try {
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
                        animation: {
                            duration: 500 // Kurangi durasi animasi
                        },
                        interaction: {
                            intersect: false,
                            mode: 'index'
                        },
                        scales: {
                            x: {
                                ticks: {
                                    autoSkip: true,
                                    maxTicksLimit: 10,
                                    callback: function(value, index) {
                                        // Hanya tampilkan label yang tidak kosong
                                        return this.getLabelForValue(value) || null;
                                    }
                                },
                                grid: {
                                    display: true
                                }
                            },
                            y: {
                                beginAtZero: true,
                                grid: {
                                    display: true
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top'
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false
                            }
                        }
                    }
                });
                
                console.log("✅ Chart berhasil dibuat ulang");
                
                // PERBAIKI: Paksa update layout
                setTimeout(() => {
                    if (chart) {
                        chart.update('active');
                    }
                }, 100);
                
            } catch (error) {
                console.error("❌ Error membuat chart:", error);
            }
        }, 50);
    },

    createEmptyChart() {
        if (chart) {
            chart.destroy();
            chart = null;
        }

        const now = new Date();
        const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        setTimeout(() => {
            if (!elements.chart) return;
            
            chart = new Chart(elements.chart, {
                type: "line",
                data: {
                    labels: [timeString],
                    datasets: [
                        {
                            label: "Suhu (°C)",
                            data: [0],
                            borderColor: "rgba(225, 112, 85, 0.5)",
                            backgroundColor: "rgba(225, 112, 85, 0.1)",
                            borderWidth: 2
                        },
                        {
                            label: "Level Air (%)",
                            data: [0],
                            borderColor: "rgba(9, 132, 227, 0.5)",
                            backgroundColor: "rgba(9, 132, 227, 0.1)",
                            borderWidth: 2
                        },
                        {
                            label: "Kekeruhan (NTU)",
                            data: [0],
                            borderColor: "rgba(0, 184, 148, 0.5)",
                            backgroundColor: "rgba(0, 184, 148, 0.1)",
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }, 50);
    },

    // FUNGSI BARU: Force update chart
    forceUpdate() {
        if (chart) {
            chart.update('active');
        }
    }
};

// =========================
// FUNGSI DEBUG & TEST - DIPERBAIKI
// =========================
window.testChartUpdate = async function() {
    console.log("🧪 Testing chart update...");
    
    // Test 1: Cek koneksi API
    try {
        const testUrl = `${API_BASE}/api/sensor/history?t=${Date.now()}`;
        const response = await fetch(testUrl);
        const data = await response.json();
        console.log("✅ API Connection Test:", {
            status: response.status,
            dataCount: data.length,
            latestData: data[data.length - 1]
        });
    } catch (error) {
        console.error("❌ API Test Failed:", error);
    }
    
    // Test 2: Force update chart
    await apiService.fetchHistoryData();
    
    // Test 3: Check chart instance
    console.log("📊 Chart Instance:", chart ? "Exists" : "Null");
    
    alert("Test completed! Check console for details.");
};

// =========================
// INISIALISASI - DIPERBAIKI
// =========================
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Frontend initialized, connecting to:", API_BASE);
    
    // Pastikan canvas chart tersedia
    if (!elements.chart) {
        console.error("❌ Chart canvas not found!");
        return;
    }
    
    console.log("✅ Chart canvas available");
    
    // Load data pertama kali
    setTimeout(() => {
        apiService.fetchLatestData();
        apiService.fetchHistoryData();
    }, 1000);

    // PERBAIKI: Auto-refresh dengan error handling
    setInterval(() => {
        try {
            apiService.fetchLatestData();
        } catch (error) {
            console.error("Auto-refresh error:", error);
        }
    }, REFRESH_INTERVALS.LATEST);

    setInterval(() => {
        try {
            console.log("🔄 Auto-refresh chart data...");
            apiService.fetchHistoryData();
        } catch (error) {
            console.error("Chart refresh error:", error);
        }
    }, REFRESH_INTERVALS.HISTORY);
});