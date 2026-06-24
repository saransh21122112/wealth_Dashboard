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

  const overlay = document.querySelector('.sidebar-overlay');

  function openSidebar() {
    dom.sidebar.classList.add('open');
    if (overlay) overlay.classList.add('visible');
  }

  function closeSidebar() {
    dom.sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');
  }

  // Nav item tap: switch tab + close mobile sidebar
  dom.navItems.forEach((item) => {
    item.addEventListener('click', () => {
      switchTab(item.getAttribute('data-tab'));
      closeSidebar();
    });
  });

  // Hamburger toggle
  if (dom.menuToggle) {
    dom.menuToggle.addEventListener('click', () => {
      dom.sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
  }

  // Tap outside sidebar (overlay) closes it
  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  return { switchTab };
}