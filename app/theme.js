export function setupTheme(dom) {
  const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)');

  function updateThemeUI(theme) {
    if (theme === 'system') {
      document.documentElement.setAttribute('data-theme', preferredTheme.matches ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    if (dom.themeIcon) {
      dom.themeIcon.innerHTML = isDark
        ? '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    }

    if (dom.themeBtnText) {
      dom.themeBtnText.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    }

    if (dom.settingsThemePicker) {
      dom.settingsThemePicker.querySelectorAll('button').forEach((button) => {
        button.classList.toggle('active', button.getAttribute('data-theme-val') === theme);
      });
    }
  }

  function setTheme(theme) {
    localStorage.setItem('aurelia-theme', theme);
    updateThemeUI(theme);
    if (window.updateDashboardCharts) {
      window.updateDashboardCharts();
    }
  }

  updateThemeUI(localStorage.getItem('aurelia-theme') || 'system');

  preferredTheme.addEventListener('change', () => {
    const storedTheme = localStorage.getItem('aurelia-theme');
    if (storedTheme === 'system' || !storedTheme) {
      updateThemeUI('system');
    }
  });

  if (dom.themeToggleBtn) {
    dom.themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setTheme(isDark ? 'light' : 'dark');
    });
  }

  if (dom.settingsThemePicker) {
    dom.settingsThemePicker.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => setTheme(button.getAttribute('data-theme-val')));
    });
  }
}