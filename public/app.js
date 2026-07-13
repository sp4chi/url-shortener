const form = document.getElementById('shorten-form');
const urlInput = document.getElementById('url-input');
const resultDiv = document.getElementById('result');
const shortLinkEl = document.getElementById('short-link');
const copyBtn = document.getElementById('copy-btn');
const linksBody = document.getElementById('links-body');

// keep track of shortened links in-memory for this session
let shortenedLinks = [];

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = urlInput.value;

  try {
    const res = await fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Something went wrong');
      return;
    }

    shortLinkEl.href = data.shortUrl;
    shortLinkEl.textContent = data.shortUrl;
    resultDiv.classList.remove('hidden');

    const shortCode = data.shortUrl.split('/').pop();
    shortenedLinks.unshift({ shortCode, originalUrl: url, clicks: 0 });
    renderTable();

    urlInput.value = '';
  } catch (err) {
    alert('Failed to reach server');
  }
});

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(shortLinkEl.href);
  copyBtn.textContent = 'Copied!';
  setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
});

async function refreshStats() {
  for (const link of shortenedLinks) {
    try {
      const res = await fetch(`/api/stats/${link.shortCode}`);
      const data = await res.json();
      if (res.ok) link.clicks = data.clicks;
    } catch (err) {
      console.error('Failed to fetch stats for', link.shortCode);
    }
  }
  renderTable();
}

function renderTable() {
  linksBody.innerHTML = shortenedLinks
    .map(
      (link) => `
      <tr>
        <td><a href="/${link.shortCode}" target="_blank">/${link.shortCode}</a></td>
        <td>${link.originalUrl}</td>
        <td>${link.clicks}</td>
      </tr>
    `,
    )
    .join('');
}

// refresh click counts every 5 seconds, so clicking your own short links updates the table
setInterval(refreshStats, 5000);

const predictSelect = document.getElementById('predict-select');
const trendBadge = document.getElementById('trend-badge');
let clicksChart = null;

// Populate the dropdown with links the user has created this session
function updatePredictDropdown() {
  const previousValue = predictSelect.value; // remember what was selected before rebuilding

  predictSelect.innerHTML = shortenedLinks
    .map(
      (link) => `<option value="${link.shortCode}">/${link.shortCode}</option>`,
    )
    .join('');

  // restore previous selection if it still exists in the list
  const stillExists = shortenedLinks.some((l) => l.shortCode === previousValue);
  if (stillExists) {
    predictSelect.value = previousValue;
  }

  // only trigger a chart reload if this is the first time we've populated it (no previous selection existed)
  if (!previousValue && shortenedLinks.length > 0) {
    loadPrediction(predictSelect.value);
  }
}

predictSelect.addEventListener('change', () => {
  loadPrediction(predictSelect.value);
});

async function loadPrediction(shortCode) {
  if (!shortCode) return;

  try {
    const res = await fetch(`/api/predict/${shortCode}`);
    const data = await res.json();

    if (!res.ok) {
      trendBadge.textContent = data.error || 'No prediction available yet';
      trendBadge.className = 'trend-flat';
      return;
    }

    renderChart(data);
    renderTrendBadge(data.trend);
  } catch (err) {
    console.error('Prediction fetch failed', err);
  }
}

function renderTrendBadge(trend) {
  const labels = {
    increasing: '📈 Trending up',
    decreasing: '📉 Trending down',
    flat: '➡️ Steady',
  };
  trendBadge.textContent = labels[trend] || trend;
  trendBadge.className = `trend-${trend}`;
}

function renderChart(data) {
  const historicalLabels = data.historicalDaily.map((d) => d.date);
  const historicalValues = data.historicalDaily.map((d) => d.clicks);

  const futureLabels = data.predictions.map(
    (p) => `Day +${p.day - data.historicalDaily.length + 1}`,
  );
  const futureValues = data.predictions.map((p) => p.predictedClicks);
  const upperBand = data.predictions.map((p) => p.upperBound);
  const lowerBand = data.predictions.map((p) => p.lowerBound);

  const allLabels = [...historicalLabels, ...futureLabels];

  // pad historical-only datasets with nulls so lines connect correctly on a shared timeline
  const paddedHistorical = [
    ...historicalValues,
    ...Array(futureValues.length).fill(null),
  ];
  const paddedPrediction = [
    ...Array(historicalValues.length - 1).fill(null),
    historicalValues[historicalValues.length - 1],
    ...futureValues,
  ];
  const paddedUpper = [
    ...Array(historicalValues.length).fill(null),
    ...upperBand,
  ];
  const paddedLower = [
    ...Array(historicalValues.length).fill(null),
    ...lowerBand,
  ];

  if (clicksChart) clicksChart.destroy();

  const ctx = document.getElementById('clicksChart');
  clicksChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: allLabels,
      datasets: [
        {
          label: 'Actual clicks',
          data: paddedHistorical,
          borderColor: '#2563eb',
          backgroundColor: 'transparent',
          tension: 0.2,
        },
        {
          label: 'Predicted clicks',
          data: paddedPrediction,
          borderColor: '#f97316',
          borderDash: [6, 4],
          backgroundColor: 'transparent',
          tension: 0.2,
        },
        {
          label: 'Upper bound',
          data: paddedUpper,
          borderColor: 'rgba(249,115,22,0.2)',
          backgroundColor: 'rgba(249,115,22,0.1)',
          fill: '+1',
          pointRadius: 0,
        },
        {
          label: 'Lower bound',
          data: paddedLower,
          borderColor: 'rgba(249,115,22,0.2)',
          backgroundColor: 'transparent',
          fill: false,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Clicks' } },
      },
    },
  });
}

// Update dropdown whenever a new link is shortened
const originalRenderTable = renderTable;
renderTable = function () {
  originalRenderTable();
  updatePredictDropdown();
};
