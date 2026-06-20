let auditData = [];

let charts = {
    distribution: null, 
    hypeMatrix: null, 
    sentiment: null, 
    interactionRatio: null, 
    platformEng: null, 
    platSkepticism: null, 
    platViews: null
};

const colors = { blue: '#3b82f6', purple: '#a855f7' };

async function loadData() {
    try {
        const response = await fetch('./dashboard_metrics.json');
        let rawData = await response.json();
        auditData = rawData.filter(row => row.platform !== 'TikTok');
        
        setupNavigation();
        setupToggles();
        updateDashboard(auditData);
    } catch (error) {
        console.error("Error loading JSON data:", error);
    }
}

function setupNavigation() {
    const buttons = document.querySelectorAll('.menu-btn');
    const sections = document.querySelectorAll('.page-section');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
            
            applyFilters();
        });
    });
    
    window.addEventListener('resize', () => { applyFilters(); });
}

function setupToggles() {
    document.getElementById('platformToggle').addEventListener('change', applyFilters);
    document.getElementById('creatorToggle').addEventListener('change', applyFilters);
    document.getElementById('viewsToggle').addEventListener('change', applyFilters);
}

function updateDynamicInsight(platform, creator, viewRange) {
    const insightElement = document.getElementById('overviewDynamicInsight');
    if (!insightElement) return;

    let insightText = "Contrary to our initial hypothesis, the 'Trust Gap' has practically closed. The data reveals that AI and Human creators share nearly identical baseline sentiment scores. Audiences are evaluating content based on entertainment value rather than the biological reality of the creator.";

    if (creator === 'AI') {
        insightText = "Focusing on AI creators shows a successful crossing of the Uncanny Valley. Excluding one major outlier, AI videos actually triggered lower average skepticism than their human counterparts.";
    } else if (creator === 'Human') {
        insightText = "Looking at Human creators, we see that biological authenticity does not guarantee universal trust. In fact, the single most negative and hostile comment section in our dataset belonged to a human creator.";
    } else if (platform === 'YouTube') {
        insightText = "YouTube audiences tend to be more critical overall. While humans see steady engagement, AI creators experience extreme volatility here—including a massive 42% skepticism spike on a single viral video.";
    } else if (platform === 'Instagram') {
        insightText = "Instagram's fast-paced, visual nature normalizes AI creators effortlessly. The engagement and trust metrics between AI and Humans on this platform are virtually indistinguishable.";
    } else if (viewRange === 'high') {
        insightText = "In highly viral content (over 5M views), AI creators hold their own. The data proves that massive reach does not automatically equal massive backlash for virtual influencers.";
    } else if (viewRange === 'low') {
        insightText = "For videos with under 5M views, we see a very stable normalization. Audiences interact with AI and human creators at almost exact parity when it comes to sentiment and trust.";
    }

    insightElement.innerText = insightText;
}

function applyFilters() {
    const platform = document.getElementById('platformToggle').value;
    const creator = document.getElementById('creatorToggle').value;
    const viewRange = document.getElementById('viewsToggle').value;

    const filteredData = auditData.filter(row => {
        const matchPlatform = platform === 'all' || row.platform === platform;
        const matchCreator = creator === 'all' || row.creator_type === creator;
        let matchViews = true;
        if (viewRange === 'high') matchViews = row.views >= 5000000;
        if (viewRange === 'low') matchViews = row.views < 5000000;
        return matchPlatform && matchCreator && matchViews;
    });

    updateDynamicInsight(platform, creator, viewRange);
    updateDashboard(filteredData);
}

function updateDashboard(data) {
    if (data.length === 0) {
        document.getElementById('totalViews').innerText = "0";
        document.getElementById('totalLikes').innerText = "0";
        document.getElementById('totalComments').innerText = "0";
        document.getElementById('avgEngagement').innerText = "0%";
        return;
    }

    const totalViews = data.reduce((sum, row) => sum + row.views, 0);
    const totalLikes = data.reduce((sum, row) => sum + row.likes, 0);
    const totalComments = data.reduce((sum, row) => sum + row.comments_count, 0);
    let avgEng = data.length > 0 ? data.reduce((sum, row) => sum + row.engagement_rate_pct, 0) / data.length : 0;

    document.getElementById('totalViews').innerText = totalViews.toLocaleString();
    document.getElementById('totalLikes').innerText = totalLikes.toLocaleString();
    document.getElementById('totalComments').innerText = totalComments.toLocaleString();
    document.getElementById('avgEngagement').innerText = avgEng.toFixed(2) + '%';

    const labels = data.map(d => d.file_id);
    const bgColors = data.map(d => d.creator_type === 'Human' ? colors.blue : colors.purple);

    const humanData = data.filter(d => d.creator_type === 'Human');
    const aiData = data.filter(d => d.creator_type === 'AI');

    renderChart('distribution', 'pie', document.getElementById('distributionChart'), {
        labels: ['Human Creators', 'AI Creators'],
        datasets: [{ data: [humanData.length, aiData.length], backgroundColor: [colors.blue, colors.purple], borderWidth: 0 }]
    }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } });

    const formatPoint = (d) => ({ x: d.skepticism_index_pct, y: d.engagement_rate_pct, r: 8 });
    renderChart('hypeMatrix', 'bubble', document.getElementById('hypeMatrixChart'), {
        datasets: [
            { label: 'Human', data: humanData.map(formatPoint), backgroundColor: colors.blue },
            { label: 'AI', data: aiData.map(formatPoint), backgroundColor: colors.purple }
        ]
    }, { 
        responsive: true, maintainAspectRatio: false,
        scales: { 
            x: { title: { display: true, text: 'Skepticism (%)' } }, 
            y: { title: { display: true, text: 'Engagement Rate (%)' } } 
        }
    });

    renderChart('sentiment', 'bar', document.getElementById('sentimentChart'), {
        labels: labels,
        datasets: [{
            label: 'Sentiment Score',
            data: data.map(d => d.sentiment_score),
            backgroundColor: bgColors,
            borderRadius: 4
        }]
    }, { 
        responsive: true, maintainAspectRatio: false, 
        plugins: { legend: { display: false } },
        scales: { y: { suggestedMin: -0.2, suggestedMax: 0.3 } } 
    });

    renderChart('interactionRatio', 'doughnut', document.getElementById('interactionRatioChart'), {
        labels: ['Total Likes', 'Total Comments'],
        datasets: [{ data: [totalLikes, totalComments], backgroundColor: [colors.blue, colors.purple], borderWidth: 0 }]
    }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } });

    renderChart('platformEng', 'bar', document.getElementById('platformEngChart'), {
        labels: labels,
        datasets: [{
            label: 'Engagement %',
            data: data.map(d => d.engagement_rate_pct),
            backgroundColor: bgColors,
            borderRadius: 4
        }]
    }, { 
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } }
    });

    renderChart('platSkepticism', 'bar', document.getElementById('platSkepticismChart'), {
        labels: labels,
        datasets: [{
            label: 'Skepticism Index %',
            data: data.map(d => d.skepticism_index_pct),
            backgroundColor: bgColors,
            borderRadius: 4
        }]
    }, { 
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } }
    });

    renderChart('platViews', 'bar', document.getElementById('platViewsChart'), {
        labels: labels,
        datasets: [{
            label: 'Views',
            data: data.map(d => d.views),
            backgroundColor: bgColors,
            borderRadius: 4
        }]
    }, { 
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } }
    });

    populateDetailedTable(data);
}

function renderChart(key, type, canvas, data, options) {
    if (!canvas || canvas.offsetParent === null) return; 
    if (charts[key]) { charts[key].destroy(); }
    const ctx = canvas.getContext('2d');
    charts[key] = new Chart(ctx, { type: type, data: data, options: options });
}

function populateDetailedTable(data) {
    const tbody = document.querySelector('#platformSummaryTable tbody');
    tbody.innerHTML = ''; 

    data.forEach(row => {
        tbody.innerHTML += `<tr>
            <td><strong>${row.file_id}</strong></td>
            <td>${row.platform}</td>
            <td>${row.creator_type}</td>
            <td>${row.views.toLocaleString()}</td>
            <td>${row.engagement_rate_pct.toFixed(2)}%</td>
            <td>${row.skepticism_index_pct.toFixed(2)}%</td>
            <td style="color: ${row.sentiment_score > 0 ? '#10b981' : '#ef4444'}"><strong>${row.sentiment_score.toFixed(4)}</strong></td>
        </tr>`;
    });
}

loadData();