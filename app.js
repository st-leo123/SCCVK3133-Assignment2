let auditData = [];
let charts = {};

const colors = {
    human: 'rgba(56, 189, 248, 0.8)',
    humanBorder: 'rgba(56, 189, 248, 1)',
    ai: 'rgba(244, 63, 94, 0.8)',
    aiBorder: 'rgba(244, 63, 94, 1)'
};

async function loadData() {
    try {
        const response = await fetch('./dashboard_metrics.json');
        let rawData = await response.json();
        
        // Removing TikTok
        auditData = rawData.filter(row => row.platform !== 'TikTok');
        
        setupEventListeners();
        updateDashboard(auditData);
    } catch (error) {
        console.error("Error loading JSON data:", error);
    }
}

function setupEventListeners() {
    document.getElementById('platformFilter').addEventListener('change', applyFilters);
    document.getElementById('creatorFilter').addEventListener('change', applyFilters);
}

function applyFilters() {
    const platformValue = document.getElementById('platformFilter').value;
    const creatorValue = document.getElementById('creatorFilter').value;

    const filteredData = auditData.filter(row => {
        const matchPlatform = platformValue === 'all' || row.platform === platformValue;
        const matchCreator = creatorValue === 'all' || row.creator_type === creatorValue;
        return matchPlatform && matchCreator;
    });

    updateDashboard(filteredData);
}

function updateDashboard(data) {
    if(data.length === 0) return;

    updateScorecards(data);
    populateTable(data);
    
    const humanData = data.filter(d => d.creator_type === 'Human');
    const aiData = data.filter(d => d.creator_type === 'AI');

    renderBarChart(data, humanData, aiData);
    renderScatterChart(humanData, aiData);
    renderPieChart(data);
    renderRadarChart(humanData, aiData);
}

function updateScorecards(data) {
    const calcAvg = (key) => (data.reduce((sum, row) => sum + row[key], 0) / data.length).toFixed(2);
    
    const sentiment = calcAvg('sentiment_score');
    document.getElementById('scoreSentiment').innerText = sentiment;
    document.getElementById('scoreSentiment').style.color = sentiment > 0 ? '#4ade80' : '#f87171';
    
    document.getElementById('scoreSkepticism').innerText = calcAvg('skepticism_index_pct') + '%';
    document.getElementById('scoreEngagement').innerText = calcAvg('engagement_rate_pct') + '%';
    document.getElementById('scoreVelocity').innerText = calcAvg('comment_velocity_pct') + '%';
}

function populateTable(data) {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    data.forEach(row => {
        tbody.innerHTML += `
            <tr>
                <td>${row.file_id}</td>
                <td>${row.platform}</td>
                <td>${row.creator_type}</td>
                <td>${row.views.toLocaleString()}</td>
                <td>${row.engagement_rate_pct}%</td>
                <td style="color: ${row.sentiment_score > 0 ? '#4ade80' : '#f87171'}">${row.sentiment_score}</td>
                <td>${row.skepticism_index_pct}%</td>
            </tr>
        `;
    });
}

function destroyChart(chartId) {
    if (charts[chartId]) charts[chartId].destroy();
}

function renderBarChart(data, humanData, aiData) {
    destroyChart('barChart');
    const ctx = document.getElementById('barChart').getContext('2d');
    const platforms = [...new Set(data.map(d => d.platform))];
    
    const getAvgSentiment = (platform, type) => {
        const filtered = data.filter(d => d.platform === platform && d.creator_type === type);
        if(filtered.length === 0) return 0;
        return filtered.reduce((sum, d) => sum + d.sentiment_score, 0) / filtered.length;
    };

    const datasets = [];
    if (humanData.length > 0) {
        datasets.push({ label: 'Human', data: platforms.map(p => getAvgSentiment(p, 'Human')), backgroundColor: colors.human });
    }
    if (aiData.length > 0) {
        datasets.push({ label: 'AI', data: platforms.map(p => getAvgSentiment(p, 'AI')), backgroundColor: colors.ai });
    }

    charts['barChart'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: platforms,
            datasets: datasets
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { 
                y: { 
                    // Let Chart.js auto-scale perfectly to your data limits
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            },
            plugins: {
                legend: { labels: { color: '#94a3b8' } }
            }
        }
    });
}

function renderScatterChart(humanData, aiData) {
    destroyChart('scatterChart');
    const ctx = document.getElementById('scatterChart').getContext('2d');
    const formatPoint = (d) => ({ x: d.skepticism_index_pct, y: d.engagement_rate_pct, r: 6 });

    const datasets = [];
    if (humanData.length > 0) {
        datasets.push({ label: 'Human', data: humanData.map(formatPoint), backgroundColor: colors.human });
    }
    if (aiData.length > 0) {
        datasets.push({ label: 'AI', data: aiData.map(formatPoint), backgroundColor: colors.ai });
    }

    charts['scatterChart'] = new Chart(ctx, {
        type: 'bubble',
        data: { datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { 
                x: { 
                    title: { display: true, text: 'Skepticism (%)', color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8' }
                }, 
                y: { 
                    title: { display: true, text: 'Engagement (%)', color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8' }
                } 
            },
            plugins: {
                legend: { labels: { color: '#94a3b8' } }
            }
        }
    });
}

function renderPieChart(data) {
    destroyChart('pieChart');
    const ctx = document.getElementById('pieChart').getContext('2d');
    const totalLikes = data.reduce((sum, d) => sum + d.likes, 0);
    const totalComments = data.reduce((sum, d) => sum + d.comments_count, 0);

    charts['pieChart'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Likes', 'Comments'],
            datasets: [{ data: [totalLikes, totalComments], backgroundColor: ['#a855f7', '#fbbf24'], borderColor: '#1e293b', borderWidth: 2 }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8' } }
            }
        }
    });
}

function renderRadarChart(humanData, aiData) {
    destroyChart('radarChart');
    const ctx = document.getElementById('radarChart').getContext('2d');
    
    const getAvg = (dataset, key) => dataset.length === 0 ? 0 : dataset.reduce((sum, d) => sum + d[key], 0) / dataset.length;
    
    const normEng = (val) => Math.min((val / 20) * 100, 100); 
    const normSkp = (val) => Math.min((val / 50) * 100, 100); 
    const normVel = (val) => Math.min((val / 2) * 100, 100);  
    const normSen = (val) => ((val + 1) / 2) * 100;           

    const datasets = [];
    
    if (humanData.length > 0) {
        datasets.push({ 
            label: 'Human (Scaled)', 
            data: [
                normEng(getAvg(humanData, 'engagement_rate_pct')), 
                normSkp(getAvg(humanData, 'skepticism_index_pct')), 
                normVel(getAvg(humanData, 'comment_velocity_pct')), 
                normSen(getAvg(humanData, 'sentiment_score'))
            ], 
            backgroundColor: 'rgba(56, 189, 248, 0.2)', 
            borderColor: colors.humanBorder 
        });
    }
    
    if (aiData.length > 0) {
        datasets.push({ 
            label: 'AI (Scaled)', 
            data: [
                normEng(getAvg(aiData, 'engagement_rate_pct')), 
                normSkp(getAvg(aiData, 'skepticism_index_pct')), 
                normVel(getAvg(aiData, 'comment_velocity_pct')), 
                normSen(getAvg(aiData, 'sentiment_score'))
            ], 
            backgroundColor: 'rgba(244, 63, 94, 0.2)', 
            borderColor: colors.aiBorder 
        });
    }

    charts['radarChart'] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Eng. Rate', 'Skept. (%)', 'Velocity', 'Positive Trust'],
            datasets: datasets
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { 
                r: { 
                    beginAtZero: true, 
                    max: 100,
                    angleLines: { color: 'rgba(255,255,255,0.1)' },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    pointLabels: { color: '#94a3b8' },
                    ticks: { 
                        // This removes the ugly white box and makes the text match the dark theme
                        backdropColor: 'transparent', 
                        color: '#94a3b8' 
                    }
                } 
            },
            plugins: {
                legend: { labels: { color: '#94a3b8' } }
            }
        }
    });
}

loadData();