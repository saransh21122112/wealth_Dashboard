import { TODAY_STRING } from './constants.js';
import { createStore } from './store.js';
import { getDom } from './dom.js';
import { calculateInvestmentValue, formatCurrency } from './calculations.js';
import { setupNavigation } from './navigation.js';
import { setupTheme } from './theme.js';
import { setupFormControls } from './form-controls.js';
import { createAdminModule } from './admin.js';
import { createRenderers } from './renderers.js';
import { createAuthModule } from './auth.js';
import { setupForms } from './forms.js';
import { setupBackupHandlers } from './backup.js';
import { setupAIBridge } from './ai-bridge.js';

document.addEventListener('DOMContentLoaded', () => {
  const dom = getDom();
  const store = createStore();

  store.loadAccounts();

  const navigation = setupNavigation(dom);
  setupTheme(dom);
  setupFormControls(dom);

  window.calculateInvestmentValue = calculateInvestmentValue;

  const admin = createAdminModule({
    dom,
    store,
    calculations: { calculateInvestmentValue },
    formatCurrency,
    saveAccounts: store.saveAccounts
  });

  const renderers = createRenderers({
    dom,
    store,
    calculations: { calculateInvestmentValue },
    formatCurrency,
    saveAccounts: store.saveAccounts,
    admin
  });

  const auth = createAuthModule({
    dom,
    store,
    todayStr: TODAY_STRING,
    saveAccounts: store.saveAccounts,
    setCurrentUser: store.setCurrentUser,
    setSignupMode: store.setSignupMode,
    navigation,
    admin,
    renderAll: renderers.renderAll
  });

  setupForms({
    dom,
    store,
    todayStr: TODAY_STRING,
    saveAccounts: store.saveAccounts,
    renderAll: renderers.renderAll
  });

  setupBackupHandlers({
    dom,
    store,
    saveAccounts: store.saveAccounts,
    renderAll: renderers.renderAll
  });

  setupAIBridge({
    store,
    saveAccounts: store.saveAccounts,
    renderAll: renderers.renderAll
  });

  auth.loadSession();
});