export function createAuthModule({ dom, store, todayStr, saveAccounts, setCurrentUser, setSignupMode, navigation, admin, renderAll }) {
  function toggleAuthMode() {
    if (store.state.isSignupMode) {
      dom.authSubtitle.textContent = 'Create your Aurelia account to start managing your wealth';
      dom.authSubmitBtn.textContent = 'Sign Up';
      dom.authSwitchLink.textContent = 'Already have an account? Log in';
      return;
    }

    dom.authSubtitle.textContent = 'Log in to manage your personal wealth';
    dom.authSubmitBtn.textContent = 'Log In';
    dom.authSwitchLink.textContent = "Don't have an account? Sign up";
  }

  function setupLoggedInUI() {
    if (dom.authOverlay) {
      dom.authOverlay.classList.add('hiding');
      setTimeout(() => {
        dom.authOverlay.style.display = 'none';
        dom.authOverlay.classList.remove('hiding');
      }, 420);
    }

    if (dom.userProfileSummary) dom.userProfileSummary.style.display = 'flex';
    if (dom.logoutBtn) dom.logoutBtn.style.display = 'flex';
    if (dom.userProfileName) dom.userProfileName.textContent = store.state.currentUser.username;
    if (dom.userProfileRole) dom.userProfileRole.textContent = store.state.currentUser.role;
    if (dom.userAvatar) dom.userAvatar.textContent = store.state.currentUser.username.charAt(0).toUpperCase();

    if (dom.adminNavItem) {
      if (store.state.currentUser.role === 'admin') {
        dom.adminNavItem.style.display = 'flex';
        admin.renderAdminDashboard();
      } else {
        dom.adminNavItem.style.display = 'none';
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav && activeNav.getAttribute('data-tab') === 'admin') {
          navigation.switchTab('dashboard');
        }
      }
    }
  }

  function setupLoggedOutUI() {
    if (dom.authOverlay) {
      dom.authOverlay.style.display = 'flex';
      dom.authOverlay.classList.remove('hiding');
    }
    if (dom.userProfileSummary) dom.userProfileSummary.style.display = 'none';
    if (dom.logoutBtn) dom.logoutBtn.style.display = 'none';
    if (dom.adminNavItem) dom.adminNavItem.style.display = 'none';
    setSignupMode(false);
    toggleAuthMode();
  }

  function loadSession() {
    const activeSession = localStorage.getItem('aurelia_active_session');
    if (dom.expDateInput) dom.expDateInput.value = todayStr;
    if (dom.invDateInput) dom.invDateInput.value = todayStr;

    if (activeSession) {
      const session = JSON.parse(activeSession);
      const matched = store.state.accounts.find((account) => account.username === session.username);
      if (matched) {
        setCurrentUser(matched);
        setupLoggedInUI();
        renderAll();
        return;
      }
    }

    setupLoggedOutUI();
  }

  if (dom.authSwitchLink) {
    dom.authSwitchLink.addEventListener('click', () => {
      setSignupMode(!store.state.isSignupMode);
      toggleAuthMode();
    });
  }

  if (dom.authForm) {
    dom.authForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const username = dom.authUsernameInput.value.trim().toLowerCase();
      const password = dom.authPasswordInput.value;
      if (!username || !password) return;

      if (store.state.isSignupMode) {
        const exists = store.state.accounts.find((account) => account.username === username);
        if (exists) {
          alert('Username already taken. Please choose another.');
          return;
        }

        const newAccount = { username, password, role: 'user', expenses: [], investments: [] };
        store.state.accounts.push(newAccount);
        saveAccounts();
        setCurrentUser(newAccount);
        localStorage.setItem('aurelia_active_session', JSON.stringify({ username, role: newAccount.role }));
        setupLoggedInUI();
        renderAll();
        window.dispatchEvent(new CustomEvent('aurelia-login', { detail: { username, isNew: true } }));
        dom.authForm.reset();
        return;
      }

      const matched = store.state.accounts.find((account) => account.username === username && account.password === password);
      if (!matched) {
        alert('Invalid username or password.');
        return;
      }

      setCurrentUser(matched);
      localStorage.setItem('aurelia_active_session', JSON.stringify({ username, role: matched.role }));
      setupLoggedInUI();
      renderAll();
      window.dispatchEvent(new CustomEvent('aurelia-login', { detail: { username, isNew: false } }));
      dom.authForm.reset();
    });
  }

  if (dom.logoutBtn) {
    dom.logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('aurelia_active_session');
      setCurrentUser(null);
      setupLoggedOutUI();
    });
  }

  return {
    toggleAuthMode,
    setupLoggedInUI,
    setupLoggedOutUI,
    loadSession
  };
}