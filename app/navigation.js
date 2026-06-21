export function setupNavigation(dom) {
  function switchTab(tabId) {
    dom.navItems.forEach((nav) => {
      nav.classList.remove('active');
      if (nav.getAttribute('data-tab') === tabId) {
        nav.classList.add('active');
      }
    });

    dom.tabPanes.forEach((pane) => pane.classList.remove('active'));
    const activePane = document.getElementById(`${tabId}Tab`);
    if (activePane) activePane.classList.add('active');

    if (tabId === 'dashboard' && window.updateDashboardCharts) {
      window.updateDashboardCharts();
    }
  }

  dom.navItems.forEach((item) => {
    item.addEventListener('click', () => {
      switchTab(item.getAttribute('data-tab'));
      dom.sidebar.classList.remove('open');
    });
  });

  if (dom.menuToggle) {
    dom.menuToggle.addEventListener('click', () => {
      dom.sidebar.classList.toggle('open');
    });
  }

  return { switchTab };
}