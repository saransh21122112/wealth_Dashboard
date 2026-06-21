export function createStore() {
  const state = {
    accounts: [],
    currentUser: null,
    isSignupMode: false
  };

  async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    if (!response.ok) {
      let errorMessage = `Request failed (${response.status})`;
      try {
        const payload = await response.json();
        if (payload?.error) errorMessage = payload.error;
      } catch (_error) {
        // noop
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }

    return response.json();
  }

  async function saveAccounts() {
    if (!state.currentUser) return;

    try {
      await apiRequest('/api/user/data', {
        method: 'PUT',
        body: JSON.stringify({
          expenses: state.currentUser.expenses || [],
          investments: state.currentUser.investments || []
        })
      });
    } catch (error) {
      console.error('Failed to persist account data:', error.message);
    }
  }

  async function loadAccounts() {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      state.accounts = [];
      return;
    }

    try {
      const data = await apiRequest('/api/accounts');
      state.accounts = data?.accounts || [];
    } catch (error) {
      console.error('Failed to load admin accounts:', error.message);
      state.accounts = [];
    }
  }

  async function fetchSession() {
    const data = await apiRequest('/api/session');
    state.currentUser = data.user;
    return data.user;
  }

  async function signup(username, password) {
    const data = await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    state.currentUser = data.user;
    return data;
  }

  async function login(username, password) {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    state.currentUser = data.user;
    return data;
  }

  async function logout() {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    state.currentUser = null;
    state.accounts = [];
  }

  async function changeUserRole(username, role) {
    await apiRequest(`/api/accounts/${encodeURIComponent(username)}/role`, {
      method: 'POST',
      body: JSON.stringify({ role })
    });
  }

  function setCurrentUser(user) {
    state.currentUser = user;
  }

  function setSignupMode(isSignupMode) {
    state.isSignupMode = isSignupMode;
  }

  return {
    state,
    apiRequest,
    saveAccounts,
    loadAccounts,
    fetchSession,
    signup,
    login,
    logout,
    changeUserRole,
    setCurrentUser,
    setSignupMode
  };
}