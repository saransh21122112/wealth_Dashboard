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
        store.loadAccounts().then(() => admin.renderAdminDashboard());
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

  async function loadSession() {
    if (dom.expDateInput) dom.expDateInput.value = todayStr;
    if (dom.invDateInput) dom.invDateInput.value = todayStr;

    try {
      const user = await store.fetchSession();
      if (user) {
        setCurrentUser(user);
        if (user.role === 'admin') {
          await store.loadAccounts();
        }
        setupLoggedInUI();
        renderAll();
        return;
      }
    } catch (_error) {
      // Not logged in.
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
    dom.authForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const username = dom.authUsernameInput.value.trim().toLowerCase();
      const password = dom.authPasswordInput.value;
      if (!username || !password) return;

      try {
        if (store.state.isSignupMode) {
          const signupResult = await store.signup(username, password);
          setCurrentUser(signupResult.user);
          setupLoggedInUI();
          renderAll();
          window.dispatchEvent(new CustomEvent('aurelia-login', { detail: { username, isNew: true } }));
          dom.authForm.reset();
          return;
        }

        const loginResult = await store.login(username, password);
        setCurrentUser(loginResult.user);
        if (loginResult.user.role === 'admin') {
          await store.loadAccounts();
        }
        setupLoggedInUI();
        renderAll();
        window.dispatchEvent(new CustomEvent('aurelia-login', { detail: { username, isNew: false } }));
        dom.authForm.reset();
      } catch (error) {
        alert(error.message || 'Authentication failed.');
      }
    });
  }

  if (dom.logoutBtn) {
    dom.logoutBtn.addEventListener('click', async () => {
      try {
        await store.logout();
      } catch (_error) {
        // Logout still clears local state.
      }
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