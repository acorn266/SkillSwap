// Apply theme before render to avoid flash
(function() {
  const t = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
})();

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  if (typeof rawData !== 'undefined' && rawData && typeof renderGraph === 'function') {
    renderGraph(rawData.nodes, rawData.edges);
  }
  if (typeof loadAnalytics === 'function') {
    setTimeout(loadAnalytics, 350);
  }
}