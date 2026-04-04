(async function () {
  const priceEl  = document.getElementById('eth-price');
  const changeEl = document.getElementById('eth-change');
  const canvas   = document.getElementById('eth-chart');
  if (!canvas) return;

  // Fetch 30-day ETH/USD data from CoinGecko (free, no key)
  let prices = [];
  try {
    const res  = await fetch(
      'https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=30&interval=daily'
    );
    const data = await res.json();
    prices = data.prices; // [[timestamp, price], ...]
  } catch (e) {
    console.warn('ETH price fetch failed', e);
    return;
  }

  if (!prices.length) return;

  const labels = prices.map(([ts]) =>
    new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );
  const values = prices.map(([, p]) => p);

  // Current price & 30d change
  const first = values[0];
  const last  = values[values.length - 1];
  const pct   = (((last - first) / first) * 100).toFixed(2);
  const isUp  = last >= first;

  priceEl.textContent  = '$' + last.toLocaleString('en-US', { maximumFractionDigits: 0 });
  changeEl.textContent = (isUp ? '▲ +' : '▼ ') + pct + '%  30d';
  changeEl.classList.add(isUp ? 'up' : 'down');

  // Gradient fill
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0,   isUp ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)');
  gradient.addColorStop(1,   'rgba(0,0,0,0)');

  const lineColor = isUp ? '#4ade80' : '#f87171';

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: lineColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: lineColor,
        fill: true,
        backgroundColor: gradient,
        tension: 0.35,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1a1a',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: '#8a8480',
          bodyColor: '#f0ece4',
          bodyFont: { family: 'Inter', size: 13, weight: '600' },
          titleFont: { family: 'Inter', size: 11 },
          padding: 12,
          callbacks: {
            label: (ctx) => ' $' + ctx.parsed.y.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: {
            color: '#8a8480',
            font: { family: 'Inter', size: 11 },
            maxTicksLimit: 6,
          },
          border: { display: false },
        },
        y: {
          position: 'right',
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: {
            color: '#8a8480',
            font: { family: 'Inter', size: 11 },
            callback: (v) => '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 }),
          },
          border: { display: false },
        },
      },
    },
  });
})();
