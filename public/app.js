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
