import { DEFAULT_ACCOUNTS } from './constants.js';

export function createStore() {
  const state = {
    accounts: [],
    currentUser: null,
    isSignupMode: false
  };

  function saveAccounts() {
    localStorage.setItem('aurelia_accounts', JSON.stringify(state.accounts));
  }

  function loadAccounts() {
    const isSeeded = localStorage.getItem('aurelia_seeded_v2');
    if (!isSeeded) {
      localStorage.removeItem('aurelia_accounts');
      localStorage.removeItem('aurelia_active_session');
      localStorage.setItem('aurelia_seeded_v2', 'true');
    }

    const savedAccounts = localStorage.getItem('aurelia_accounts');
    if (savedAccounts) {
      state.accounts = JSON.parse(savedAccounts);
      return;
    }

    state.accounts = structuredClone(DEFAULT_ACCOUNTS);
    saveAccounts();
  }

  function setCurrentUser(user) {
    state.currentUser = user;
  }

  function setSignupMode(isSignupMode) {
    state.isSignupMode = isSignupMode;
  }

  return {
    state,
    saveAccounts,
    loadAccounts,
    setCurrentUser,
    setSignupMode
  };
}